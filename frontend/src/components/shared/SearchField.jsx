import React, { useState, useCallback } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

export default function SearchField({ value, onChange, placeholder = 'Search...', sx = {}, ...props }) {
  const [localValue, setLocalValue] = useState(value || '');

  const handleChange = useCallback(
    (e) => {
      setLocalValue(e.target.value);
      onChange && onChange(e.target.value);
    },
    [onChange]
  );

  const handleClear = () => {
    setLocalValue('');
    onChange && onChange('');
  };

  return (
    <TextField
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      size="small"
      sx={{ minWidth: 220, ...sx }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          </InputAdornment>
        ),
        endAdornment: localValue ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={handleClear} edge="end">
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      {...props}
    />
  );
}
