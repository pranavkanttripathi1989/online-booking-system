/**
 * ─── GlobalSnackbar ────────────────────────────────────────────────────────────
 * App-wide toast/snackbar notification system via React context.
 * Usage: const { showToast } = useSnackbar(); showToast('Saved!', 'success');
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';

const SnackbarContext = createContext(null);

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export function GlobalSnackbarProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const processQueue = useCallback((q) => {
    if (q.length > 0 && !open) {
      setCurrent(q[0]);
      setQueue((prev) => prev.slice(1));
      setOpen(true);
    }
  }, [open]);

  const showToast = useCallback(
    (message, severity = 'success', duration = 4000) => {
      const item = { message, severity, duration, key: Date.now() };
      setQueue((prev) => {
        const next = [...prev, item];
        if (!open) processQueue(next);
        return next;
      });
    },
    [open, processQueue]
  );

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleExited = () => {
    processQueue(queue);
  };

  return (
    <SnackbarContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        key={current?.key}
        open={open}
        autoHideDuration={current?.duration || 4000}
        onClose={handleClose}
        TransitionProps={{ onExited: handleExited }}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 72, md: 24 } /* above mobile BottomNav */ }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity || 'success'}
          variant="filled"
          elevation={6}
          sx={{ minWidth: 280, fontWeight: 600 }}
        >
          {current?.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within GlobalSnackbarProvider');
  return ctx;
}
