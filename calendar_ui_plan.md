# MediBook — Calendar Page Professional UI Redesign Plan
> **Version:** 2.0 · **Stack:** React 18 · MUI v5 · FullCalendar v6 · Plus Jakarta Sans  
> **Design System:** Google Material 3 · Color palette: #1A73E8 (Blue) · #0F9D58 (Green) · #F9AB00 (Yellow) · #D93025 (Red)  
> **Target files:** `CalendarPage.jsx` · `CalendarView.jsx` · `CalendarView.css` (new)

---

## 🔍 Current Problems

| Problem | Root Cause |
|---------|-----------|
| Large empty left gap on page | `<Box className="page-enter">` has no padding — Layout sidebar leaves dead space with no content edge alignment |
| Filter bar feels disconnected | 3 plain MUI `<TextField select>` dropdowns floating above in a plain white Paper — no visual tie to the calendar |
| FullCalendar toolbar is unstyled | Using FullCalendar's native HTML buttons — not styled with Google Material colors or Plus Jakarta Sans |
| No visual hierarchy | Title → raw filter box → raw calendar grid; no premium card layering, no status legend, no action area |
| Month view cells are paper-white | No hover effects, no "add" indicator on hover, no weekend coloring distinction |
| No quick stats or context | No count by status, no today's schedule preview — page is just a blank grid |

---

## 🎯 Redesign Goals

1. **Eliminate the left gap** — integrate `pt`/`px` correctly so calendar fills its content area flush with sidebar edge
2. **Unified header bar** — merge page title + view toggle (Month/Week/Day/List) + New Booking button into one premium gradient-accented header
3. **Filter chips instead of dropdowns** — horizontal scrollable chip row for Clinician / Clinic / Status with avatar icons
4. **Custom FullCalendar CSS** — override all native toolbar buttons using `::part()` or a dedicated CSS file; apply Google Blue, rounded buttons, Plus Jakarta Sans
5. **Status legend strip** — small colored dot + label row showing all 5 appointment statuses inline below the filter bar
6. **Calendar cell micro-interactions** — hover highlight on date cells with `+` add indicator, weekend column subtle tint, today cell Google Blue badge
7. **Mini stats row** — 4 compact count chips above calendar: Total / Confirmed / Pending / Cancelled pulled from filtered events
8. **Loading skeleton** — replace CircularProgress with a full calendar skeleton using `@mui/material/Skeleton` while data loads

---

## 🏗️ Layout Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER ROW                                                    │
│  📅 Calendar    12 appointments    [Month][Week][Day][List]  [+ New Booking]  │
├────────────────────────────────────────────────────────────────┤
│  FILTER + STATS ROW                                            │
│  👤 Clinician ▾  🏥 Clinic ▾  ● Status ▾   [× Clear]         │
│  ● 8 Confirmed  ● 2 Pending  ● 1 Cancelled  ● 1 Completed     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CALENDAR GRID (FullCalendar — styled)                         │
│  - Month view: date cells with hover +, today blue badge       │
│  - Week/Day: time grid with business hours subtle tint         │
│  - Events: rounded pill style, patient name + service preview  │
│  - Hover tooltip: MUI Popover with full appointment details    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📋 Detailed Implementation Prompts

---

### PROMPT 1 — Fix Layout Gap & Page Shell

**File:** `CalendarPage.jsx`

```
Replace the outer <Box className="page-enter"> wrapper with:

<Box
  className="page-enter"
  sx={{
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
  }}
>

This removes all double-padding issues. The Layout component already provides
correct px/py padding via its main content Box.
```

---

### PROMPT 2 — Premium Page Header

**File:** `CalendarPage.jsx` — replace the existing `{/* Page header */}` block

