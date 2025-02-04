import React, { useState } from 'react';
import { TextField, IconButton, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface EditableTagCellProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  isLoading: boolean;
}

export const EditableTagCell: React.FC<EditableTagCellProps> = ({ initialValue, onSave, isLoading }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        autoFocus
        size="small"
        disabled={isLoading}
        InputProps={{
          endAdornment: (
            <>
              <IconButton onClick={handleSave} size="small" disabled={isLoading}>
                <CheckIcon />
              </IconButton>
              <IconButton onClick={handleCancel} size="small" disabled={isLoading}>
                <CloseIcon />
              </IconButton>
            </>
          ),
        }}
      />
    );
  }

  return (
    <>
      {value}
      {isLoading ? (
        <CircularProgress size={20} />
      ) : (
        <IconButton onClick={handleEdit} size="small">
          <EditIcon />
        </IconButton>
      )}
    </>
  );
};
