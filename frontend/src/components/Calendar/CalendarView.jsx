import { useRef } from 'react'
import { Box } from '@mui/material'
import { useTheme, useMediaQuery } from '@mui/material'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import EventTooltip from './EventTooltip'
import { useState } from 'react'
import './CalendarView.css'

// ─── Status → background colour (Google Material 3) ──────────────────────────
const STATUS_BG = {
  pending:     '#F9AB00',   // Amber
  confirmed:   '#0F9D58',   // Green
  cancelled:   '#D93025',   // Red
  completed:   '#006D77',   // Teal (theme primary)
  no_show:     '#80868B',   // Gray
  rescheduled: '#9334E6',   // Purple
}

// ─── Rich Event Content Renderer ─────────────────────────────────────────────
function EventContent({ eventInfo }) {
  const { extendedProps, title } = eventInfo.event
  const viewType = eventInfo.view.type
  const isTimeGrid = viewType.startsWith('timeGrid')
  const isDayView = viewType === 'timeGridDay'

  // Clinician initials (SUG-CAL-009)
  const clinicianInitials = extendedProps?.clinician
    ? extendedProps.clinician.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : null

  return (
    <Box sx={{
      px: 0.75,
      py: isTimeGrid ? 0.5 : 0.2,
      overflow: 'hidden',
      lineHeight: 1.25,
      display: 'flex',
      flexDirection: 'column',
      gap: '1px',
      width: '100%',
    }}>
      {/* Patient name — always shown */}
      <Box component="span" sx={{
        fontWeight: 700,
        fontSize: isTimeGrid ? 11 : 10,
        color: '#FFFFFF',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'block',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </Box>

      {/* Service — shown in week + day views */}
      {isTimeGrid && extendedProps?.service && (
        <Box component="span" sx={{
          fontSize: 10,
          opacity: 0.88,
          color: '#FFFFFF',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        }}>
          {extendedProps.service}
        </Box>
      )}

      {/* Clinician — only in day view */}
      {isDayView && extendedProps?.clinician && (
        <Box component="span" sx={{
          fontSize: 9.5,
          opacity: 0.80,
          color: '#FFFFFF',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        }}>
          {extendedProps.clinician}
        </Box>
      )}

      {/* Clinician initials badge — week view only (SUG-CAL-009) */}
      {isTimeGrid && !isDayView && clinicianInitials && (
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.25)', mt: '1px', flexShrink: 0,
        }}>
          <Box component="span" sx={{ fontSize: 7, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {clinicianInitials}
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ─── CalendarView ─────────────────────────────────────────────────────────────
/**
 * Props:
 *   calendarRef   : React ref passed from CalendarPage
 *   events        : FullCalendar event objects array
 *   onEventClick  : (appointmentId: string) => void
 *   onSlotClick   : (dateStr: string) => void
 *   currentView   : string — controlled view type from parent
 *   onViewChange  : (viewType: string) => void
 */
export default function CalendarView({ calendarRef, events, onEventClick, onSlotClick, currentView, onViewChange }) {
  const internalRef = useRef(null)
  const ref = calendarRef ?? internalRef

  const [tooltip, setTooltip] = useState({ open: false, anchor: null, data: null })
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))

  const handleEventMouseEnter = (info) => {
    setTooltip({
      open: true,
      anchor: info.el,
      data: {
        patient:    info.event.extendedProps?.patient,
        clinician:  info.event.extendedProps?.clinician,
        service:    info.event.extendedProps?.service,
        room:       info.event.extendedProps?.room,
        start:      info.event.start,
        end:        info.event.end,
        status:     info.event.extendedProps?.status,
      },
    })
  }

  const handleEventMouseLeave = () => {
    setTooltip({ open: false, anchor: null, data: null })
  }

  const handleEventClick = (info) => {
    setTooltip({ open: false, anchor: null, data: null })
    onEventClick?.(info.event.id)
  }

  const handleDateClick = (info) => {
    onSlotClick?.(info.dateStr)
  }

  const handleSelect = (info) => {
    onSlotClick?.(info.startStr)
  }

  const handleDatesSet = (dateInfo) => {
    onViewChange?.(dateInfo.view.type)
  }

  const defaultView = isMobile ? 'timeGridDay' : isTablet ? 'timeGridWeek' : 'dayGridMonth'

  return (
    <Box sx={{ height: '100%', minHeight: 520 }}>
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={currentView ?? defaultView}
        headerToolbar={{
          left:   isMobile ? 'prev,next' : 'prev,next today',
          center: 'title',
          right:  '',
        }}
        buttonText={{ today: 'Today' }}
        nowIndicator
        selectable
        selectMirror
        dayMaxEvents={3}
        events={events}
        eventBackgroundColor="#006D77"
        eventBorderColor="transparent"
        eventDidMount={(info) => {
          // Apply per-event status colour
          const bg = STATUS_BG[info.event.extendedProps?.status]
          if (bg) {
            info.el.style.backgroundColor = bg
            info.el.style.borderColor     = bg
          }
        }}
        eventContent={(eventInfo) => <EventContent eventInfo={eventInfo} />}
        eventClick={handleEventClick}
        eventMouseEnter={handleEventMouseEnter}
        eventMouseLeave={handleEventMouseLeave}
        dateClick={handleDateClick}
        select={handleSelect}
        datesSet={handleDatesSet}
        height="100%"
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        scrollTime="08:00:00"
        expandRows
      />

      <EventTooltip
        open={tooltip.open}
        anchor={tooltip.anchor}
        data={tooltip.data}
        onClose={() => setTooltip({ open: false, anchor: null, data: null })}
      />
    </Box>
  )
}