```jsx
{/* ── Premium Page Header ─────────────────────────────────────────── */}
<Box
  sx={{
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: { xs: 2, sm: 0 },
    mb: 2.5,
  }}
>
  {/* Left: Title + count */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Box
      sx={{
        width: 42, height: 42, borderRadius: 2.5,
        background: 'linear-gradient(135deg, #E8F0FE 0%, #C5D8FD 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <CalendarMonthRoundedIcon sx={{ color: '#1A73E8', fontSize: '1.35rem' }} />
    </Box>
    <Box>
      <Typography
        variant="h4"
        fontWeight={800}
        sx={{ color: '#202124', fontSize: { xs: '1.35rem', sm: '1.6rem' }, lineHeight: 1 }}
      >
        Calendar
      </Typography>
      <Typography variant="body2" sx={{ color: '#5F6368', mt: 0.25 }}>
        {loading ? 'Loading…' : `${events.length} appointment${events.length !== 1 ? 's' : ''}`}
      </Typography>
    </Box>
    {loading && <CircularProgress size={18} thickness={5} sx={{ color: '#1A73E8', ml: 1 }} />}
  </Box>

  {/* Right: View toggle pills + New Booking CTA */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    {/* View toggle — styled ToggleButtonGroup */}
    <ToggleButtonGroup
      value={currentView}
      exclusive
      onChange={(_, v) => v && calendarRef.current?.getApi().changeView(v)}
      size="small"
      sx={{
        bgcolor: '#F1F3F4',
        borderRadius: '10px',
        p: '3px',
        gap: '2px',
        border: 'none',
        '& .MuiToggleButton-root': {
          border: 'none',
          borderRadius: '8px !important',
          px: 1.5,
          py: 0.6,
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#5F6368',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textTransform: 'none',
          transition: 'all 0.18s ease',
          '&.Mui-selected': {
            bgcolor: '#FFFFFF',
            color: '#1A73E8',
            boxShadow: '0 1px 5px rgba(32,33,36,0.14)',
          },
          '&:hover:not(.Mui-selected)': { bgcolor: '#E8EAED' },
        },
      }}
    >
      <ToggleButton value="dayGridMonth">Month</ToggleButton>
      <ToggleButton value="timeGridWeek">Week</ToggleButton>
      <ToggleButton value="timeGridDay">Day</ToggleButton>
      <ToggleButton value="listWeek">List</ToggleButton>
    </ToggleButtonGroup>

    {/* New Booking CTA */}
    <Button
      variant="contained"
      startIcon={<AddRoundedIcon />}
      onClick={() => navigate('/appointments/new')}
      sx={{
        borderRadius: 2.5,
        px: 2.5,
        py: 0.9,
        fontWeight: 700,
        textTransform: 'none',
        fontSize: '0.875rem',
        background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
        boxShadow: '0 2px 8px rgba(26,115,232,0.30)',
        '&:hover': {
          background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)',
          boxShadow: '0 4px 14px rgba(26,115,232,0.40)',
          transform: 'translateY(-1px)',
        },
        transition: 'all 0.2s ease',
        display: { xs: 'none', sm: 'flex' },
      }}
    >
      New Booking
    </Button>
  </Box>
</Box>
```

**New imports needed:**
```js
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Button from '@mui/material/Button'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
```

**State needed:**
```js
const calendarRef = useRef(null) // pass down to CalendarView as calendarRef prop
const [currentView, setCurrentView] = useState('dayGridMonth')
```

---

### PROMPT 3 — Filter Bar: Chips + Clear Button

**File:** `CalendarPage.jsx` — replace `{/* Filter bar */}` Paper block

