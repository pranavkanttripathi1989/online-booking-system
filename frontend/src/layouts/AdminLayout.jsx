import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import PeopleAltIcon        from '@mui/icons-material/PeopleAlt'
import BusinessIcon          from '@mui/icons-material/Business'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import EmailIcon             from '@mui/icons-material/Email'
import ChatIcon              from '@mui/icons-material/Chat'
import PolicyIcon            from '@mui/icons-material/Policy'
import MedicalServicesIcon   from '@mui/icons-material/MedicalServices'
import LanguageIcon          from '@mui/icons-material/Language'
import MeetingRoomIcon       from '@mui/icons-material/MeetingRoom'
import HistoryIcon           from '@mui/icons-material/History'

const BRAND = '#006D77'
const SIDEBAR_WIDTH = 224

const NAV_SECTIONS = [
  {
    label: 'Users & Access',
    items: [
      { label: 'Users & RBAC',      icon: <PeopleAltIcon />,          path: '/admin/users'            },
      { label: 'Roles',             icon: <AdminPanelSettingsIcon />,  path: '/admin/roles'            },
      { label: 'Audit Log',         icon: <HistoryIcon />,             path: '/admin/users?tab=2'      },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Organizations',     icon: <BusinessIcon />,            path: '/admin/organizations'    },
      { label: 'Policies',          icon: <PolicyIcon />,              path: '/admin/policies'         },
      { label: 'Communications',    icon: <ChatIcon />,                path: '/admin/communications'   },
      { label: 'Email Templates',   icon: <EmailIcon />,               path: '/admin/email-templates'  },
    ],
  },
  {
    label: 'Reference Data',
    items: [
      { label: 'Clinician Types',   icon: <MedicalServicesIcon />,     path: '/admin/clinician-types'  },
      { label: 'Room Types',        icon: <MeetingRoomIcon />,         path: '/admin/room-types'       },
      { label: 'Languages',         icon: <LanguageIcon />,            path: '/admin/languages'        },
    ],
  },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    const base = path.split('?')[0]
    return location.pathname === base || location.pathname.startsWith(base + '/')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100%' }}>
      {/* ── Admin Sidebar ─────────────────────────────────────────────── */}
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            position: 'relative',
            height: '100%',
            bgcolor: '#F8FAFC',
            borderRight: '1px solid #E2E8F0',
            boxShadow: 'none',
            pt: 1,
            pb: 2,
            overflowX: 'hidden',
          },
        }}
      >
        {/* Sidebar Header */}
        <Box sx={{ px: 2, py: 1.5, mb: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: 1.2, textTransform: 'uppercase', color: BRAND }}
          >
            Admin Console
          </Typography>
        </Box>

        {NAV_SECTIONS.map((section, si) => (
          <Box key={section.label}>
            {si > 0 && <Divider sx={{ my: 1, borderColor: '#E2E8F0' }} />}
            <Typography
              variant="caption"
              sx={{ px: 2, display: 'block', mb: 0.5, fontWeight: 700, fontSize: '0.62rem', letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.disabled' }}
            >
              {section.label}
            </Typography>
            <List dense disablePadding>
              {section.items.map((item) => {
                const active = isActive(item.path)
                return (
                  <ListItemButton
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    sx={{
                      mx: 1,
                      px: 1.5,
                      py: 0.8,
                      borderRadius: 1.5,
                      mb: 0.25,
                      bgcolor: active ? `${BRAND}14` : 'transparent',
                      '&:hover': { bgcolor: active ? `${BRAND}20` : 'rgba(0,0,0,0.04)' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: active ? BRAND : '#94A3B8' }}>
                      {/* Clone icon with size */}
                      {item.icon.type ? (
                        <item.icon.type sx={{ fontSize: 18, color: active ? BRAND : '#94A3B8' }} />
                      ) : item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: active ? 700 : 500,
                        fontSize: '0.8rem',
                        color: active ? BRAND : 'text.secondary',
                        noWrap: true,
                      }}
                    />
                    {active && (
                      <Box
                        sx={{
                          width: 3,
                          height: 24,
                          borderRadius: 4,
                          bgcolor: BRAND,
                          ml: 0.5,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </ListItemButton>
                )
              })}
            </List>
          </Box>
        ))}
      </Drawer>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 }, minWidth: 0, overflowX: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
