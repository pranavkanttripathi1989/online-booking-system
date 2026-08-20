import { Box, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'

/**
 * Resource × action permission grid. Scrolls horizontally on narrow
 * viewports instead of clipping (context/frontend-hard-rules.md §1.1/1.4).
 */
export default function PermissionMatrix({ resources, actions, selectedIds, onToggle, disabled = false, permissionIdFor }) {
  // Real Permissions rows are UUID-keyed, not the mock's readable perm-<resource>-<action>
  // ids — callers backed by the real backend pass permissionIdFor to look up the actual id;
  // the synthesized fallback keeps this component's default (and its tests) unchanged.
  const permId = permissionIdFor || ((resource, action) => `perm-${resource}-${action}`)

  return (
    <TableContainer sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table size="small" aria-label="Permission matrix by resource and action">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell component="th" scope="col" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>Resource</TableCell>
            {actions.map((action) => (
              <TableCell key={action} component="th" scope="col" align="center" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                {action}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {resources.map((resource) => (
            <TableRow key={resource} hover>
              <TableCell component="th" scope="row" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                {resource.replace('_', ' ')}
              </TableCell>
              {actions.map((action) => {
                const id = permId(resource, action)
                const checked = selectedIds.includes(id)
                return (
                  <TableCell key={action} align="center">
                    <Checkbox
                      size="small"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggle(id)}
                      inputProps={{ 'aria-label': `Grant ${resource.replace('_', ' ')} — ${action}` }}
                    />
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {resources.length === 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">No permissions defined.</Typography>
        </Box>
      )}
    </TableContainer>
  )
}