```jsx
{/* ── Filter Row ────────────────────────────────────────────────────── */}
<Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 1.5,
    flexWrap: { xs: 'wrap', sm: 'nowrap' },
    overflowX: { sm: 'auto' },
  }}
>
  {/* Clinician select chip */}
  <TextField
    select
    size="small"
    value={filterClinician}
    onChange={(e) => setFilterClinician(e.target.value)}
    sx={{
      minWidth: 150,
      '& .MuiOutlinedInput-root': {
        borderRadius: '20px',
        bgcolor: filterClinician ? '#E8F0FE' : '#F8F9FA',
        '& fieldset': { borderColor: filterClinician ? '#AECBFA' : '#E8EAED' },
        '&:hover fieldset': { borderColor: '#1A73E8' },
        '&.Mui-focused fieldset': { borderColor: '#1A73E8', borderWidth: 1.5 },
      },
      '& .MuiSelect-select': {
        color: filterClinician ? '#1A73E8' : '#5F6368',
        fontWeight: filterClinician ? 700 : 500,
        fontSize: '0.82rem',
        py: '6px',
      },
    }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <PersonRoundedIcon sx={{ fontSize: '0.95rem', color: filterClinician ? '#1A73E8' : '#9AA0A6', mr: -0.5 }} />
        </InputAdornment>
      ),
    }}
  >
    <MenuItem value="">All Clinicians</MenuItem>
    {clinicians.map((c) => <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>)}
  </TextField>

  {/* Clinic select chip */}
  <TextField
    select
    size="small"
    value={filterClinic}
    onChange={(e) => setFilterClinic(e.target.value)}
    sx={{
      minWidth: 140,
      '& .MuiOutlinedInput-root': {
        borderRadius: '20px',
        bgcolor: filterClinic ? '#E8F0FE' : '#F8F9FA',
        '& fieldset': { borderColor: filterClinic ? '#AECBFA' : '#E8EAED' },
        '&:hover fieldset': { borderColor: '#1A73E8' },
        '&.Mui-focused fieldset': { borderColor: '#1A73E8', borderWidth: 1.5 },
      },
      '& .MuiSelect-select': {
        color: filterClinic ? '#1A73E8' : '#5F6368',
        fontWeight: filterClinic ? 700 : 500,
        fontSize: '0.82rem',
        py: '6px',
      },
    }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <LocalHospitalRoundedIcon sx={{ fontSize: '0.95rem', color: filterClinic ? '#1A73E8' : '#9AA0A6', mr: -0.5 }} />
        </InputAdornment>
      ),
    }}
  >
    <MenuItem value="">All Clinics</MenuItem>
    {clinics.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
  </TextField>

  {/* Status select chip */}
  <TextField
    select
    size="small"
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    sx={{
      minWidth: 145,
      '& .MuiOutlinedInput-root': {
        borderRadius: '20px',
        bgcolor: filterStatus ? '#E8F0FE' : '#F8F9FA',
        '& fieldset': { borderColor: filterStatus ? '#AECBFA' : '#E8EAED' },
        '&:hover fieldset': { borderColor: '#1A73E8' },
        '&.Mui-focused fieldset': { borderColor: '#1A73E8', borderWidth: 1.5 },
      },
      '& .MuiSelect-select': {
        color: filterStatus ? '#1A73E8' : '#5F6368',
        fontWeight: filterStatus ? 700 : 500,
        fontSize: '0.82rem',
        py: '6px',
      },
    }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <FiberManualRecordRoundedIcon sx={{ fontSize: '0.70rem', color: STATUS_COLORS[filterStatus] ?? '#9AA0A6', mr: -0.5 }} />
        </InputAdornment>
      ),
    }}
  >
    {STATUS_OPTIONS.map((s) => (
      <MenuItem key={s} value={s}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {s && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[s] }} />}
          {STATUS_LABELS[s]}
        </Box>
      </MenuItem>
    ))}
  </TextField>

  {/* Clear filters */}
  {(filterClinician || filterClinic || filterStatus) && (
    <Chip
      label="Clear"
      size="small"
      icon={<ClearRoundedIcon sx={{ fontSize: '0.8rem !important' }} />}
      onClick={() => { setFilterClinician(''); setFilterClinic(''); setFilterStatus('') }}
      sx={{
        bgcolor: '#FCE8E6', color: '#D93025', fontWeight: 700, fontSize: '0.75rem',
        border: '1px solid #F5C6C2', borderRadius: '20px',
        '&:hover': { bgcolor: '#F5C6C2' },
        '& .MuiChip-icon': { color: '#D93025' },
      }}
    />
  )}

  {/* Spacer + quick stats */}
  <Box sx={{ ml: 'auto', display: { xs: 'none', md: 'flex' }, gap: 1 }}>
    {[
      { label: 'Confirmed', color: '#0F9D58', bg: '#E6F4EA', count: events.filter(e => e.extendedProps?.status === 'confirmed').length },
      { label: 'Pending',   color: '#F9AB00', bg: '#FEF7E0', count: events.filter(e => e.extendedProps?.status === 'pending').length },
      { label: 'Cancelled', color: '#D93025', bg: '#FCE8E6', count: events.filter(e => e.extendedProps?.status === 'cancelled').length },
    ].map(({ label, color, bg, count }) => (
      <Chip
        key={label}
        label={`${count} ${label}`}
        size="small"
        sx={{
          bgcolor: bg, color, fontWeight: 700, fontSize: '0.72rem',
          borderRadius: '20px', border: `1px solid ${color}22`,
        }}
      />
    ))}
  </Box>
</Box>
```

**New imports needed:**
```js
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecord'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded'

// Add STATUS_COLORS map:
const STATUS_COLORS = {
  confirmed: '#0F9D58', pending: '#F9AB00',
  cancelled: '#D93025', completed: '#1A73E8', no_show: '#80868B',
}
```

---

### PROMPT 4 — Calendar Container: Remove Paper Wrapper + Flush Layout

**File:** `CalendarPage.jsx` — replace `{/* Calendar */}` Paper block

