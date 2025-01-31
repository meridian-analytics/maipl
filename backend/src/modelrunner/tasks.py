import csv
import os
import shutil
import subprocess
from datetime import datetime
from os.path import basename

from celery import shared_task, states
from celery.exceptions import Ignore
from django.contrib.auth import get_user_model

from common.logger import logger
from common.file_utils import download_file, upload_file, create_local_path, create_console_output_file, write_to_console

from .models import Detection, ModelRunnerTask

User = get_user_model()


@shared_task(bind=True, name='run_model')
def run_model(self, model_task_id):
    try:
        model_task = ModelRunnerTask.objects.get(id=model_task_id)
        model_task.status = 'STARTED'
        model_task.save()
        logger.info(f"Model Runner task {model_task.id} started")

        task_context = {
            "task": model_task,
            "local_path": create_local_path(model_task, "runner"),
            "console_output_file": create_console_output_file(model_task),
        }

        download_audio_files(task_context)
        download_model_file(task_context)

        command = construct_command_with_model_parameters(task_context)

        model_task.status = 'RUNNING'
        model_task.save()
        # run the command and write the output to the console output file
        result = subprocess.run(command, capture_output=True, text=True)
        write_to_console(task_context["console_output_file"], [
            "Command output:",
            "=============",
            "STDOUT:",
            f"{result.stdout}",
            "",
            "STDERR:", 
            f"{result.stderr}",
            "",
            f"Return code: {result.returncode}",
            "=============",
            "\n"
        ])

        if result.returncode == 0:
            save_detections_to_db(task_context)
            file_instance = upload_detections_file(task_context)
            model_task.detections = file_instance
            attach_meta_data_to_detections(file_instance)
            model_task.status = 'SUCCESS'
            model_task.save()
        else:
            model_task.status = 'FAILURE'
            model_task.save()
            logger.error(f"Model task {model_task.id} failed with return code {result.returncode}")

    except Exception as e:
        logger.error(f"An error occurred during model run: {e}")
        self.update_state(state=states.FAILURE, meta={'exc': e})
        model_task.status = 'FAILURE'
        model_task.save()
        raise Ignore()

    finally:
        logger.info("Cleaning up files")
        shutil.rmtree('/backend/kt-tmp/', ignore_errors=True)
        logger.info("Files cleaned up")

def download_audio_files(task_context):
    filelist = task_context["task"].filelist.all()
    #create a audio directory
    audio_dir = os.path.join(task_context["local_path"], "audio")
    os.makedirs(audio_dir, exist_ok=True)
    for file in filelist:
        audio_file_path = download_file(file.id)
        os.symlink(audio_file_path, os.path.join(audio_dir, file.basename))
    task_context["audio_dir"] = audio_dir
    logger.info(f"Audio files downloaded and symlinked to {audio_dir}")

    # write the audio files to the console output
    write_to_console(task_context["console_output_file"], [
        "Audio files: ",
        *[f"{file}" for file in os.listdir(task_context["audio_dir"])],
        "\n"
    ])

def download_model_file(task_context):
    model_file = task_context["task"].model_file
    model_dir = os.path.join(task_context["local_path"], "model")
    os.makedirs(model_dir, exist_ok=True)
    model_file_path = download_file(model_file.id)
    os.symlink(model_file_path, os.path.join(model_dir, model_file.basename))
    task_context["model_dir"] = model_dir
    logger.info(f"Model file downloaded and symlinked to {model_dir}")

    # write the model file to the console output
    write_to_console(task_context["console_output_file"], [
        "Model file: ",
        f"{model_file.basename}",
        "\n"
    ])

def construct_command_with_model_parameters(task_context):
    model_task = task_context["task"]
    model_file_dir = task_context["model_dir"]
    audio_dir = task_context["audio_dir"]

    # create a detections directory
    detections_dir = os.path.join(task_context["local_path"], "detections")
    os.makedirs(detections_dir, exist_ok=True)
    task_context["detections_dir"] = detections_dir

    # base command
    command = ['ketos-run', 
               f'{model_file_dir}/{model_task.model_file.basename}', 
               f'{audio_dir}', 
               '--output_folder', 
               f'{detections_dir}']

    # adding optional arguments
    if model_task.threshold != 0.0:
        command += ['--threshold', f'{model_task.threshold}']
    if model_task.step_size != 0:
        command += ['--step_size', f'{model_task.step_size}']
    if model_task.batch_size != 0:
        command += ['--batch_size', f'{model_task.batch_size}']
    if model_task.buffer != 0.0:
        command += ['--buffer', f'{model_task.buffer}']

    # write the command to the console output
    write_to_console(task_context["console_output_file"], [
        "Command for running the model: ",
        f"{' '.join(command)}\n"
    ])

    return command


def save_detections_to_db(task_context):
    model_task = task_context["task"]
    detections_dir = task_context["detections_dir"]
    user = User.objects.get(id=model_task.user_id.id)

    # get the audio files from the task
    filelist = model_task.filelist.all()

    # create a dictionary to map the basename to the file instance
    filename_to_file = {file.basename: file for file in filelist}

    # get the local file path for the detections.csv
    local_file_path = os.path.join(detections_dir, "detections.csv")

    try:
        with open(local_file_path, 'r') as f:
            reader = csv.reader(f)
            next(reader, None)  # skip the header

            # rewrite the rows to fix the paths
            rewritten_rows = []

            for row in reader:
                temp_path = row[0]
                start = float(row[1])
                end = float(row[2])
                label = row[3]
                score = round(float(row[4]), 3)

                filename = basename(temp_path)

                file_instance = filename_to_file.get(filename)
                path = file_instance.path

                if not file_instance:
                    logger.error(f"No file found with name: {filename}")
                    continue

                try:
                    detection = Detection(
                        file=file_instance,
                        start=start,
                        end=end,
                        score=score,
                        label=label,
                        task=model_task,
                        user_id=user
                    )
                    detection.save()
                except Exception as e:
                    logger.error(f"An error occurred: {e}")
                    continue

                rewritten_rows.append([path, start, end, label, score])

        with open(local_file_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['filename', 'start', 'end', 'label', 'score'])
            writer.writerows(rewritten_rows)

        logger.info(f"Successfully saved detections to database and rewrote output file")

    except FileNotFoundError as fnf_error:
        logger.exception("File not found error: %s", fnf_error)
    except Exception as e:
        logger.exception("An error occurred: %s", e)


def upload_detections_file(task_context):
    detections_dir = task_context["detections_dir"]
    model_task_id = task_context["task"].id
    path = f'Task-{model_task_id}-{datetime.now().strftime("%Y%m%d")}-detections.csv'
    meta = {"Type": "Detection", "Source": "Model-Runner", "Model-Task-ID": f"{model_task_id}"}
    
    file_instance = upload_file(
        local_file_path=os.path.join(detections_dir, "detections.csv"),
        maipl_folder='annotation',
        path=path,
        meta=meta,
        user=User.objects.get(id=task_context["task"].user_id.id)
    )

    return file_instance
    

def attach_meta_data_to_detections(file_instance):
    model_meta_data = {}
    files = ['/backend/kt-tmp/audio_repr.json',
             '/backend/kt-tmp/metadata.yaml'
             '/backend/kt-tmp/recipe.json',
             '/backend/kt-tmp/labels.json', 
             ]
    keys = ['audio_repr', 'metadata', 'recipe', 'labels']

    for file, key in zip(files, keys):
        if os.path.exists(file):
            with open(file) as f:
                model_meta_data[key] = f.read()
        else:
            model_meta_data[key] = None

    file_instance.meta = model_meta_data
    file_instance.save()


        
