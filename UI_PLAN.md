# MediBook — UI Design Plan

> **Version:** 2.0 · **Last Updated:** March 2026  
> **Goal:** Redesign all frontend views with a professional **light color scheme**, full **mobile & tablet responsiveness**, and polished micro-interactions.

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Light & Airy** | White/near-white backgrounds, subtle shadows, crisp borders |
| **Brand-Consistent** | Primary blue `#2563EB`, accent teal `#0EA5E9`, neutral grays |
| **Responsive First** | Mobile → Tablet → Desktop breakpoints (`xs` 0px · `sm` 600px · `md` 900px · `lg` 1200px) |
| **Interactive** | Hover effects, animated transitions, skeleton loaders |
| **Accessible** | WCAG AA contrast, focus indicators, ARIA labels |

---

## 2. Color System

### Primary Palette
| Token | Value | Usage |
|-------|-------|-------|
| `primary.main` | `#2563EB` | Buttons, active states, links |
| `primary.light` | `#60A5FA` | Hover highlights, chips |
| `primary.dark` | `#1D4ED8` | Pressed states |
| `primary.50` | `#EFF6FF` | Active nav backgrounds |
| `primary.100` | `#DBEAFE` | KPI card accent fills |

### Neutral Palette
| Token | Value | Usage |
|-------|-------|-------|
| `grey.50` | `#F8FAFC` | Page background |
| `grey.100` | `#F1F5F9` | Sidebar background |
| `grey.200` | `#E2E8F0` | Card borders, dividers |
| `grey.600` | `#475569` | Secondary text |
| `grey.900` | `#0F172A` | Primary text |

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `success.main` | `#059669` | Confirmed status |
| `warning.main` | `#D97706` | Pending status |
| `error.main` | `#DC2626` | Cancelled, errors |
| `info.main` | `#0EA5E9` | Info badges |

### Sidebar (Light)
| Element | Value |
|---------|-------|
| Background | `#F8FAFC` |
| Active item bg | `#EFF6FF` |
| Active item text | `#2563EB` |
| Active item border | `#2563EB` (left 3px) |
| Inactive text | `#475569` |
| Border | `#E2E8F0` |

---

## 3. Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page heading (h4) | Inter | 1.375rem | 700 |
| Section title (h5) | Inter | 1.125rem | 600 |
| Body text | Inter | 0.9375rem | 400 |
| Table / label text | Inter | 0.8125rem | 600 |
| Caption | Inter | 0.75rem | 400 |

---

## 4. Breakpoint Strategy

```
Mobile:   xs (0–599px)   → Collapsed sidebar, bottom nav behavior, stacked layouts
Tablet:   sm (600–899px) → Collapsible drawer, 2-col grids, compact KPIs  
Desktop:  md (900px+)    → Permanent sidebar (240px), 4-col KPI row, multi-chart rows
```

### Sidebar Responsive Behavior
- **Mobile** (`xs`): Hidden by default. Opens as slide-over temporary drawer via hamburger.
- **Tablet** (`sm`): Same as mobile.
- **Desktop** (`md+`): Permanent sidebar, always visible.

### Grid System
- **KPI Cards**: `xs=12 sm=6 md=3` (4 per row on desktop, 2 on tablet, 1 on mobile)
- **Charts**: `xs=12 md=8` / `xs=12 md=4` (stacked on mobile, side-by-side on desktop)
- **Tables**: Always `xs=12` full-width, horizontally scrollable on mobile

---

## 5. Component Specs

### 5.1 Sidebar (Light Redesign)
```
Width:        240px (desktop), slide-over (mobile/tablet)
Background:   #F8FAFC
Border:       1px solid #E2E8F0 (right)
Logo area:    White bg, primary blue icon, 64px height
Nav items:    8px horizontal padding, 40px height, 8px border-radius
Active state: Background #EFF6FF, text #2563EB, left accent bar 3px #2563EB
Hover state:  Background #F1F5F9
User footer:  Avatar with gradient, name/role, logout icon
```

### 5.2 Top Navbar
```
Background:   #FFFFFF with bottom border 1px #E2E8F0
Height:       64px
Shadow:       0 1px 3px rgba(0,0,0,0.06)
Content:      Hamburger (mobile), page title, breadcrumbs, actions, avatar
Search:       Global search bar (sm+ visible)
Notifications: Bell icon with dot badge
```

### 5.3 KPI Cards
```
Background:   #FFFFFF
Border:       1px solid #E2E8F0
Border-radius: 16px
Shadow:       0 2px 8px rgba(0,0,0,0.06)
Icon area:    Colored pill bg (10% opacity of accent color)
Trend badge:  Green/red chip with arrow icon
Hover:        translateY(-2px), elevated shadow
```

### 5.4 Data Tables
```
Header bg:    #F8FAFC
Row hover:    #F1F5F9
Border:       1px solid #E2E8F0 (outer), #F1F5F9 (rows)
Border-radius: 16px (outer container)
Mobile:       Horizontal scroll wrapper
Pagination:   Below table, compact on mobile
```