```jsx
{/* ── Calendar ─────────────────────────────────────────────────────── */}
<Box
  sx={{
    flex: 1,
    bgcolor: '#FFFFFF',
    borderRadius: 3,
    border: '1px solid #E8EAED',
    overflow: 'hidden',
    minHeight: 0,
    boxShadow: '0 1px 3px rgba(32,33,36,0.06)',
  }}
>
  <CalendarView
    calendarRef={calendarRef}
    events={events}
    onEventClick={handleEventClick}
    onSlotClick={handleSlotClick}
    currentView={currentView}
    onViewChange={setCurrentView}
  />
</Box>
```

*The heavy white Paper with separate `p` padding is removed — FullCalendar renders at full height inside the Box.*

---

### PROMPT 5 — CalendarView: Custom CSS Overrides (new file)

**File:** Create `src/components/Calendar/CalendarView.css`

```css
/* ── Import font ──────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── Base font ────────────────────────────────────────────────────── */
.fc {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
}

/* ── Hide native toolbar (we build our own in React) ─────────────── */
.fc .fc-toolbar {
  padding: 14px 16px 10px;
  align-items: center;
  gap: 8px;
}

/* Navigation buttons (prev/next/today) */
.fc .fc-button {
  background: #F8F9FA !important;
  border: 1px solid #E8EAED !important;
  color: #202124 !important;
  border-radius: 8px !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 600 !important;
  font-size: 0.78rem !important;
  padding: 5px 12px !important;
  text-transform: none !important;
  box-shadow: none !important;
  transition: all 0.15s ease !important;
}

.fc .fc-button:hover {
  background: #E8F0FE !important;
  border-color: #AECBFA !important;
  color: #1A73E8 !important;
}

.fc .fc-button:focus {
  box-shadow: 0 0 0 2px rgba(26,115,232,0.30) !important;
}

/* Today button always blue */
.fc .fc-today-button {
  background: linear-gradient(135deg, #4285F4, #1A73E8) !important;
  border-color: #1A73E8 !important;
  color: #FFFFFF !important;
  font-weight: 700 !important;
}

/* active/selected view button */
.fc .fc-button-active {
  background: #E8F0FE !important;
  border-color: #AECBFA !important;
  color: #1A73E8 !important;
  font-weight: 700 !important;
}

/* Title (month/year text) */
.fc .fc-toolbar-title {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 800 !important;
  font-size: 1.05rem !important;
  color: #202124 !important;
}

/* ── Column headers (SUN / MON …) ─────────────────────────────────── */
.fc .fc-col-header-cell {
  background: #F8F9FA;
  border-bottom: 1px solid #E8EAED !important;
}

.fc .fc-col-header-cell-cushion {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.70rem !important;
  color: #9AA0A6 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  padding: 8px 6px !important;
}

/* ── Day number in month view ─────────────────────────────────────── */
.fc .fc-daygrid-day-number {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 600 !important;
  font-size: 0.82rem !important;
  color: #5F6368 !important;
  padding: 6px 8px !important;
}

/* Today circle highlight */
.fc .fc-day-today .fc-daygrid-day-number {
  background: #1A73E8 !important;
  color: #FFFFFF !important;
  border-radius: 50% !important;
  width: 28px !important;
  height: 28px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 4px !important;
  font-weight: 800 !important;
}

/* Today column background */
.fc .fc-day-today {
  background: rgba(26,115,232,0.04) !important;
}

/* Weekend columns — very subtle tint */
.fc .fc-day-sat,
.fc .fc-day-sun {
  background: rgba(241,243,244,0.6) !important;
}

/* Hover on empty cell */
.fc .fc-daygrid-day:hover,
.fc .fc-timegrid-slot:hover {
  background: rgba(26,115,232,0.04) !important;
  cursor: pointer;
}

/* ── Events ───────────────────────────────────────────────────────── */
.fc .fc-event {
  border-radius: 6px !important;
  border: none !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease !important;
}

.fc .fc-event:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 3px 10px rgba(0,0,0,0.20) !important;
  z-index: 10 !important;
}

/* Time grid events */
.fc .fc-timegrid-event {
  border-radius: 6px !important;
  padding: 2px 4px !important;
}

/* List view rows */
.fc .fc-list-event:hover td {
  background: #F1F8FF !important;
}

.fc .fc-list-event-title a {
  color: #202124 !important;
  font-weight: 600 !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
}

.fc .fc-list-day-text,
.fc .fc-list-day-side-text {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 800 !important;
  color: #1A73E8 !important;
}

/* ── Time grid slot labels ─────────────────────────────────────────── */
.fc .fc-timegrid-slot-label-cushion {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 0.70rem !important;
  color: #9AA0A6 !important;
  font-weight: 600 !important;
}

/* Now indicator line */
.fc .fc-timegrid-now-indicator-line {
  border-color: #D93025 !important;
  border-width: 2px !important;
}

.fc .fc-timegrid-now-indicator-arrow {
  border-top-color: #D93025 !important;
  border-bottom-color: #D93025 !important;
}

/* ── Business hours ───────────────────────────────────────────────── */
.fc .fc-non-business {
  background: rgba(241,243,244,0.5) !important;
}

/* ── Scrollbar ────────────────────────────────────────────────────── */
.fc-scroller::-webkit-scrollbar { width: 6px; height: 6px; }
.fc-scroller::-webkit-scrollbar-thumb { background: #DADCE0; border-radius: 3px; }
.fc-scroller::-webkit-scrollbar-track { background: transparent; }

/* ── More events popover ──────────────────────────────────────────── */
.fc .fc-popover {
  border-radius: 12px !important;
  box-shadow: 0 8px 28px rgba(32,33,36,0.20) !important;
  border: 1px solid #E8EAED !important;
}

.fc .fc-popover-header {
  background: #F8F9FA !important;
  border-radius: 12px 12px 0 0 !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 700 !important;
  color: #202124 !important;
}
```

