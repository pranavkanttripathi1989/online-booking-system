import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Typography, Tabs, Tab, Grid, Card, CardContent, Stack, Divider,
  TextField, Avatar, Switch, FormControlLabel, Paper, Chip, IconButton,
  Slider, Radio, RadioGroup, FormControl, FormLabel, MenuItem, Alert,
  Tooltip, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded'
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import { useAuth } from '../../context/AuthContext'

function TabPanel({ value, index, children }) {
  return value === index ? <Box>{children}</Box> : null
}

const ACCENT_COLORS = ['#1A73E8', '#0F9D58', '#9334E6', '#D93025', '#F9AB00', '#0891B2', '#5F6368']

// ─── Notification rows ────────────────────────────────────────────────────────
const NOTIF_ROWS = [
  { label: 'New appointment booked',         email: true,  sms: true,  app: true  },
  { label: 'Appointment reminder (24h)',      email: true,  sms: true,  app: true  },
  { label: 'Appointment cancelled',           email: true,  sms: false, app: true  },
  { label: 'New message received',            email: false, sms: false, app: true  },
  { label: 'New review posted',              email: true,  sms: false, app: true  },
  { label: 'Payment received',               email: true,  sms: true,  app: true  },
  { label: 'System announcements',           email: true,  sms: false, app: false },
]

