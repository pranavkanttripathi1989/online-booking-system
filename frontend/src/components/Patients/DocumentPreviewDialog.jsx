import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, IconButton, Typography } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'

/**
 * REQ174 — inline PDF/image preview for an uploaded PatientDocument.
 * PDF renders via the browser's own native viewer inside an <iframe> (no
 * new dependency — see PLAN243 for why react-pdf was deliberately not
 * added); anything else falls back to a plain <img>. Both are followed by
 * a real Download link so a user who wants the file itself, not just a
 * look, still can.
 *
 * @param {object} props
 * @param {{ file_ref: string, mime_type: string, original_filename: string } | null} props.document - the document to preview, or null to keep the dialog closed
 * @param {() => void} props.onClose
 * @param {string} props.apiBase - origin the file_ref is served from (see patients/detail.jsx's own apiBase derivation)
 */
function DocumentPreviewDialog({ document: doc, onClose, apiBase }) {
  if (!doc) return null
  const fileUrl = `${apiBase}${doc.file_ref}`
  const isImage = doc.mime_type?.startsWith('image/')

  return (
    <Dialog open={Boolean(doc)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ pr: 2 }}>
          {doc.original_filename}
        </Typography>
        <IconButton aria-label="Close preview" onClick={onClose} size="small">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: 'action.hover' }}>
        {isImage ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <img src={fileUrl} alt={doc.original_filename} style={{ maxWidth: '100%', maxHeight: '80vh' }} />
          </Box>
        ) : (
          <iframe src={fileUrl} title={doc.original_filename} style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }} />
        )}
      </DialogContent>
      <DialogActions>
        <Button component="a" href={fileUrl} download={doc.original_filename} startIcon={<DownloadRoundedIcon />}>
          Download
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default DocumentPreviewDialog