### 5.5 Forms & Inputs
```
Input bg:     #FFFFFF
Border:       1px solid #CBD5E1 → #2563EB on focus
Border-radius: 10px
Label:        #374151, 0.875rem, weight 500
Helper text:  #6B7280, 0.75rem
Error state:  Border #DC2626, helper text #DC2626
```

### 5.6 Buttons
```
Primary:      bg #2563EB, white text, radius 10px, px 20px py 10px
Secondary:    border 1px #2563EB, text #2563EB, transparent bg
Danger:       bg #DC2626, white text
Icon btn:     Circular, 38px, hover bg #F1F5F9
Transitions:  Hover: translateY(-1px), shadow 0 4px 12px rgba(37,99,235,0.30)
```

### 5.7 Status Badges
```
Confirmed:  bg #ECFDF5, text #059669, border 1px #A7F3D0
Pending:    bg #FFFBEB, text #D97706, border 1px #FDE68A
Cancelled:  bg #FEF2F2, text #DC2626, border 1px #FECACA
Completed:  bg #EFF6FF, text #2563EB, border 1px #BFDBFE
No-show:    bg #F9FAFB, text #6B7280, border 1px #E5E7EB
```

---

## 6. Page-by-Page Redesign

### 6.1 Login Page
- **Left panel**: Light gradient `#F0F9FF → #EFF6FF`, brand logo, animated decorative circles (subtle, light blue)
- **Right panel**: Clean white card form, rounded inputs, gradient submit button
- **Mobile**: Single column, logo top, form below
- **Responsive**: Left panel hidden on xs (mobile)

### 6.2 Dashboard Page
- **Header**: Greeting with date, quick action buttons  
- **KPIs**: 4-column grid with colored icon pills, trend indicators
- **Charts**: Line chart (full week) + pie chart side-by-side on desktop, stacked on mobile
- **Table**: Recent appointments with status chips, patient avatars

### 6.3 Appointments Page
- **Filters row**: Date range picker, status filter, search — horizontal on desktop, stacked on mobile
- **Table**: Columns: Patient, Clinician, Service, Date/Time, Status, Actions
- **Mobile**: Card-based list view instead of table
- **Empty state**: Illustrated empty state with "Book Appointment" CTA

### 6.4 Calendar Page
- **Full calendar**: Responsive FullCalendar integration
- **Event chips**: Color-coded by status, compact on mobile (dot view)
- **Toolbar**: Prev/Next/Today, view switcher (day/week/month)

### 6.5 Patients & Clinicians Pages
- **Search + filter bar**: Above the data table  
- **Table**: Avatar + name first column, responsive columns hiding on smaller viewports
- **Row actions**: View, edit, delete icon buttons

### 6.6 Settings Page
- **Tabbed layout**: Profile, Notifications, Security
- **Section cards**: Each setting group in a white card with dividers
- **Mobile**: Full-width cards, stacked

---

## 7. Animation & Interaction Spec

| Interaction | Animation |
|-------------|-----------|
| Page enter | `fadeIn + translateY(8px → 0)` 200ms ease-out |
| Card hover | `translateY(-2px)` + shadow elevation 200ms |
| Button hover | `translateY(-1px)` 180ms |
| Sidebar item | Background color transition 150ms |
| Toast/snackbar | Slide-in from right 250ms |
| Skeleton loader | Shimmer wave animation |
| Chart bars | Count-up animation on mount |

---

## 8. Responsive Breakpoint Checklist

### Mobile (xs: 0–599px)
- [ ] Hamburger menu visible
- [ ] Sidebar hidden by default (slide-over on open)
- [ ] Single-column KPI layout
- [ ] Charts full-width, horizontal scroll if needed
- [ ] Tables horizontally scrollable
- [ ] Form inputs full-width
- [ ] Navigation fits bottom-aligned drawer

### Tablet (sm: 600–899px)
- [ ] 2-column KPI layout
- [ ] Charts stacked vertically
- [ ] Hamburger menu (no permanent sidebar)
- [ ] Compact table columns

### Desktop (md: 900px+)
- [ ] Permanent 240px sidebar
- [ ] 4-column KPI row
- [ ] 8/4 chart split
- [ ] Full table columns visible
- [ ] Navbar shows clinic chip

---

## 9. File Change Summary

| File | Change |
|------|--------|
| `theme/theme.js` | Light sidebar colors, updated primary palette, new component overrides |
| `components/Layout/Sidebar.jsx` | Light background, new active state styling |
| `components/Layout/Navbar.jsx` | Updated search bar, spacing |
| `components/Layout/Layout.jsx` | Minor spacing tweaks |
| `pages/LoginPage.jsx` | Light brand panel redesign |
| `pages/DashboardPage.jsx` | Header greeting, improved card layout |
| `components/Dashboard/KpiCard.jsx` | Icon pill, trend UI redesign |
| `index.css` | Updated status badge colors, FullCalendar overrides |

---

## 10. Accessibility Requirements

- All interactive elements must have accessible names/labels
- Color contrast ratio ≥ 4.5:1 for all text
- Focus indicators visible (outline or border change)
- Keyboard navigation for sidebar and forms
- Screen reader support for data tables (scope headers)
- Error messages linked to inputs via `aria-describedby`
https://ember-dashboard-dlr.pages.dev/customers