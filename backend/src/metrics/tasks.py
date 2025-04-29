import os
import subprocess

from celery import shared_task

from common.file_utils import FileUtils
from common.logger import metrics_logger

@shared_task(bind=True, name='merics_eval_background')
def metrics_eval_background(self, task_id):
    from .models import MetricsTask
    task = MetricsTask.objects.get(id=task_id)
    metrics_eval(task_id)


@shared_task(bind=True, name='metrics_eval')
def metrics_eval(self, task_id):
    # Get the task instance
    from .models import MetricsTask
    task = MetricsTask.objects.get(id=task_id)
    
    # set the task status to started
    task.status = "STARTED"
    task.save()

    # download ref and eval files
    file_utils = FileUtils()

    task_context = {
        "task": task,
        "local_path": file_utils.create_local_path(task, "metrics"),
        "console_output_file": file_utils.create_console_output_file(task),
    }

    ref_file = task.ref_file
    eval_file = task.eval_file
    ref_dir = os.path.join(task_context["local_path"], "ref")
    eval_dir = os.path.join(task_context["local_path"], "eval")

    os.makedirs(ref_dir, exist_ok=True)
    os.makedirs(eval_dir, exist_ok=True)
    task_context["ref_dir"] = ref_dir
    task_context["eval_dir"] = eval_dir

    # download ref and eval files
    ref_file_path = file_utils.download_file(ref_file.id)
    eval_file_path = file_utils.download_file(eval_file.id)
    os.symlink(ref_file_path, os.path.join(ref_dir, ref_file.basename))
    os.symlink(eval_file_path, os.path.join(eval_dir, eval_file.basename))

    # write the ref and eval files to the console output
    file_utils.write_to_console(task_context["console_output_file"], [
        "Ref file: ",
        f"{ref_file.basename}",
        "\n"
    ])
    file_utils.write_to_console(task_context["console_output_file"], [
        "Eval file: ",
        f"{eval_file.basename}",
        "\n"
    ])

    # construct the command
    command = construct_command(task_context)
    file_utils.write_to_console(task_context["console_output_file"], [
        "Command: ",
        " ".join(command),
        "\n"
    ])

    # run the command
    result = subprocess.run(command, capture_output=True, text=True)
    file_utils.write_to_console(task_context["console_output_file"], [
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
        metrics_file_path = os.path.join(task_context["local_path"], "metrics.csv")
        result_file_path = os.path.join(task_context["local_path"], "results.csv")

        if not os.path.exists(metrics_file_path) or not os.path.exists(result_file_path):
            metrics_logger.error(f"Metrics file or result file not found for task {task.id}")
            task.status = "FAILURE"
            task.save()
            raise Exception(f"Metrics file or result file not found for task {task.id}")
        
        # upload the metrics file
        metrics_file = file_utils.upload_file(
            local_file_path=metrics_file_path,
            maipl_folder="metrics",
            path=f"/{task.id}/{task.folder}/metrics.csv",
            meta={"task_id": task.id},
            user=task.user
        )
        # upload the results file
        result_file = file_utils.upload_file(
            local_file_path=result_file_path,
            maipl_folder="metrics",
            path=f"/{task.id}/{task.folder}/results.csv",
            meta={"task_id": task.id},
            user=task.user
        )
        if not metrics_file or not result_file:
            metrics_logger.error(f"Failed to upload metrics file or result file for task {task.id}")
            task.status = "FAILURE"
            task.save()
            raise Exception(f"Failed to upload metrics file or result file for task {task.id}")
        
        # add the files to the task
        task.output_files.add(metrics_file)
        task.output_files.add(result_file)
        task.status = "SUCCESS"
        task.save()
        metrics_logger.info(f"Metrics task {task.id} completed successfully")
    else:
        task.status = "FAILURE"
        task.save()
        metrics_logger.error(f"Metrics task {task.id} failed with return code {result.returncode}")
        raise Exception(f"Metrics task {task.id} failed with return code {result.returncode}")
    
def construct_command(task_context):
    task = task_context["task"]
    ref_dir = task_context["ref_dir"]
    eval_dir = task_context["eval_dir"]

    ref_file_path = os.path.join(ref_dir, task.ref_file.basename)
    eval_file_path = os.path.join(eval_dir, task.eval_file.basename)
    parameters = task.parameters

    command = ["ketos-metrics", 
               eval_file_path, 
               ref_file_path,
               "--type",
               parameters.get("type", "continuous"),
               "--threshold_min",
               str(parameters.get("threshold_min", 0)),
               "--threshold_max", 
               str(parameters.get("threshold_max", 1)),
               "--threshold_inc",
               str(parameters.get("threshold_inc", 0.05)),
               "--total_time_units",
               str(parameters.get("total_time_units", 1)),
               "--output_folder",
               task_context["local_path"]]
    return command