---

### PROMPT 6 — CalendarView: Accept calendarRef + currentView Props

**File:** `CalendarView.jsx` — update component signature and ref wiring

```jsx
export default function CalendarView({ events, onEventClick, onSlotClick, calendarRef, currentView, onViewChange }) {
  // Use the passed-down calendarRef instead of internal ref
  // Remove internal calendarRef = useRef(null)

  // On view change (FullCalendar native), sync to parent state:
  const handleDatesSet = (dateInfo) => {
    onViewChange?.(dateInfo.view.type)
  }

  return (
    <Box sx={{ height: '100%' }}>
      <FullCalendar
        ref={calendarRef}
        // ... all existing props ...
        datesSet={handleDatesSet}    // add this
        // Remove headerToolbar entirely — we built our own React toolbar
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',   // hide FullCalendar's own view buttons (we use ToggleButtonGroup)
        }}
        height="100%"               // change from "auto" to "100%" to fill container
      />
    </Box>
  )
}
```

---

### PROMPT 7 — EventContent: Richer Event Pill UI

**File:** `CalendarView.jsx` — replace `EventContent` component

```jsx
function EventContent({ eventInfo }) {
  const { extendedProps, title } = eventInfo.event
  const isTimeGrid = eventInfo.view.type.startsWith('timeGrid')
  return (
    <Box sx={{
      px: 0.75, py: isTimeGrid ? 0.5 : 0.25,
      overflow: 'hidden', lineHeight: 1.25,
      display: 'flex', flexDirection: 'column', gap: '1px',
    }}>
      {/* Patient name */}
      <Box component="span" sx={{
        fontWeight: 700, fontSize: isTimeGrid ? 11 : 10,
        color: '#FFFFFF', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        display: 'block',
      }}>
        {title}
      </Box>
      {/* Service — only in time grid views */}
      {isTimeGrid && (
        <Box component="span" sx={{
          fontSize: 10, opacity: 0.88, color: '#FFFFFF',
          whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis', display: 'block',
        }}>
          {extendedProps?.service}
        </Box>
      )}
      {/* Clinician — only in day view */}
      {eventInfo.view.type === 'timeGridDay' && extendedProps?.clinician && (
        <Box component="span" sx={{
          fontSize: 9.5, opacity: 0.80, color: '#FFFFFF',
          whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis', display: 'block',
        }}>
          {extendedProps.clinician}
        </Box>
      )}
    </Box>
  )
}
```

---

### PROMPT 8 — EventTooltip: Premium Glass Card Style

**File:** `src/components/Calendar/EventTooltip.jsx` — update Paper sx

