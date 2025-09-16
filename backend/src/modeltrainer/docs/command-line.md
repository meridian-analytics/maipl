Tutorial: Ketos Train
=====================

The `ketos-train` module, part of the Ketos commands suite, simplifies the process of training a neural network model with the pre-specified architectures and data, while also allowing integration of user-defined custom audio representations, and neural networks.

Quick Start
-----------

This quick start guide will demonstrate how to train a ResNet model using the specified parameters and data.

The `ketos-train` module accepts various parameters to customize the training process. Below is an example of how to use `ketos-train` with hypothetical configurations.

Navigate to the directory containing your model recipe, HDF5 database, and audio representation files, and then execute the following command based on your operating system:

For **Linux / Mac**:

.. code-block:: shell

   ketos-train model_recipe.json hdf5_db.h5 audio_representation.json --train_table /train --val_table /val --batch_size 32 --epochs 20 --output_folder model_outputs --model_output trained_model.kt

Upon execution, the command will train the neural network model and save the results in the specified output folder.

.. note::

   For a more detailed walkthrough on how to use each module, please refer to the Examples section.

Parameters
----------

The `ketos-train` command has several parameters that can be used to adjust its behavior:

.. code-block:: shell

    ketos-train -h

    ketos_train.py [-h] [--train_table TRAIN_TABLE [TRAIN_TABLE ...]]
                   [--train_annot_table TRAIN_ANNOT_TABLE [TRAIN_ANNOT_TABLE ...]]
                   [--val_table VAL_TABLE [VAL_TABLE ...]]
                   [--val_annot_table VAL_ANNOT_TABLE [VAL_ANNOT_TABLE ...]]
                   [--batch_size BATCH_SIZE [BATCH_SIZE ...]]
                   [--epochs EPOCHS] [--seed SEED] [--output_folder OUTPUT_FOLDER]
                   [--model_output MODEL_OUTPUT] [--checkpoints CHECKPOINTS]
                   [--custom_module CUSTOM_MODULE]
                   model_recipe hdf5_db audio_representation

    positional arguments:
    
    model_recipe          Path to the model recipe file.
    hdf5_db               Path to the HDF5 database file containing training and validation data.
    audio_representation  Path to the audio representation config file.

    options:
    
    -h, --help            show this help message and exit
    --train_table         Path(s) within the HDF5 database where the training data is stored.
    --train_annot_table   Path(s) within the HDF5 database where the training annotations 
                            (labels) are stored as a separate table. Usually, the train_table will have the annotations in the same table.
    --val_table           Path(s) within the HDF5 database where the validation data is stored.
    --val_annot_table     Path(s) within the HDF5 database where the validation annotations 
                            (labels) are stored as a separate table. Usually, the val_table will have the annotations in the same table.
    --batch_size          Batch size for training. Can be an integer or a list of integers for custom batch sizes.
    --epochs              Number of training epochs.
    --seed                Seed for random number generator for reproducibility.
    --output_folder       Directory to save model outputs.
    --model_output        Filename to save the trained model.
    --checkpoints         Frequency (in epochs) to save checkpoints during training.
    --custom_module       Directory containing custom components like neural network architectures and transformation functions.

Examples
--------

**Example 1: Basic Training**

This example demonstrates basic training using default parameters:

.. code-block:: shell

   ketos-train model_recipe.json hdf5_db.h5 audio_representation.json --train_table /train --val_table /val --output_folder model_outputs

* `model_recipe.json`: Path to the model recipe file.
* `hdf5_db.h5`: Path to the HDF5 database file containing training and validation data.
* `audio_representation.json`: Path to the audio representation config file.
* `--train_table /train`: Path within the HDF5 database where the training data is stored.
* `--val_table /val`: Path within the HDF5 database where the validation data is stored.
* `--output_folder model_outputs`: Directory to save model outputs.

**Example 2: Using Custom Module**

This example demonstrates training with a custom module:

.. code-block:: shell

   ketos-train model_recipe.json hdf5_db.h5 audio_representation.json --train_table /train --val_table /val --custom_module custom_components --output_folder model_outputs

* `--custom_module custom_components`: Directory containing custom components like neural network architectures and transformation functions.

**Example 3: Training with Multiple Tables**

This example demonstrates training using multiple tables for both training and validation:

.. code-block:: shell

    ketos-train model_recipe.yaml hdf5_db.h5 audio_representation.yaml --train_table /train/pos /train/neg --val_table /val/pos /val/neg --batch_size 32 32 --epochs 20 --output_folder model_outputs

* `--train_table /train/pos /train/neg`: Paths within the HDF5 database where the training data is stored.
* `--val_table /val/pos /val/neg`: Paths within the HDF5 database where the validation data is stored.
* `--batch_size 32 32`: Custom batch sizes for each table (32 for /train/pos and 32 for /train/neg).
* `--epochs 20`: Number of training epochs.
* `--output_folder model_outputs`: Directory to save model outputs.

**Example 4: Training with Multiple Tables by Passing a Root Path**

We can achieve the same outcome as in the previous example by simply passigna root table path as our `--train_table` and `--val_table`. The script will then search for all leaf nodes and create batch generators for each of them: 
Consider a the same table structure as before. By passing `--train_table /train`, the script will search and use teh data in both `/train/pos` and `/train/neg` as both of these tables are leaf nodes of `/train`
.. code-block:: shell
    
    ketos-train model_recipe.yaml hdf5_db.h5 audio_representation.yaml --train_table /train --val_table /val --batch_size 64  --epochs 20 --output_folder model_outputs

* `--train_table /train`: Paths within the HDF5 database where the training data is stored.
* `--val_table /val`: Paths within the HDF5 database where the validation data is stored.
* `--batch_size 64`: One single batch size which will be equally split between each leaf node table (32 for /train/pos and 32 for /train/neg).
* `--epochs 20`: Number of training epochs.
* `--output_folder model_outputs`: Directory to save model outputs.

Note
----

The `train_table` and `val_table` parameters accept either a single path or a list of paths. Specifying a root path (e.g., `/train`) will include all subpaths under it. 
If multiple paths are specified, only those exact paths are used for data retrieval. Separate annotation tables (`train_annot_table` and `val_annot_table`) must match the data tables (`train_table` and `val_table`) in order if specified. If omitted, labels are assumed to be part of the data tables.
