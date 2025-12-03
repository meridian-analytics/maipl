from django.db.models import QuerySet


def extract_folder_structure(path: str) -> list[str]:
    """
    Parse a file path into its folder hierarchy.
    
    Args:
        path: File path (e.g., "folder1/subfolder/file.wav")
    
    Returns:
        List of folder segments (e.g., ["folder1", "subfolder"])
    """
    if not path:
        return []
    
    # Split by '/' and filter out empty strings
    parts = [part for part in path.split("/") if part]
    
    # Remove the filename (last part if it contains a dot, likely a file extension)
    # This is a heuristic - files typically have extensions
    if parts and "." in parts[-1]:
        parts = parts[:-1]
    
    return parts


def get_direct_subfolders(queryset: QuerySet, path_prefix: str = "") -> list[dict]:
    """
    Get immediate subfolders for a given path prefix.
    
    Args:
        queryset: Filtered File queryset
        path_prefix: Path prefix to search under (e.g., "folder1/subfolder")
    
    Returns:
        List of dicts with folder info: [{"name": "subfolder1", "path": "folder1/subfolder1", "file_count": 5}, ...]
    """
    # Normalize path_prefix
    if path_prefix:
        prefix = path_prefix.rstrip("/") + "/"
        # Get all files that start with this prefix
        files_queryset = queryset.filter(path__startswith=prefix)
    else:
        # Root level - get all files
        prefix = ""
        files_queryset = queryset.all()
    
    # Extract unique direct subfolders using a set
    subfolders = {}
    
    # Get all paths that match the prefix
    paths = files_queryset.values_list("path", flat=True)
    
    for file_path in paths:
        # Get the relative path after the prefix
        if prefix:
            relative_path = file_path[len(prefix):] if file_path.startswith(prefix) else ""
        else:
            relative_path = file_path
        
        if not relative_path:
            continue
        
        # Split into parts
        parts = relative_path.split("/")
        
        # Get the first part (direct subfolder name)
        if parts:
            subfolder_name = parts[0]
            
            # Build the full path for this subfolder
            if path_prefix:
                subfolder_path = f"{path_prefix}/{subfolder_name}"
            else:
                subfolder_path = subfolder_name
            
            # Only process if we haven't seen this subfolder yet
            if subfolder_path not in subfolders:
                # Count files that are in this subfolder or its children
                if path_prefix:
                    subfolder_prefix = f"{path_prefix}/{subfolder_name}/"
                else:
                    subfolder_prefix = f"{subfolder_name}/"
                
                file_count = queryset.filter(path__startswith=subfolder_prefix).count()
                
                subfolders[subfolder_path] = {
                    "name": subfolder_name,
                    "path": subfolder_path,
                    "file_count": file_count,
                }
    
    return list(subfolders.values())


def get_files_in_folder(queryset: QuerySet, path_prefix: str = "") -> QuerySet:
    """
    Get files directly in a folder (not in subfolders).
    
    Args:
        queryset: Filtered File queryset
        path_prefix: Path prefix to search under (e.g., "folder1/subfolder")
    
    Returns:
        Filtered queryset containing only files directly in the folder
    """
    if path_prefix:
        # Ensure path_prefix ends with / for proper matching
        prefix = path_prefix.rstrip("/") + "/"
        # Get files that start with prefix
        files_with_prefix = queryset.filter(path__startswith=prefix)
        
        # Filter to only files where the relative path (after prefix) doesn't contain /
        # This means the file is directly in this folder, not in a subfolder
        direct_files = []
        for file in files_with_prefix:
            relative_path = file.path[len(prefix):]
            # If relative_path has no /, it's a direct file in this folder
            if "/" not in relative_path:
                direct_files.append(file.id)
        
        return queryset.filter(id__in=direct_files)
    else:
        # Root level - files that don't have / in their path (directly in root)
        # This means files like "file.wav" but not "folder/file.wav"
        return queryset.exclude(path__contains="/")

