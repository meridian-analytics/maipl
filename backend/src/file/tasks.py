import os
import tempfile
from django.core.files import File as DjangoFile
from common.logger import file_logger
import h5py
from celery import shared_task
from common.file_utils import FileUtils


def get_hdf5_structure(h5_file, group_path=""):
    """
    Recursively extract HDF5 structure information with sample counts.
    
    Args:
        h5_file: h5py file object
        group_path: Current group path (for recursion)
    
    Returns:
        dict: Structure information for the current group with datasets and samples
    """
    structure = {}
    
    # Process all items in the current group
    for key in h5_file.keys():
        item = h5_file[key]
        current_path = f"{group_path}/{key}" if group_path else f"/{key}"
        
        if isinstance(item, h5py.Group):
            # It's a group, recurse into it
            subgroup_structure = get_hdf5_structure(item, current_path)
            structure.update(subgroup_structure)
        elif isinstance(item, h5py.Dataset):
            # It's a dataset, add it to the current group's datasets
            if group_path not in structure:
                structure[group_path] = {"datasets": {}, "samples": 0}
            structure[group_path]["datasets"][key] = "dataset"
    
    # Add sample count for the current group level
    if group_path:
        samples = count_samples_in_group(h5_file)
        if group_path not in structure:
            structure[group_path] = {"datasets": {}, "samples": samples}
        else:
            structure[group_path]["samples"] = samples
    
    return structure


def get_group_hierarchy(h5_file, group_path=""):
    """
    Build group hierarchy from HDF5 file.
    
    Args:
        h5_file: h5py file object
        group_path: Current group path (for recursion)
    
    Returns:
        dict: Group hierarchy mapping
    """
    hierarchy = {}
    
    for key in h5_file.keys():
        item = h5_file[key]
        current_path = f"{group_path}/{key}" if group_path else f"/{key}"
        
        if isinstance(item, h5py.Group):
            # Get subgroups of this group
            subgroups = []
            for subkey in item.keys():
                if isinstance(item[subkey], h5py.Group):
                    sub_path = f"{current_path}/{subkey}"
                    subgroups.append(sub_path)
            
            hierarchy[current_path] = subgroups
            
            # Recursively process subgroups
            subgroup_hierarchy = get_group_hierarchy(item, current_path)
            hierarchy.update(subgroup_hierarchy)
    
    return hierarchy


def count_samples_in_group(group):
    """
    Count samples in a specific group (direct datasets only, not recursive).
    
    Args:
        group: h5py group object
    
    Returns:
        int: Number of samples in this group
    """
    samples = 0
    
    for key in group.keys():
        item = group[key]
        if isinstance(item, h5py.Dataset):
            # Count samples in this dataset
            if len(item.shape) > 0:
                samples += item.shape[0]
    
    return samples


def count_total_samples(h5_file):
    """
    Count total samples across all datasets in the HDF5 file.
    
    Args:
        h5_file: h5py file object
    
    Returns:
        int: Total number of samples
    """
    total_samples = 0
    
    def count_in_group(group):
        nonlocal total_samples
        for key in group.keys():
            item = group[key]
            if isinstance(item, h5py.Dataset):
                # Count samples in this dataset
                if len(item.shape) > 0:
                    total_samples += item.shape[0]
            elif isinstance(item, h5py.Group):
                count_in_group(item)
    
    count_in_group(h5_file)
    return total_samples


def get_all_groups(h5_file, group_path=""):
    """
    Get all group paths in the HDF5 file.
    
    Args:
        h5_file: h5py file object
        group_path: Current group path (for recursion)
    
    Returns:
        list: List of all group paths
    """
    groups = []
    
    for key in h5_file.keys():
        item = h5_file[key]
        current_path = f"{group_path}/{key}" if group_path else f"/{key}"
        
        if isinstance(item, h5py.Group):
            groups.append(current_path)
            # Recursively get subgroups
            subgroups = get_all_groups(item, current_path)
            groups.extend(subgroups)
    
    return groups


@shared_task(bind=True)
def update_meta_from_h5_file(self, file_id):
    """
    Update the meta information for a file based on its H5 file.

    Args:
        file_id: ID of the file to update
    """
    # log the start of the task
    file_logger.info(f"Starting update_meta_from_h5_file task for file ID: {file_id}")

    try:
        from .models import File
        file = File.objects.get(id=file_id)
        # log the file details
        file_logger.info(f"File details: {file.id}, {file.path}")
        
        # download the file
        file_utils = FileUtils()
        local_file_path = file_utils.download_file(file.id)

        # open the file and extract comprehensive meta information
        with h5py.File(local_file_path, 'r') as f:
            # Get HDF5 structure
            hdf5_structure = get_hdf5_structure(f)
            
            # Get all groups
            groups = get_all_groups(f)
            
            # Get group hierarchy
            group_hierarchy = get_group_hierarchy(f)
            
            # Count total samples
            total_samples = count_total_samples(f)
            
            # Build the complete meta structure
            file.meta = {
                "database_metadata": {
                    "hdf5_structure": hdf5_structure,
                    "total_samples": total_samples,
                    "groups": groups,
                    "group_hierarchy": group_hierarchy
                }
            }
            
            file.save()
            
        # log the meta information
        file_logger.info(f"Meta information updated: {file.meta}")
        
    except Exception as e:
        file_logger.error(f"Error updating meta from H5 file: {e}")
        raise e
        
    
    