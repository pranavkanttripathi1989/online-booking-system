
i need create online docet appoinment booking system platform, Please give me complete color scheme platlet plan

01:00

Architected comprehensive color palette for medical appointment platform
Architected comprehensive color palette for medical appointment platform
Here's a comprehensive color scheme palette designed specifically for a medical/healthcare appointment booking platform — built around trust, clarity, and calm professionalism.



Here's a breakdown of the full system:

Primary — Medical Blue (
#1870A8): The anchor color for all primary actions — booking buttons, navigation, links, and selected states. Blue is the universal language of healthcare: trust, professionalism, and calm.

Accent — Health Teal (
#0F6E56): Paired with blue for energy and vitality. Reserved for confirmed states, availability indicators, and success feedback. It reads as "healthy and active."

Neutral — Slate Gray: The backbone of your layout — surfaces, text hierarchy, borders, and disabled states. Warmer than pure gray, softer than charcoal.

Status palette maps directly to appointment lifecycle states: Teal (confirmed), Amber (pending), Red (cancelled), Purple (rescheduled). Each has a full light-fill + dark-text chip system.

Specialty tags each use a distinct light tint so users can visually scan doctor cards at a glance.

A few key principles baked in: blue + white provides WCAG AA contrast on all text, the teal accent never competes with the primary blue (they occupy different saturation ranges), and the neutral slate keeps the UI from feeling sterile or cold. Want me to turn this into a full design system document, Figma tokens file, or CSS variables sheet?

create txt and html file

01:02

Deciphered request to generate dual-format file outputs
Deciphered request to generate dual-format file outputs
Claude's response was interrupted

doctor_appointment_color_palette.html
216 lines

html

I am using MUI me dash borad already create give me dteail plan promts in txt

01:06

Deciphered request for MUI dashboard appointment booking prompts
Deciphered request for MUI dashboard appointment booking prompts
Claude's response was interrupted
I need color changes plant with cryspy font

01:08

Devised crispy color scheme and font selection for booking system
Devised crispy color scheme and font selection for booking system
Let me show you the new color plan with crispy typography first, then create both files.



Now creating both files:


Created 2 files, read a file
Created 2 files, read a file

Refreshed color scheme and crispy font plan as TXT
docbook-color-font-v2.txt

Refreshed color scheme and crispy font plan as styled HTML
docbook-color-font-v2.html

Presented 2 files
Done
Both files are ready. Here's a quick summary of the v2 changes:

Font — Plus Jakarta Sans is the crispy choice. It's geometric with sharp terminals, excellent at small UI sizes (labels, chips, buttons), and the 700 Bold weight gives CTAs serious punch without feeling heavy.

9 key changes from v1:

Font → Plus Jakarta Sans (crispy, geometric)
Primary blue 
#1870A8 → 
#1565C7 (richer, more saturated)
Accent teal → vibrant emerald 
#0B7B5C
Neutrals → cool blue-slate (Ink & Mist, not warm gray)
Rescheduled purple → vivid violet 
#6C5CE7
Specialty tags → sharp 8px rectangles (not pill shape)
Button text weight → 700 Bold for all CTAs
Sidebar → deep navy 
#0D1B2E (premium dark panel)
Button radius → 10px (slightly softer, modern feel)
Docbook color font v2
Code · HTML 
Docbook color font v2
TXT 




Claude is AI and can make mistakes. Please double-check responses.
Docbook color font v2 · TXT
Copy

================================================================
  DOCBOOK — REFRESHED COLOR SCHEME & CRISPY FONT PLAN
  Online Doctor Appointment Booking Platform
  Design System v2.0
================================================================
 
================================================================
  FONT SELECTION — PLUS JAKARTA SANS (Crispy Choice)
================================================================
 
  Primary Font : Plus Jakarta Sans
  Google Fonts : https://fonts.google.com/specimen/Plus+Jakarta+Sans
  Fallback     : Inter, -apple-system, sans-serif
  Import CDN   : @import url('https://fonts.googleapis.com/css2?
                 family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap')
 
  WHY PLUS JAKARTA SANS?
  - Geometric precision — sharp, clean terminals
  - Excellent legibility at small sizes (11px–13px UI labels)
  - Wide character spacing feels airy and clinical
  - 700 Bold weight is punchy without being heavy
  - Perfect for medical/tech hybrid product identity
 
  FONT WEIGHT SYSTEM:
  ┌─────────────┬────────┬──────────────────────────────────┐
  │ Weight      │ Value  │ Usage                            │
  ├─────────────┼────────┼──────────────────────────────────┤
  │ Regular     │  400   │ Body text, descriptions, notes   │
  │ Medium      │  500   │ Sub-headings, card labels        │
  │ SemiBold    │  600   │ Section headings, nav items      │
  │ Bold        │  700   │ H1/H2, buttons, status labels    │
  └─────────────┴────────┴──────────────────────────────────┘
 
  TYPOGRAPHY SCALE:
  H1  : 32px / 700 / color #0D1B2E  — Page titles
  H2  : 24px / 700 / color #0D1B2E  — Section titles
  H3  : 18px / 600 / color #1A3348  — Card headings
  H4  : 15px / 500 / color #2C4A6E  — Sub-headings
  Body: 14px / 400 / color #3D5A72  — Regular content (line-height 1.7)
  Sm  : 12px / 400 / color #7A96AE  — Secondary/muted text
  Lbl : 11px / 700 / color #8A97A8  — Labels (uppercase, letter-spacing 0.1em)
 
================================================================
  SECTION 1: PRIMARY PALETTE — Deep Ocean Blue
================================================================
 
  Purpose: Sharp authority, confidence, medical trust.
  Used for: Primary CTAs, navigation, links, selected states,
            brand identity, focus rings.
 
  Blue 50  : #EEF4FF  — hover backgrounds, lightest tint
  Blue 100 : #C5D8FA  — light fills, borders on light bg
  Blue 200 : #87B0F4  — mid-light tint
  Blue 400 : #3D82EE  — medium interactive tone
  Blue 600 : #1565C7  *** PRIMARY BRAND COLOR ***
  Blue 800 : #0D4496  — dark pressed/active state
  Blue 900 : #072B65  — deepest, hover text on light fills
 
  CHANGE FROM v1:
  Old Primary #1870A8 → New Primary #1565C7
  Richer, more saturated blue — crisper on screen
 
----------------------------------------------------------------
 
================================================================
  SECTION 2: ACCENT PALETTE — Emerald Health
================================================================
 
  Purpose: Vibrant vitality, fresh energy, wellness signal.
  Used for: Confirmed bookings, available slots, success states,
            availability indicators, positive actions.
 
  Emerald 50  : #E5F8F2  — lightest chip fill
  Emerald 100 : #8FE0CA  — light borders
  Emerald 300 : #2DC49A  — mid accent
  Emerald 500 : #0B9970  — standard accent tone
  Emerald 700 : #0B7B5C  *** ACCENT BRAND COLOR ***
  Emerald 900 : #075240  — dark text on light fills
 
  CHANGE FROM v1:
  Old Teal #0F6E56 → New Emerald #0B7B5C
  More vibrant, punchy green-teal — pops on white cards
 
----------------------------------------------------------------
 
================================================================
  SECTION 3: NEUTRAL PALETTE — Ink & Mist
================================================================
 
  Purpose: Surfaces, text hierarchy, borders, disabled states.
  Cooler blue-tinted neutrals — pairs crisply with ocean blue.
 
  Ink 50  : #F5F7FA  — page background canvas
  Ink 100 : #E2E8F0  — card surfaces, dividers
  Ink 300 : #B8C6D4  — borders, disabled fills
  Ink 500 : #7A96AE  — placeholder text, icons
  Ink 700 : #3D5A72  — secondary body text
  Ink 900 : #1A3348  — primary body text
  Ink 950 : #0D1B2E  — darkest, max contrast headings
 
  CHANGE FROM v1:
  Old warm gray → New cool blue-tinted slate
  Pairs much better with the Deep Ocean Blue primary
 
----------------------------------------------------------------
 
================================================================
  SECTION 4: STATUS & SEMANTIC COLORS — UPDATED
================================================================
 
  CONFIRMED
    Background : #E5F8F2
    Text       : #075240
    Dot/Icon   : #0B9970
    Border     : #8FE0CA
    Chip label : "Confirmed"
 
  PENDING
    Background : #FFF7E6
    Text       : #7A4200
    Dot/Icon   : #F5A623
    Border     : #FDDBA0
    Chip label : "Pending"
 
  CANCELLED
    Background : #FEF0F0
    Text       : #7A1A1A
    Dot/Icon   : #E53535
    Border     : #F9C0C0
    Chip label : "Cancelled"
 
  RESCHEDULED
    Background : #F0EFFE
    Text       : #3528A0
    Dot/Icon   : #6C5CE7
    Border     : #C5BFFA
    Chip label : "Rescheduled"
 
  CHANGE FROM v1:
  - Purple upgraded to #6C5CE7 (vivid violet, more distinct)
  - Amber updated to #F5A623 (warmer, more readable)
  - Red sharpened to #E53535 (brighter alert signal)
 
----------------------------------------------------------------
 
================================================================
  SECTION 5: SPECIALTY TAG COLORS — UPDATED
================================================================
 
  General Practice : bg #EEF4FF  / text #0D4496
  Cardiology       : bg #E5F8F2  / text #075240
  Neurology        : bg #F0EFFE  / text #3528A0
  Dermatology      : bg #FFF7E6  / text #7A4200
  Emergency        : bg #FEF0F0  / text #7A1A1A
  Pediatrics       : bg #FFF0F6  / text #7A1040
  Orthopedics      : bg #EDFAF2  / text #1A5E36
  Ophthalmology    : bg #F5F7FA  / text #1A3348
  Endocrinology    : bg #EEF4FF  / text #072B65
  Psychiatry       : bg #F0EFFE  / text #3528A0
 
  STYLE CHANGE v1 → v2:
  - Border-radius: 20px (pill) → 8px (sharp rectangle)
  - Font-weight: 500 → 700 (bolder, crispier reading)
  - Slightly more saturated fills for higher contrast
 
----------------------------------------------------------------
 
================================================================
  SECTION 6: BUTTON SYSTEM — UPDATED
================================================================
 
  PRIMARY
    Background : #1565C7
    Text       : #FFFFFF
    Hover bg   : #0D4496
    Border     : none
    Radius     : 10px
    Weight     : 700
 
  SUCCESS / CONFIRM
    Background : #0B9970
    Text       : #FFFFFF
    Hover bg   : #0B7B5C
    Border     : none
    Radius     : 10px
    Weight     : 700
 
  GHOST / OUTLINE
    Background : #EEF4FF
    Text       : #1565C7
    Border     : 1.5px solid #C5D8FA
    Hover bg   : #C5D8FA
    Radius     : 10px
    Weight     : 600
 
  DANGER
    Background : #FEF0F0
    Text       : #E53535
    Border     : 1.5px solid #F9C0C0
    Hover bg   : #F9C0C0
    Radius     : 10px
    Weight     : 600
 
  DISABLED
    Background : #F5F7FA
    Text       : #B8C6D4
    Border     : 1.5px solid #E2E8F0
    Radius     : 10px
    Weight     : 400
 
  CHANGE v1 → v2:
  - Border-radius increased to 10px (from 8px) — crispier feel
  - All button text weight increased to 700 for primary actions
  - Ghost button uses colored bg instead of pure white
 
----------------------------------------------------------------
 
================================================================
  SECTION 7: TIME SLOT PICKER — UPDATED STYLES
================================================================
 
  Selected slot   : bg #1565C7 / text #fff    / border #1565C7
  Available slot  : bg #EEF4FF / text #1565C7 / border #C5D8FA
  Open slot       : bg #F5F7FA / text #7A96AE / border #E2E8F0
  Taken/full slot : bg #F5F7FA / text #B8C6D4 / border #E2E8F0
                    + text-decoration: line-through
 
  Slot grid layout: 4 columns
  Slot height: 38px, border-radius: 8px, font-weight: 600
 
----------------------------------------------------------------
 
================================================================
  SECTION 8: SURFACE & BACKGROUND — UPDATED
================================================================
 
  Page canvas     : #F5F7FA  (cooler Ink 50 — blue-gray base)
  Card surface    : #FFFFFF  + border #E2E8F0 (1px)
  Input field     : #FFFFFF  + border #B8C6D4
  Input (focus)   : border #1565C7 + ring rgba(21,101,199,0.15)
  Divider lines   : #E2E8F0  (1px)
  Modal overlay   : rgba(13, 27, 46, 0.50)
  Sidebar bg      : #0D1B2E  (Ink 950 — deep dark navy)
  Sidebar text    : #B8C6D4
  Active nav item : #1565C7 bg + #fff text
 
  CHANGE v1 → v2:
  - Page bg shifted from warm gray to cool blue-gray
  - Sidebar gets deep navy (#0D1B2E) — premium, clinical
  - Card borders tightened to #E2E8F0 for crispier separation
 
----------------------------------------------------------------
 
================================================================
  SECTION 9: MUI THEME CONFIG TOKENS
================================================================
 
  theme.palette.primary.main     : #1565C7
  theme.palette.primary.light    : #3D82EE
  theme.palette.primary.dark     : #0D4496
  theme.palette.secondary.main   : #0B9970
  theme.palette.secondary.light  : #2DC49A
  theme.palette.secondary.dark   : #0B7B5C
  theme.palette.error.main       : #E53535
  theme.palette.warning.main     : #F5A623
  theme.palette.success.main     : #0B9970
  theme.palette.background.default: #F5F7FA
  theme.palette.background.paper : #FFFFFF
  theme.palette.text.primary     : #0D1B2E
  theme.palette.text.secondary   : #3D5A72
 
  theme.typography.fontFamily    : 'Plus Jakarta Sans', sans-serif
  theme.typography.h1.fontWeight : 700
  theme.typography.h2.fontWeight : 700
  theme.typography.h3.fontWeight : 600
  theme.shape.borderRadius       : 10
 
================================================================
  WHAT CHANGED FROM v1 TO v2 — SUMMARY
================================================================
 
  1. FONT: System font → Plus Jakarta Sans (crispy, geometric)
  2. PRIMARY BLUE: #1870A8 → #1565C7 (richer, more saturated)
  3. ACCENT: Soft teal → Vibrant emerald (#0B7B5C)
  4. NEUTRALS: Warm gray → Cool blue-slate (Ink & Mist)
  5. VIOLET: Purple #7E77DD → Vivid #6C5CE7 (rescheduled state)
  6. TAGS: Pill shape → Sharp 8px radius rectangles
  7. BUTTONS: bolder (700 weight), 10px radius
  8. SIDEBAR: White → Deep navy #0D1B2E (premium feel)
  9. PAGE BG: Warm #F4F6F8 → Cool #F5F7FA (blue-tinted)
 
================================================================
  DocBook Color & Font System v2.0 — Crispy Edition
================================================================
 


# MediBook — Complete Feature Plan
> **Reference Demo:** https://meduxtemplate.merku.love/dashboard_a  
> **Version:** 2.0 · **Date:** March 2026  
> **Purpose:** Comprehensive feature specification covering every screen, component, and interaction to be implemented in MediBook.

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Global Layout & Shell](#2-global-layout--shell)
3. [Dashboard (Overview)](#3-dashboard-overview)
4. [Appointments](#4-appointments)
5. [Calendar / Scheduler](#5-calendar--scheduler)
6. [Patients](#6-patients)
7. [Doctors / Clinicians](#7-doctors--clinicians)
8. [Medical Test Results](#8-medical-test-results)
9. [Staff Management](#9-staff-management)
10. [Messenger / Chat](#10-messenger--chat)
11. [Reviews & Feedback](#11-reviews--feedback)
12. [Finances](#12-finances)
13. [Settings & Profile](#13-settings--profile)
14. [Notifications System](#14-notifications-system)
15. [Accessibility & Theme](#15-accessibility--theme)
16. [Mobile & Responsive Behavior](#16-mobile--responsive-behavior)
17. [Authentication](#17-authentication)
18. [Error Pages](#18-error-pages)
19. [Full Implementation Checklist](#19-full-implementation-checklist)

---

## 1. Design System

### 1.1 Color Palette

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `primary` | `#2563EB` | `#3B82F6` | Active states, buttons, links |
| `primary-soft` | `#EFF6FF` | `#1E3A5F` | Active nav bg, chip fills |
| `background` | `#F5F7FB` | `#121212` | Page background |
| `surface` | `#FFFFFF` | `#1E1E1E` | Card / panel backgrounds |
| `surface-alt` | `#F8FAFC` | `#2A2A2A` | Table rows, input bg |
| `text-primary` | `#0F172A` | `#F1F5F9` | Headings, main text |
| `text-secondary` | `#64748B` | `#94A3B8` | Labels, captions |
| `border` | `#E2E8F0` | `#334155` | Card borders, dividers |
| `success` | `#059669` | `#34D399` | Confirmed, income |
| `warning` | `#D97706` | `#FBBF24` | Pending, caution |
| `error` | `#DC2626` | `#F87171` | Cancelled, expenses |
| `emergency` | `#EF4444` | `#F87171` | Emergency button |

### 1.2 Typography

| Element | Size | Weight | Use |
|---------|------|--------|-----|
| Page Heading | 1.5rem | 800 | Page titles |
| Section Title | 1.125rem | 700 | Card/widget titles |
| Body | 0.9375rem | 400 | General content |
| Label | 0.8125rem | 600 | Table headers, form labels |
| Caption | 0.75rem | 500 | Metadata, timestamps |
| Badge | 0.65rem | 700 | Status chips, counts |

**Font:** `Inter` (Google Fonts) — the entire application uses Inter for all text.

### 1.3 Spacing & Shape

- **Base unit:** 8px
- **Card border-radius:** 16px
- **Button border-radius:** 10px
- **Input border-radius:** 10px
- **Chip border-radius:** 8px
- **Inner spacing (cards):** 24px padding

### 1.4 Elevation / Shadow System

| Level | Shadow | Use |
|-------|--------|-----|
| 0 | `none` | Flat elements |
| 1 | `0 1px 4px rgba(0,0,0,0.05)` | Cards (resting) |
| 2 | `0 4px 16px rgba(0,0,0,0.08)` | Cards (hover) |
| 3 | `0 8px 32px rgba(0,0,0,0.12)` | Modals, dropdowns |
| 4 | `0 20px 60px rgba(0,0,0,0.18)` | Overlays |

---

## 2. Global Layout & Shell

### 2.1 Sidebar Navigation

**Desktop (md+):**  
- Fixed, permanent drawer — **256px** wide  
- Light theme: `#F8FAFC` background, `#E2E8F0` right border  
- Dark theme: `#1A1A2E` background

**Logo Area (64px tall):**
- Brand icon (medical cross / heart) in gradient blue pill
- App name: `Medi<blue>Book</blue>`
- Sub-label: clinic speciality or role

**Emergency Button (top of nav):**
- Red pill button — `🚨 Emergency`
- Triggers `tel:911` on click
- Always visible, pulsing animation

**Navigation Items (with role-based visibility):**
```
📊 Dashboard               [all roles]
   ├─ Overview
   └─ Analytics
📅 Calendar                [all roles]
📋 Appointments            [all roles]
   ├─ Patient Appointments
   └─ Doctor Appointments
👥 Patients                [admin, receptionist, clinician]
   ├─ Patients List
   └─ Medical Test Results
👨‍⚕️ Doctors / Clinicians    [admin, super_admin]
   ├─ Doctors List
   └─ Medical Staff
💬 Messages                [all roles]
   ├─ Doctor Messenger
   └─ Patient Messenger
⭐ Reviews                 [admin, super_admin]
💰 Finances                [admin, super_admin]
⚙️ Settings                [all roles — filtered content]
```

**Active Item Style:**
- Background: `#EFF6FF` (light) / `#1E3A5F` (dark)
- Text & icon: `#2563EB`
- Left accent bar: 3px solid `#2563EB`
- Hover: `#F1F5F9` background

**User Footer (bottom of sidebar):**
- Avatar with gradient + online indicator dot
- Display name (truncated) + role chip
- Logout button (shows on hover)

### 2.2 Top Navbar

**Height:** 64px  
**Background:** White / dark surface with bottom border  

**Left section:**
- Hamburger (mobile only)
- Page title (h6, bold)

**Center section (sm+):**
- Global search bar — placeholder: "Search patients, appointments…"  
- Focus: blue border + box-shadow glow

**Right section:**
- Search icon (mobile only)
- 🔔 Notification bell — red dot badge with unread count
- Vertical divider
- User avatar with gradient + online indicator
- Click → profile dropdown menu

**Profile Dropdown:**
- User info header (avatar, name, email)
- "Profile" link → `/settings/profile`
- "Settings" link → `/settings`
- Divider
- "Logout" (red text + icon)

### 2.3 Breadcrumbs

- Below navbar, above page content
- Format: `Dashboard > Patients > John Doe`
- Last item: non-clickable, bold
- Home icon on first item

### 2.4 Content Area

- Background: `#F5F7FB`
- Max-width: `1440px`, centered
- Padding: `24px` desktop, `16px` mobile
- All pages get `class="page-enter"` fade-in animation (200ms)

---

## 3. Dashboard (Overview)

### 3.1 Header Bar

- Personalized greeting: `"Good morning, Dr. Jane! 👋"`
- Current date: `"Thursday, March 13, 2026"`
- Quick action button: `➕ New Booking` (top-right)

### 3.2 KPI Cards (Top Row)

4-column grid (`xs=12 sm=6 md=3`):

| Card | Metric | Icon | Color | Trend |
|------|--------|------|-------|-------|
| Appointments Today | Count | Calendar | Blue | vs yesterday |
| Total Clinicians | Count | Stethoscope | Green | vs last month |
| Total Patients | Count | People | Purple | vs last month |
| Revenue This Month | `$` amount | Money | Amber | vs last month |

**Card anatomy:**
- Icon pill (soft color bg, 10% opacity)
- Trend badge: `↑ 12.5%` (green) / `↓ 3.2%` (red) top-right
- Bold value (h4, 800 weight)
- Label below value (caption, muted)
- Hover: `translateY(-3px)` + elevated shadow

**Next Patient Card (special):**
- Patient photo / avatar
- Name + appointment type
- Scheduled time countdown: `"In 15 minutes"`
- `📞 Call` button and `💬 Message` button

### 3.3 Charts Area

**Row 1 (8/4 split on desktop, stacked on mobile):**

**Left — "Overall Appointments" (Stacked Bar Chart):**
- X-axis: Hours of the day (8:00 → 18:00)
- Y-axis: Number of appointments
- Bars stacked by: Confirmed / Pending / Cancelled
- Filter tabs: `Week | Month | Year`
- Interactive tooltips on hover
- Legend below chart

**Right — "Diagnoses Doughnut" (Pie/Doughnut Chart):**
- Segments: by service/diagnosis type (e.g. Cold, Fracture, Consultation, etc.)
- Center label: total count
- Legend with color swatches + labels
- Interactive click to highlight segment

**Row 2 (Full width):**

**"Patients Pace" (Multi-line Chart):**
- Lines: `New Patients` vs `Returning Patients`
- X-axis: last 7/30/90 days
- Y-axis: patient count
- Gradient fill under lines
- Filter: `Week | Month | Year`
- Smooth curves with dot data points

**Row 3 (Full width):**

**"Confirmed Diagnoses" (Horizontal Progress Bars):**
- Each bar = diagnosis category (Cold, Fracture, Concussion, etc.)
- Bar color: unique per category
- Label on left, percentage on right
- Filter: `Year | Month | Week`

### 3.4 Right Sidebar Widget — "Upcoming Appointments"

- Scrollable list of next 5 appointments
- Each item:
  - Patient avatar + name
  - Service type
  - Time (e.g., `"2:30 PM"`)
  - Revenue amount (`"$120"`)
  - Status chip (Confirmed / Pending)
- "View all →" link to appointments page

### 3.5 "Recent Questions / Messages" Widget

- Tab bar: `All | Unread | New`
- Each item: avatar, name, message preview, timestamp
- Red dot on unread items
- "Reply" button on hover
- "View all →" link to messenger

### 3.6 "Clinician Utilisation" Bar Chart

- Horizontal or vertical grouped bar chart
- X or Y axis: Clinician names
- Bars: booked hours vs available hours
- Color: blue (booked), light gray (available)

---

## 4. Appointments

### 4.1 Patient Appointments Page

**Filter / Search Bar:**
- 🔍 Text search (by patient name, ID, or service)
- 📅 Date range picker (start → end date)
- 🏷️ Status multi-select filter: `Pending | Confirmed | Cancelled | Completed | No-Show`
- 👨‍⚕️ Clinician filter dropdown
- 🔄 Reset filters button
- ➕ "New Appointment" button (top-right)

**Table Columns:**
| Column | Content |
|--------|---------|
| Patient | Avatar + Name + ID |
| Clinician | Avatar + Name + Specialty |
| Service | Service name |
| Date & Time | Formatted date + time |
| Duration | e.g. "30 min" |
| Status | Colored chip: Pending/Confirmed/Cancelled/Completed/No-Show |
| Revenue | `$120.00` |
| Actions | View 👁 · Edit ✏️ · Cancel ✕ |

**Table Features:**
- Sortable columns (click header to sort asc/desc)
- Row click → appointment detail drawer/modal
- Checkbox multi-select for bulk actions
- Bulk actions: Cancel Selected / Export Selected
- Pagination: 10/25/50 rows per page selector
- Row hover highlight
- Empty state: illustration + "No appointments found" + CTA

**Mobile view:** Card-based list instead of table (each card shows key info + action buttons)

### 4.2 Doctor Appointments Page

Same as Patient Appointments but from clinician's perspective:
- Primary column: Doctor name (first)
- Shows clinician's schedule for the day/week
- "My Schedule" vs "All Doctors" toggle

### 4.3 Appointment Detail Drawer / Modal

Opens on row click or "View" action:
- Patient info: photo, name, DOB, phone, email
- Appointment info: date, time, duration, service, clinician
- Status with dropdown to change status
- Notes / reason for visit (text area)
- History: previous visits by this patient
- Action buttons: Edit · Reschedule · Cancel · Mark Complete
- Close button (×) top-right

### 4.4 New / Edit Appointment Form

Full-page or modal form:

**Fields:**
- Patient — searchable autocomplete (by name or ID)
- Clinician — searchable dropdown (with specialty shown)
- Service / Appointment type — dropdown
- Date — date picker
- Time — time picker (shows available slots)
- Duration — auto-filled from service, editable
- Notes — textarea
- Notify patient? — toggle (SMS/email)

**Validation:** all required fields, time slot conflict check  
**Submit:** "Save Appointment" / "Update Appointment"  
**Cancel:** returns to list

---

## 5. Calendar / Scheduler

### 5.1 Toolbar

- `◀ Prev` / `▶ Next` navigation
- `Today` button (highlighted badge)
- Current period label: `"March 2026"`
- View switcher: `Day | Week | Month` tabs

### 5.2 Calendar Grid

**Month view:**
- Full grid with all days
- Appointment chips (truncated title, color by status)
- `+N more` overflow chips (click to expand)

**Week view:**
- 7-column time grid (hourly rows, 8:00–20:00)
- Appointment blocks are draggable (future feature)
- Color-coded by appointment type:
  - 🔵 Consultation: Blue
  - 🟢 MRI/Lab/USG: Teal
  - 🟠 Minor/Urgent: Orange
  - ⚪ No-show: Gray

**Day view:**
- Single-day time grid
- Each slot shows full appointment detail
- Empty slots are clickable to create new appointment

### 5.3 Event Tooltip (on hover)

- Patient name + photo
- Appointment type
- Time period
- Clinician name
- Status chip

### 5.4 Sidebar Mini-Calendar

- Compact month picker on the right
- Click date to jump to that day

---

## 6. Patients

### 6.1 Patients List Page

**Header:**
- Page title + total count badge
- ➕ "Add Patient" button

**Search & Filter Bar:**
- 🔍 Name / ID / phone search
- 🔤 **A–Z alphabet index** (horizontal scrollable row of letters — click to jump to that letter group)
- 👫 Gender tabs: `All | Male | Female`
- 🏷️ Status filter: `Active | Inactive | New`

**Patient Cards / Grid:**
- Photo / avatar (large, rounded)
- Full name (bold)
- Age & gender
- Patient ID
- Last visit date
- Primary clinician
- Quick action buttons:
  - `📋 Case History` — opens history panel
  - `💬 Message` — opens messenger for this patient
  - `📞 Call` — `tel:` link

**Alternate Table View (toggle button):**
| Column | Content |
|--------|---------|
| Patient | Avatar + Name + ID |
| Age / Gender | `34, Male` |
| Phone | Formatted phone number |
| Email | Email address |
| Last Visit | Date |
| Status | Active / Inactive chip |
| Actions | View · Edit · Delete |

**Pagination:** standard, rows-per-page selector

### 6.2 Patient Detail Page

Accessed by clicking a patient card or row:

**Header:**
- Large avatar + upload button
- Full name, ID, status chip
- Quick stats: Total Visits · Last Visit · Outstanding Balance
- Action buttons: Edit · Message · New Appointment

**Tabs:**

**Overview Tab:**
- Personal info: Name, DOB, Gender, Blood type, Allergies
- Contact: Phone, Email, Emergency contact
- Address: Full address

**Medical History Tab:**
- Timeline of all past visits (date, clinician, diagnosis, notes)
- Each entry expandable to see full notes

**Appointments Tab:**
- All past & upcoming appointments table (same columns as Appointments page)
- Filter by date range

**Test Results Tab:**
- List of all lab/diagnostic tests
- Each item: test name, date, status, "View result" button

**Documents Tab:**
- Uploaded files (PDFs, images)
- Upload button

### 6.3 Add / Edit Patient Form

**Fields:**
- Profile photo upload (drag & drop)
- First name · Last name
- Date of birth
- Gender (radio: Male / Female / Other)
- Blood type (dropdown)
- Allergies (tag input)
- Phone number
- Email address
- Emergency contact name + phone
- Address: Street, City, State, ZIP, Country
- Notes

---

## 7. Doctors / Clinicians

### 7.1 Doctors List Page

**Filter Bar:**
- 🔍 Name search
- 🏥 Department / Specialty filter (Family Doctors, Therapists, Surgeons, etc.)
- ⭐ Rating filter (1–5 stars)
- Availability toggle: `Available Now | All`

**Doctor Cards:**
- Professional photo / avatar
- Full name + title (Dr.)
- Specialty badge
- Department
- ⭐ Star rating (`4.8 / 5.0`)
- Available appointment slots: visual progress bar (`18 / 30 booked`)
- Languages spoken (flag icons or text)
- Action buttons:
  - `📅 Make an Appointment` (primary CTA)
  - `💬 Message`
  - `👁 View Profile`

### 7.2 Doctor Detail / Profile Page

- Large photo + name + specialty + rating
- Quick stats: Total Patients · Years Experience · Appointments This Week
- Bio / Description text area
- Availability schedule (weekly grid showing available hours)
- Tabs:
  - Appointments
  - Patients
  - Reviews
  - Documents

### 7.3 Add / Edit Doctor Form

**Fields:**
- Profile photo upload
- Full name (First + Last)
- Title (Dr., Prof., etc.)
- Specialty / Clinician type (dropdown)
- Department (dropdown)
- License number
- Years of experience
- Languages spoken (multi-select)
- Bio / Description (textarea)
- Email + Phone
- Consultation fee (`$`)
- Weekly schedule builder (grid: days × time slots, toggle availability)
- Notes

---

## 8. Medical Test Results

### 8.1 Test Results List Page

**Search & Filter:**
- 🔍 Search by patient name, test name, or ID
- 🧪 Test type filter (Blood test, MRI, X-Ray, DNA, Urine, etc.)
- 📅 Date range filter
- 🏷️ Status filter: `Pending | Processing | Completed`

**Results List:**
Each card/row:
- Test icon (🧬 / 🩺 / 🧪)
- Test name (e.g., "DNA Testing", "Complete Blood Count")
- Patient name + ID (linked)
- Doctor ordered by
- Date ordered
- Date completed (or "Pending")
- Status chip
- `👁 View Result` button

### 8.2 Test Result Detail

- Test name + patient name
- Ordered by doctor + date
- Result data (table of values with reference ranges)
- Interpretation / notes from doctor
- Raw file download (PDF)
- Status badge

---

## 9. Staff Management

### 9.1 Staff List Page

**Filter:** Department · Role · Active/Inactive  
**Search:** Name or staff ID

**Staff Table:**
| Column | Content |
|--------|---------|
| Staff | Avatar + Name |
| Role | Receptionist / Admin / Nurse / etc. |
| Department | |
| Phone | |
| Email | |
| Status | Active / On-leave chip |
| Actions | View · Edit · Deactivate |

### 9.2 Add / Edit Staff Form

**Fields:**
- Photo upload
- Full name · Role (dropdown) · Department (dropdown)
- Phone · Email · Date of birth
- Address
- Employment start date
- Access level / permissions

---

## 10. Messenger / Chat

### 10.1 Layout

**Dual-pane layout:**
- **Left pane (320px):** Contact list
- **Right pane (flex):** Active conversation

### 10.2 Left Pane — Contact List

- 🔍 Search conversations by name or keyword
- Section dividers: `Active | Recent | All`
- Each contact row:
  - Avatar + online indicator (green dot / grey dot)
  - Name (bold if unread)
  - Message preview (truncated, 1 line)
  - Timestamp (relative: "2m ago", "Yesterday")
  - Unread count badge (blue pill)

**Two tabs:** `Doctor Messenger` | `Patient Messenger`

### 10.3 Right Pane — Active Conversation

**Thread header:**
- Avatar + name + online status + role chip
- `📞 Call` · `📹 Video` · `ℹ️ Info` icon buttons

**Message bubbles:**
- Sent (right, blue bg): message text + timestamp
- Received (left, gray bg / white bg): message text + timestamp
- Avatar shown next to received messages
- Typing indicator (`…` animation) when other party is typing
- Date separators (`Today`, `Yesterday`, `March 12`)

**Message types supported:**
- Text
- Image (inline preview with lightbox on click)
- Audio message (waveform player)
- File attachment (icon + filename + download button)

**Input area:**
- Multi-line text input
- Attachment button (📎) — opens file/image picker
- Emoji button (😊)
- Audio record button (🎤)
- Send button (→) — active only when input not empty

### 10.4 Features

- Real-time updates (polling or WebSocket)
- Unread count badge on sidebar nav item
- Message read receipts (double tick ✓✓)
- Notification on new message (browser notification API)

---

## 11. Reviews & Feedback

### 11.1 Reviews List Page

**Stats Header:**
- Average rating: `4.7 / 5.0` (large star display)
- Rating breakdown: 5⭐ `65%` · 4⭐ `20%` · 3⭐ `10%` · 2⭐ `3%` · 1⭐ `2%` (horizontal bar chart)
- Total reviews count

**Filter Bar:**
- ⭐ Star filter (1–5)
- 📅 Date range
- 👨‍⚕️ Clinician filter
- 🔍 Text search in review content

**Review Cards:**
- Patient avatar + name
- ⭐ Star rating (1–5)
- Review text
- Clinician name reviewed
- Date
- Status chip: `Published | Pending Moderation | Hidden`
- Action buttons: `✅ Approve` · `🚫 Hide` · `🗑️ Delete`

### 11.2 Review Detail / Moderation

- Full review text
- Patient profile link
- Doctor profile link
- Approve / Hide / Delete actions
- Admin notes field (internal only)

---

## 12. Finances

### 12.1 Balance Overview

**Cards (top row):**
- 💳 **Active Balance** — current spendable balance + "Refill" button
- 🎁 **Bonus Balance** — loyalty/bonus points + earned this month
- 📈 **Revenue This Month** — total income (bar trend)
- 💸 **Total Expenses** — total outgoing (bar trend)

### 12.2 Payment History

**Filter:**
- 📅 Date range
- 🏷️ Type: `All | Income | Expense`
- Patient / Clinician filter
- Export to CSV / PDF button

**Transactions Table:**
| Column | Content |
|--------|---------|
| # | Transaction ID |
| Patient | Avatar + Name |
| Service | Appointment or service name |
| Date | Formatted date |
| Type | Income / Expense chip |
| Amount | Green `+$120.00` or Red `-$40.00` |
| Method | Credit Card / Cash / Insurance |
| Status | Paid / Pending / Failed chip |
| Actions | View receipt · Refund |

### 12.3 Payment Methods Management

**Tabs:** `Active Cards | Archived`

**Card items:**
- Card brand icon (Visa, Mastercard, Amex)
- Last 4 digits: `**** **** **** 4521`
- Expiry date
- Card holder name
- Default badge (if default)
- `✏️ Edit` · `⭐ Set Default` · `🗑️ Remove`

**Add Card button:**
- Modal form: Card number · Expiry · CVV · Name on card

### 12.4 Revenue Analytics

- Monthly revenue bar chart (last 12 months)
- Breakdown by service type (pie chart)
- Top-earning clinicians table
- Outstanding invoices list

---

## 13. Settings & Profile

### 13.1 Page Tabs

Tabbed layout:
1. **Profile** — personal information
2. **Account** — email, password, 2FA
3. **Notifications** — preferences per channel
4. **Appearance** — theme, font size
5. **Clinic** — (admin only) clinic info, branding

### 13.2 Profile Tab

**Left column:**
- Profile photo (with upload dropzone — click or drag & drop)
- Change photo / Remove photo buttons
- Preview circle

**Right column (form):**
- First name · Last name
- Date of birth
- Gender
- Nationality
- Occupation / Role
- Phone number
- Email (read-only, change via Account tab)
- Website / LinkedIn (optional)
- About / Bio (textarea)

**Address section:**
- Street address
- City · State/Province
- ZIP / Postal code
- Country (dropdown with flags)

**Save button** — sticky at bottom, disabled until changes made

### 13.3 Account Tab

- **Email address** — current email + "Change email" button (opens verification flow)
- **Password** — current password · new password · confirm new password fields
- **Two-Factor Authentication (2FA)** — toggle + QR code setup
- **Active Sessions** — list of devices with location, browser, last seen + "Revoke" button
- **Danger Zone** — "Deactivate Account" (requires password confirmation)

### 13.4 Notifications Tab

**Toggle switches per category:**
| Notification | Email | SMS | In-App |
|-------------|-------|-----|--------|
| New appointment booked | ✅ | ✅ | ✅ |
| Appointment reminder (24h before) | ✅ | ✅ | ✅ |
| Appointment cancelled | ✅ | ⬜ | ✅ |
| New message received | ⬜ | ⬜ | ✅ |
| New review posted | ✅ | ⬜ | ✅ |
| Payment received | ✅ | ✅ | ✅ |
| System announcements | ✅ | ⬜ | ✅ |

### 13.5 Appearance Tab

- **Theme:** Light / Dark / System (radio or toggle)
- **Font size:** Slider (Small, Normal, Large, Extra Large)
- **Color accent:** Primary color picker (preset swatches)
- **Language:** Dropdown (EN, AR, FR, etc.)
- **RTL layout:** Toggle (for Arabic/Hebrew)
- **Compact mode:** Toggle (reduces padding/spacing)

### 13.6 Clinic Settings Tab (Admin only)

- Clinic name
- Clinic logo upload
- Address
- Contact phone + email
- Working hours (per day grid)
- Appointment slot duration default
- Currency preference
- Timezone

---

## 14. Notifications System

### 14.1 Notification Bell (Navbar)

- Red dot badge = unread count
- Click → slide-in panel from right (or dropdown)

### 14.2 Notification Panel

- Title: "Notifications" + "Mark all read" button
- Filter tabs: `All | Unread | Appointments | Messages`
- List of notifications:
  - Icon (🗓 🧾 💬 ⭐ etc.)
  - Short message text (e.g. "Dr. Smith confirmed your 3:00 PM appointment")
  - Timestamp (relative)
  - Unread = highlighted bg + bold text
  - Click → navigate to relevant page
  - Swipe/hover: "Dismiss" ×

### 14.3 Notification Types

| Type | Trigger | Icon |
|------|---------|------|
| New appointment | Someone booked | 🗓️ |
| Appointment reminder | 24h / 1h before | ⏰ |
| Status change | Confirmed/Cancelled | 📋 |
| New message | Received chat message | 💬 |
| New review | Review submitted | ⭐ |
| Payment | Transaction processed | 💳 |
| Test result | Lab result ready | 🧪 |
| System | Platform announcements | 🔔 |

---

## 15. Accessibility & Theme

### 15.1 Global Accessibility Bar

A floating accessibility toolbar (bottom-left or top-right):
- 🌙 **Dark / Light toggle** — instant theme switch, persisted in localStorage
- 🔆 **High Contrast mode** — increases text contrast ratios
- 🔤 **Font size slider** — `Small | Normal | Large | XL` — adjusts `html { font-size }`
- ↕️ **RTL toggle** — switches document direction for Arabic/Hebrew
- ♿ **Accessibility statement link**

### 15.2 Theme Implementation

- Store in `localStorage` as `medibook-theme`
- Values: `"light"` | `"dark"` | `"system"`
- `"system"` → follows OS `prefers-color-scheme` media query
- CSS custom properties (or MUI `createTheme`) toggled via data attribute: `data-theme="dark"`

### 15.3 WCAG AA Compliance

- All text: contrast ratio ≥ 4.5:1
- Large text: ≥ 3:1
- Focus indicators: visible outline on all interactive elements
- All images: alt text
- All form inputs: associated labels
- Error messages: announced via `aria-live`
- Data tables: scope headers (`<th scope="col">`)

---

## 16. Mobile & Responsive Behavior

### 16.1 Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| `xs` | 0–599px | Mobile |
| `sm` | 600–899px | Tablet portrait |
| `md` | 900–1199px | Tablet landscape / small desktop |
| `lg` | 1200px+ | Desktop |

### 16.2 Navigation (Mobile)

**Option A — Slide-over Drawer (current):**
- Hamburger in top navbar opens full sidebar as temporary drawer from left
- Backdrop overlay closes it on tap

**Option B — Bottom Nav Bar (demo style):**
- Fixed bottom bar with 5 core icons: Home · Calendar · Messages · Patients · Profile
- Active icon: filled + accent color
- Secondary pages accessible via hamburger top-right slide-out

**Recommended:** Implement both — slide-over drawer for now, bottom nav in v2.

### 16.3 Layout Adaptations by Breakpoint

**Dashboard:**
- `xs`: All KPI cards full-width stacked, charts full-width stacked
- `sm`: KPI 2-column, charts stacked
- `md+`: KPI 4-column, charts 8/4 split

**Tables → Cards on Mobile:**
- Appointments table → appointment cards (date/time header, patient + service body, status chip, action buttons)
- Patients table → patient cards (avatar, name, quick action buttons)

**Calendar:**
- Mobile: Day view default (month view hides side-bars)
- Week view: horizontal scroll

**Sidebar:**
- `xs/sm`: Hidden, opens as temporary drawer
- `md+`: Permanent, always visible

**Forms:**
- All inputs full-width on mobile
- Multi-column form grids collapse to 1-column

**Charts:**
- X-axis labels rotate on mobile to prevent overlap
- Reduced data points shown on small screens

---

## 17. Authentication

### 17.1 Login Page

**Layout:**
- Left panel (desktop only): Brand panel with light gradient, logo, tagline, 3 feature bullets (glass cards)
- Right panel: Login form

**Form:**
- Email input
- Password input (toggle show/hide)
- Forgot password link
- Submit button: gradient blue, arrow icon, loading spinner
- Demo credential chips: Admin · Clinician · Patient (click to auto-fill)

**Dev Mode Bypass:**
- If backend offline + demo credentials → mock login with fake JWT token

### 17.2 Forgot Password Flow

1. Enter registered email → "Send Reset Link" button
2. Success page: "Check your email" + resend button
3. Reset password page (from email link): new password + confirm
4. Success page: "Password updated, go to login"

### 17.3 Protected Routes & Role Guards

| Route | Allowed Roles |
|-------|--------------|
| `/dashboard` | all |
| `/calendar` | all |
| `/appointments` | all |
| `/appointments/new` | admin, receptionist, clinician |
| `/patients` | admin, receptionist, clinician |
| `/clinicians` | admin, super_admin, receptionist |
| `/clinicians/new` | admin, super_admin |
| `/staff` | admin, super_admin |
| `/messages` | all |
| `/reviews` | admin, super_admin |
| `/finances` | admin, super_admin |
| `/settings` | all (filtered tabs) |

Unauthorized access → `/403` Forbidden page

### 17.4 Session Management

- JWT stored in `localStorage` as `medibook_token`
- Auto-logout on token expiry (show "Session expired" toast)
- "Remember me" — extends token TTL
- Active sessions displayed in Settings > Account

---

## 18. Error Pages

### 18.1 404 Not Found

- Illustration (medical theme — lost stethoscope, map, etc.)
- "Page not found" heading
- "The page you're looking for doesn't exist."
- `← Go back home` button
- `🔍 Search` input

### 18.2 403 Forbidden

- Lock illustration
- "Access Denied" heading
- "You don't have permission to view this page."
- `← Go to Dashboard` button

### 18.3 500 Server Error

- Error illustration
- "Something went wrong"
- Error ID + timestamp (for support)
- `🔄 Try Again` button + `📧 Contact Support` link

### 18.4 Offline / Network Error Banner

- Sticky banner at top: `⚠️ No internet connection — some features may be unavailable`
- Auto-dismisses when connection restored

---

## 19. Full Implementation Checklist

### Phase 1 — Foundation ✅ Complete
- [x] Project setup (React + Vite + Apollo + MUI)
- [x] Docker (Laravel backend + MySQL + phpMyAdmin)
- [x] Authentication (login, JWT, protected routes)
- [x] Global layout (Sidebar + Navbar + Breadcrumbs)
- [x] DocBook v2 theme — Plus Jakarta Sans + `#1565C7` / `#0B7B5C` palette
- [x] Dark navy sidebar (`#0D1B2E`) with sectioned nav, Emergency 911 button, badges
- [x] `UI_PLAN.md` + `FEATURE_PLAN.md` design system documents

### Phase 2 — Core Pages ✅ Complete
- [x] Dashboard — KPI cards (icon pills + trend badges), greeting header, quick-action button
- [x] Appointments list — filters, DataGrid, detail drawer, cancel dialog
- [x] Calendar — FullCalendar Day/Week/Month views
- [x] Patients list — search, filter, DataGrid
- [x] Clinicians list — search, DataGrid
- [x] Settings page — tabbed (Clinic Profile, Users, Notifications, Services, Rooms)
- [x] LoginPage — dark navy brand panel, demo chips, gradient submit button
- [x] Patient detail page with tabs (Overview, Medical History, Appointments, Test Results, Documents)
- [ ] Appointment detail drawer/modal (drawer component exists)
- [ ] Doctor detail page
- [x] Add/Edit patient form (dialog)
- [ ] Add/Edit appointment form

### Phase 3 — Advanced Features 🔄 In Progress
- [x] Emergency 911 button in sidebar (pulse animation)
- [x] Notification bell with unread badge in Navbar
- [x] Messenger page — dual-pane (Doctor/Patient tabs, bubbles, typing indicator, online status)
- [x] Reviews page — rating breakdown, moderation (approve/hide/delete)
- [x] Finances page — balance cards, transaction history, payment methods CRUD
- [x] Messages unread badge on sidebar nav item
- [ ] Global search with results panel
- [x] Medical test results page + detail (dialog with parameter values)
- [x] Staff management (KPI cards, dept filter, table)
- [x] A–Z alphabet filter on patients
- [ ] "Next Patient" KPI card widget
- [ ] "Upcoming Appointments" sidebar widget
- [ ] Recent questions/messages widget

### Phase 4 — Settings Deep Dive ✅ Complete
- [x] Profile tab (avatar, photo upload, personal info, address)
- [x] Account tab (password change, 2FA, active sessions, danger zone)
- [x] Notifications tab (per-channel toggles for all event types)
- [x] Appearance tab (theme, font size slider, accent color, compact/RTL)
- [x] Clinic settings tab (name, timezone, currency, slot duration)
- [ ] Forgot / reset password flow

### Phase 5 — Analytics & Reporting 🔲
- [ ] Full appointment analytics (stacked bar, timeframe filters)
- [ ] Patient pace chart (new vs returning)
- [ ] Diagnoses breakdown (horizontal bars + doughnut)
- [ ] Clinician utilisation chart
- [ ] Revenue analytics (monthly bar + service breakdown)
- [ ] Export to CSV / PDF

### Phase 6 — Accessibility & Theme 🔲
- [ ] Dark/Light theme toggle (persisted, system preference)
- [ ] High contrast mode
- [ ] Font size slider
- [ ] RTL layout toggle
- [ ] WCAG AA audit + fixes

### Phase 7 — Mobile & Responsive Polish 🔲
- [ ] Bottom navigation bar for mobile
- [ ] Appointments cards view on mobile
- [ ] Patients cards view on mobile
- [ ] Calendar day-view default on mobile
- [ ] All forms single-column on mobile
- [ ] Touch gestures (swipe to dismiss notifications)

### Phase 8 — Backend Integration 🔲
- [ ] GraphQL mutations for all CRUD operations
- [ ] Real-time updates (WebSocket subscriptions for messages)
- [ ] File upload (profile photos, documents, test results)
- [ ] Email/SMS notification service integration
- [ ] Payment gateway integration
- [ ] 2FA / TOTP implementation

---

*Document generated by reverse-engineering https://meduxtemplate.merku.love/dashboard_a*  
*Every feature documented here has been observed in the demo and mapped to the MediBook implementation scope.*
