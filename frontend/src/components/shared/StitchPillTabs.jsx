import React from 'react';
import { Box, Button, Stack } from '@mui/material';

/**
 * StitchPillTabs — Pill-button tab switcher matching Stitch design system.
 * 
 * Props:
 *   tabs     {Array<{ label, icon? }>} — Tab definitions
 *   value    {number}  — Active tab index
 *   onChange {fn}      — (newIndex) => void
 */

const BRAND = '#006D77';

export default function StitchPillTabs({ tabs = [], value = 0, onChange }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.75,
        bgcolor: 'rgba(0,0,0,0.045)',
        p: 0.75,
        borderRadius: 2,
        width: 'fit-content',
      }}
    >
      {tabs.map((tab, i) => {
        const isActive = value === i;
        return (
          <Button
            key={i}
            onClick={() => onChange(i)}
            startIcon={tab.icon || null}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              py: 0.9,
              fontWeight: 600,
              fontSize: '0.84rem',
              minWidth: 0,
              textTransform: 'none',
              bgcolor: isActive ? 'white' : 'transparent',
              color: isActive ? BRAND : 'text.secondary',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 0.18s ease',
              '&:hover': {
                bgcolor: isActive ? 'white' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            {tab.label}
          </Button>
        );
      })}
    </Box>
  );
}
