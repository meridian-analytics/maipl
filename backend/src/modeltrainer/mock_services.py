import time
import random
import os
import csv
from typing import Dict, Any

def mock_train_model(task_context: Dict[str, Any]) -> str:
    local_path = task_context["local_path"]
    console_output_file = task_context["console_output_file"]
    log_file = os.path.join(local_path, "training_log.csv")
    model_file = os.path.join(local_path, "test-model.kt")
    task = task_context["task"]

    # Write CSV header
    with open(log_file, 'w', newline='') as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerow(['', 'epoch', 'loss', 'dataset', 'CategoricalAccuracy', 'Precision', 'Recall'])

    # Simulate training process
    epochs = 20
    index = 0
    for epoch in range(1, epochs + 1):
        for dataset in ['train', 'val']:
            row = [
                index,
                epoch,
                round(random.uniform(0.01, 1.0), 8),
                dataset,
                round(random.uniform(0.5, 1.0), 8),
                round(random.uniform(0.5, 1.0), 8),
                round(random.uniform(0.5, 1.0), 8)
            ]
            index += 1
            # Append to CSV file
            with open(log_file, 'a', newline='') as csvfile:
                csvwriter = csv.writer(csvfile)
                csvwriter.writerow(row)
            
            # Simulate delay
            time.sleep(random.uniform(0.5, 1.5))

            # Append to console output file
            with open(console_output_file, "a") as f:
                f.write(f"Epoch {epoch}, {dataset}: {','.join(map(str, row))}\n")

    # Create a dummy model file
    with open(model_file, "w") as f:
        f.write("Mock model content\n")

    task.status = 'SUCCESS'
    task.save()

    return model_file