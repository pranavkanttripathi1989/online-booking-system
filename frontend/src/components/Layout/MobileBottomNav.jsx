import { useNavigate, useLocation } from 'react-router-dom'
import { Paper, BottomNavigation, BottomNavigationAction, Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import MessageRoundedIcon from '@mui/icons-material/MessageRounded'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'

const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard',    path: '/dashboard',    icon: DashboardRoundedIcon  },
  { label: 'Appointments', path: '/appointments', icon: EventNoteRoundedIcon  },
  { label: 'Patients',     path: '/patients',     icon: GroupRoundedIcon      },
  { label: 'Messages',     path: '/messages',     icon: MessageRoundedIcon    },
  { label: 'More',         path: '/settings',     icon: MoreHorizRoundedIcon  },
]

/**
 * MobileBottomNav – shown only on xs/sm screens (hidden on md+).
 * Apply padding-bottom: 60px to page content on mobile to avoid overlap.
 */
export default function MobileBottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Determine current active nav value
  const currentValue = MOBILE_NAV_ITEMS.findIndex(item =>
    pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
  )

  return (
    <Paper
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
        borderTop: '1px solid #E8EAED',
        borderRadius: 0,
        // Safe area for iOS notch
        pb: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -2px 16px rgba(32,33,36,0.10)',
        bgcolor: '#FFFFFF',
      }}
      elevation={0}
    >
      <BottomNavigation
        value={currentValue}
        onChange={(_, newValue) => {
          navigate(MOBILE_NAV_ITEMS[newValue].path)
        }}
        sx={{
          bgcolor: '#FFFFFF',
          height: 60,
          '& .MuiBottomNavigationAction-root': {
            color: '#9AA0A6',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontSize: '0.65rem',
            fontWeight: 700,
            minWidth: 48,
            pt: 1,
            transition: 'color 0.15s ease',
            '&.Mui-selected': {
              color: '#1A73E8',
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.65rem',
            fontWeight: 700,
          },
          '& .MuiBottomNavigationAction-label.Mui-selected': {
            fontSize: '0.65rem',
            fontWeight: 800,
          },
        }}
      >
        {MOBILE_NAV_ITEMS.map((item, idx) => {
          const isActive = idx === currentValue
          return (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={
                <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Google-style active indicator pill */}
                  {isActive && (
                    <Box sx={{
                      position: 'absolute',
                      top: -12,
                      width: 24,
                      height: 3,
                      borderRadius: '0 0 4px 4px',
                      bgcolor: '#1A73E8',
                    }} />
                  )}
                  <item.icon sx={{ fontSize: '1.4rem' }} />
                </Box>
              }
            />
          )
        })}
      </BottomNavigation>
    </Paper>
  )
}