// ─── Mock sessions ────────────────────────────────────────────────────────────
const MOCK_SESSIONS = [
  { id: '1', device: 'Chrome on macOS', location: 'Mumbai, IN', last_seen: 'Active now',   current: true  },
  { id: '2', device: 'Safari on iPhone', location: 'Delhi, IN',  last_seen: '2 hours ago',  current: false },
  { id: '3', device: 'Edge on Windows',  location: 'London, UK', last_seen: '5 days ago',   current: false },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState(0)
  const [saved, setSaved] = useState(false)

  // Profile state
  const [firstName, setFirstName]   = useState(user?.name?.split(' ')[0] ?? 'Admin')
  const [lastName, setLastName]     = useState(user?.name?.split(' ').slice(1).join(' ') ?? 'User')
  const [phone, setPhone]           = useState('+1 555-000-1234')
  const [bio, setBio]               = useState('')

  // Notifications state
  const [notifs, setNotifs] = useState(NOTIF_ROWS)

  // Appearance state
  const [fontSize, setFontSize]   = useState(2)  // 0=sm, 1=md, 2=lg, 3=xl
  const [accent, setAccent]       = useState('#1565C7')
  const [themeMode, setThemeMode] = useState('light')
  const [compact, setCompact]     = useState(false)
  const [rtl, setRtl]             = useState(false)
  const [language, setLanguage]   = useState('en')

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const toggleNotif = (idx, channel) => {
    setNotifs(prev => prev.map((r, i) => i === idx ? { ...r, [channel]: !r[channel] } : r))
  }

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Settings — MediBook</title></Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ color: '#202124', fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>Settings</Typography>
        <Typography variant="body2" sx={{ color: '#5F6368' }}>Manage your account, notifications, and preferences</Typography>
      </Box>

      {saved && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2.5 }}>Changes saved successfully!</Alert>}

      <Paper sx={{ borderRadius: 3, border: '1px solid #E8EAED', boxShadow: 'none', overflow: 'hidden' }}>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, borderBottom: '1px solid #E8EAED', bgcolor: '#F8F9FA',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 52, fontSize: '0.875rem', gap: 0.75 },
            '& .Mui-selected': { color: '#1A73E8' },
            '& .MuiTabs-indicator': { bgcolor: '#1A73E8', height: 3, borderRadius: 1.5 },
          }}
        >
          <Tab icon={<EditRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Profile" />
          <Tab icon={<LockRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Account & Security" />
          <Tab icon={<NotificationsRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Notifications" />
          <Tab icon={<PaletteRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Appearance" />
          <Tab icon={<BusinessRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Clinic" />
        </Tabs>

        <Box sx={{ p: { xs: 2.5, sm: 4 } }}>

          {/* ── Profile ──────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={4}>
              {/* Avatar */}
              <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar sx={{ width: 110, height: 110, bgcolor: '#E8F0FE', color: '#1A73E8', fontSize: '2.5rem', fontWeight: 800 }}>
                    {(firstName[0] ?? '') + (lastName[0] ?? '')}
                  </Avatar>
                  <IconButton size="small" sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: '#fff', border: '2px solid #E8EAED', '&:hover': { bgcolor: '#E8F0FE' } }}>
                    <CameraAltRoundedIcon fontSize="small" sx={{ color: '#1A73E8' }} />
                  </IconButton>
                </Box>
                <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>Click to change photo<br />JPG, PNG or GIF · Max 2MB</Typography>
              </Grid>
              {/* Form */}
              <Grid item xs={12} md={9}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Email" value={user?.email ?? ''} disabled sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} helperText="Change email in Account tab" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Phone" value={phone} onChange={e => setPhone(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select label="Gender" defaultValue="prefer_not_to_say" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                      {['male', 'female', 'other', 'prefer_not_to_say'].map(g => <MenuItem key={g} value={g} sx={{ textTransform: 'capitalize' }}>{g.replace(/_/g, ' ')}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={3} label="Bio / About" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us a little about yourself…" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Divider sx={{ width: '100%', ml: 2.5, mt: 1.5, mb: 0.5 }} />
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Address</Typography>
                  </Grid>
                  <Grid item xs={12}><TextField fullWidth label="Street Address" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="City" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="State / Province" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="ZIP / Postal Code" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleSave}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3,
                        background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' },
                      }}>Save Changes</Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Account & Security ───────────────────────────────────────── */}
          <TabPanel value={tab} index={1}>
            <Stack spacing={3.5}>
              {/* Change password */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><LockRoundedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} /> Change Password</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Current Password" type="password" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="New Password" type="password" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Confirm New Password" type="password" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12}><Button variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Update Password</Button></Grid>
                </Grid>
              </Box>
              <Divider />
              {/* 2FA */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}><SecurityRoundedIcon sx={{ fontSize: '1.1rem', color: '#0F9D58' }} /> Two-Factor Authentication</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Add an extra layer of security to your account by enabling 2FA.</Typography>
                <FormControlLabel control={<Switch color="success" />} label={<Typography fontWeight={600}>Enable 2FA (TOTP)</Typography>} />
              </Box>
              <Divider />
              {/* Active sessions */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><DevicesRoundedIcon sx={{ fontSize: '1.1rem', color: '#9334E6' }} /> Active Sessions</Typography>
                <Stack spacing={1.5}>
                  {MOCK_SESSIONS.map((s) => (
                    <Paper key={s.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, borderColor: s.current ? 'primary.main' : 'divider' }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <DevicesRoundedIcon sx={{ color: s.current ? 'primary.main' : 'text.disabled' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{s.device} {s.current && <Chip label="Current" size="small" color="primary" sx={{ ml: 1, fontWeight: 700, fontSize: '0.68rem' }} />}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.location} · {s.last_seen}</Typography>
                        </Box>
                      </Stack>
                      {!s.current && <Button size="small" color="error" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Revoke</Button>}
                    </Paper>
                  ))}
                </Stack>
              </Box>
              <Divider />
              {/* Danger zone */}
              <Box sx={{ p: 2.5, border: '1.5px solid #F5C6C2', borderRadius: 2.5, bgcolor: '#FCE8E6' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#D93025', mb: 0.5 }}>Danger Zone</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Deactivating your account will immediately revoke all access. This action cannot be undone.</Typography>
                <Button variant="outlined" color="error" startIcon={<DeleteRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Deactivate Account</Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* ── Notifications ────────────────────────────────────────────── */}
          <TabPanel value={tab} index={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Choose how you want to be notified for each event type.</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.10em', bgcolor: '#F8F9FA', color: '#9AA0A6' } }}>
                    <TableCell sx={{ width: '50%' }}>Event</TableCell>
                    <TableCell align="center">Email</TableCell>
                    <TableCell align="center">SMS</TableCell>
                    <TableCell align="center">In-App</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifs.map((row, i) => (
                    <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.label}</TableCell>
                      {['email', 'sms', 'app'].map(ch => (
                        <TableCell key={ch} align="center">
                          <Switch size="small" checked={row[ch]} onChange={() => toggleNotif(i, ch)} color="success" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
            <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleSave}
              sx={{ mt: 3, borderRadius: 2.5, textTransform: 'none', fontWeight: 700,
                background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' },
              }}>Save Preferences</Button>
          </TabPanel>

          {/* ── Appearance ───────────────────────────────────────────────── */}
          <TabPanel value={tab} index={3}>
            <Stack spacing={4} sx={{ maxWidth: 560 }}>
              {/* Theme */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Theme</Typography>
                <FormControl component="fieldset">
                  <RadioGroup row value={themeMode} onChange={(e) => setThemeMode(e.target.value)}>
                    {[['light', '☀️ Light'], ['dark', '🌙 Dark'], ['system', '💻 System']].map(([v, l]) => (
                      <FormControlLabel key={v} value={v} control={<Radio size="small" />} label={<Typography fontWeight={600} variant="body2">{l}</Typography>}
                        sx={{ px: 2, py: 1, border: '1.5px solid', borderColor: themeMode === v ? 'primary.main' : 'divider', borderRadius: 2, mr: 1.5 }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>
              {/* Font size */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>Font Size</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>Adjust the base text size across the application</Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 50, textAlign: 'center', fontSize: `${12 + fontSize * 2}px` }}>Aa</Typography>
                  <Slider value={fontSize} min={0} max={3} step={1} marks={[{value:0,label:'SM'},{value:1,label:'MD'},{value:2,label:'LG'},{value:3,label:'XL'}]} onChange={(_, v) => setFontSize(v)} sx={{ flex: 1 }} />
                </Stack>
              </Box>
              {/* Accent color */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Accent Color</Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  {ACCENT_COLORS.map((c) => (
                    <Box key={c} onClick={() => setAccent(c)} sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: accent === c ? `3px solid ${c}` : '3px solid transparent', outline: accent === c ? `2px solid #fff` : 'none', boxShadow: accent === c ? `0 0 0 3px ${c}55` : 'none', transition: 'all 0.15s' }} />
                  ))}
                </Stack>
              </Box>
              {/* Toggles */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Additional Options</Typography>
                <Stack spacing={1}>
                  <FormControlLabel control={<Switch checked={compact} onChange={() => setCompact(!compact)} color="primary" />} label={<Box><Typography variant="body2" fontWeight={700}>Compact Mode</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>Reduces padding and spacing</Typography></Box>} />
                  <FormControlLabel control={<Switch checked={rtl} onChange={() => setRtl(!rtl)} color="primary" />} label={<Box><Typography variant="body2" fontWeight={700}>RTL Layout</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>For Arabic, Hebrew, and other RTL languages</Typography></Box>} />
                </Stack>
              </Box>
              <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleSave}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start',
                  background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' },
                }}>Save Appearance</Button>
            </Stack>
          </TabPanel>

          {/* ── Clinic Settings ────────────────────────────────────────────── */}
          <TabPanel value={tab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>Clinic Information</Typography>
              </Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Clinic Name" defaultValue="MediCare Clinic" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Contact Phone" defaultValue="+1 555-100-0000" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Contact Email" defaultValue="admin@medicareclinic.com" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth select label="Timezone" defaultValue="IST" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['UTC', 'IST', 'EST', 'PST', 'CET', 'GST'].map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
              </TextField></Grid>
              <Grid item xs={12}><TextField fullWidth label="Address" defaultValue="123 Health Avenue, Medical District, MH 400001" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth select label="Currency" defaultValue="USD" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['USD', 'EUR', 'GBP', 'INR', 'AED'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Default Slot Duration (min)" defaultValue="30" type="number" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleSave}
                  sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700,
                    background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' },
                  }}>Save Clinic Settings</Button>
              </Grid>
            </Grid>
          </TabPanel>

        </Box>
      </Paper>
    </Box>
  )
}