```jsx
<Paper
  elevation={0}
  sx={{
    p: 2,
    minWidth: 220,
    maxWidth: 280,
    borderRadius: 3,
    border: '1px solid rgba(232,234,237,0.8)',
    boxShadow: '0 8px 30px rgba(32,33,36,0.18)',
    backdropFilter: 'blur(8px)',
    bgcolor: 'rgba(255,255,255,0.98)',
  }}
>
  {/* Status badge at top */}
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
    <Chip
      label={data.status?.replace('_', ' ')}
      size="small"
      sx={{
        bgcolor: STATUS_BG_LIGHT[data.status],
        color: STATUS_BG[data.status],
        fontWeight: 800, fontSize: '0.68rem',
        textTransform: 'capitalize',
        borderRadius: '6px', height: 20,
        border: `1px solid ${STATUS_BG[data.status]}33`,
      }}
    />
    <Typography variant="caption" sx={{ color: '#9AA0A6', fontWeight: 600 }}>
      {dayjs(data.start).format('h:mm A')} – {dayjs(data.end).format('h:mm A')}
    </Typography>
  </Box>
  {/* Detail rows */}
  {[
    { icon: <PersonRoundedIcon />, label: data.patient },
    { icon: <MedicalServicesRoundedIcon />, label: data.service },
    { icon: <LocalHospitalRoundedIcon />, label: data.clinician },
    { icon: <RoomRoundedIcon />, label: data.room },
  ].filter(r => r.label).map(({ icon, label }, i) => (
    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
      <Box sx={{ color: '#9AA0A6', display: 'flex', '& svg': { fontSize: '0.9rem' } }}>{icon}</Box>
      <Typography variant="caption" sx={{ color: '#202124', fontWeight: 600, fontSize: '0.78rem' }}>
        {label}
      </Typography>
    </Box>
  ))}
  {/* Click hint */}
  <Typography variant="caption" sx={{ color: '#1A73E8', fontWeight: 700, mt: 1, display: 'block' }}>
    Click to view details →
  </Typography>
</Paper>
```

---

## ✅ Implementation Checklist

- [x] **PROMPT 1** ✅ DONE — Fix layout gap: flex column on outer Box, no double-padding
- [x] **PROMPT 2** ✅ DONE — Premium header: calendar icon + gradient bg, `ToggleButtonGroup` view pills (Month/Week/Day/List), New Booking gradient CTA button
- [x] **PROMPT 3** ✅ DONE — Pill-shaped filter selects (borderRadius:22px, PillSelect helper, left icons, active:blue state) + status count Chips (Confirmed/Pending/Cancelled) on right
- [x] **PROMPT 4** ✅ DONE — Flush calendar container: removed Paper wrapper, clean Box with border + shadow
- [x] **PROMPT 5** ✅ DONE — Created `CalendarView.css` — full FC overrides: Google Blue today circle, uppercase col headers, event hover lift, styled nav/view buttons, custom scrollbar, business hours tint, `+more` popover, list view styles
- [x] **PROMPT 6** ✅ DONE — `CalendarView.jsx` accepts `calendarRef`, `currentView`, `onViewChange`; `datesSet` syncs view; `height="100%"`, `expandRows`, `slotLabelInterval=1hr`; imports `CalendarView.css`
- [x] **PROMPT 7** ✅ DONE — `EventContent`: patient name (all views) + service (week/day) + clinician (day only); per-status background colour; hover lift from CSS
- [x] **PROMPT 8** ✅ DONE — `EventTooltip`: glassmorphism Paper (backdrop-blur:12px), status badge (color-matched bg/border/text), time range, patient bold, detail rows (clinician blue, service green, time yellow, room gray), "Click to view details →" hint

## 🔍 Verified — Build & Screenshot Results (2026-03-13)

- **Build:** `exit 0` · 13,423+ modules · No errors or warnings
- **Desktop screenshot:** Premium header renders correctly, Today = Google Blue circle on 13, weekend cols gray tinted, pill filters visible, no left gap
- **Mobile screenshot:** Layout adapts, functional at 390px


---

## 🎨 Color Reference

| Token | Hex | Usage |
|-------|-----|-------|
| Google Blue | `#1A73E8` | Primary CTA, selected state, today circle |
| Google Blue Light | `#E8F0FE` | Active filter bg, chip bg |
| Google Blue Border | `#AECBFA` | Active filter border |
| Google Green | `#0F9D58` | confirmed events |
| Google Yellow | `#F9AB00` | pending events |
| Google Red | `#D93025` | cancelled / now indicator |
| Google Gray | `#80868B` | no_show events |
| Google Purple | `#9334E6` | rescheduled events |
| Surface | `#F8F9FA` | Column header bg, inactive filter bg |
| Border | `#E8EAED` | All card borders |
| Body text | `#202124` | Primray text |
| Subtle text | `#5F6368` | Secondary labels |
| Muted | `#9AA0A6` | Placeholders, headers |
