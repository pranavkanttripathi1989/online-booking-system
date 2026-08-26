import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'

/**
 * CancelDialog — asks for optional cancellation reason before confirming.
 * Props:
 *   open: boolean
 *   appointmentId: string | null
 *   onClose: () => void
 *   onConfirm: (id: string, reason: string) => void
 */
export default function CancelDialog({ open, appointmentId, onClose, onConfirm }) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    if (!appointmentId) return
    onConfirm(appointmentId, reason)
    setReason('')
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CancelIcon color="error" />
        Cancel Appointment
      </DialogTitle>
      <DialogContent>
        <DialogContentText mb={2}>
          Are you sure you want to cancel this appointment? This action cannot be undone. Optionally, provide a reason below.
        </DialogContentText>
        <TextField
          autoFocus
          label="Cancellation reason (optional)"
          multiline
          rows={3}
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Patient requested cancellation"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Keep Appointment
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="error" startIcon={<CancelIcon />}>
          Cancel Appointment
        </Button>
      </DialogActions>
    </Dialog>
  )
}
