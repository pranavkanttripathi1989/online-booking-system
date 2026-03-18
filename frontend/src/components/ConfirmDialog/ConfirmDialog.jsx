import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

/**
 * ConfirmDialog
 *
 * Props:
 *   isOpen        boolean
 *   title         string
 *   message       string
 *   onConfirm     () => void
 *   onCancel      () => void
 *   confirmLabel  string   (default "Delete")
 *   confirmColor  string   (default "error")
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete',
  confirmColor = 'error',
}) {
  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        {title}
      </DialogTitle>

      {message && (
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
      )}

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          autoFocus
          sx={{ minWidth: 80 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          sx={{ minWidth: 80 }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
