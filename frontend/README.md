# MediBook Frontend

A premium SaaS scheduling and booking system built with React + Apollo Client + MUI.

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| Apollo Client | 3 | GraphQL data fetching + cache |
| Material UI (MUI) | 5 | Component library |
| FullCalendar | 6 | Interactive calendar |
| React Hook Form + Zod | latest | Form validation |
| Day.js | latest | Date manipulation |
| notistack | latest | Toast notifications |
| React Router v6 | 6 | Client-side routing |
| Vite | 5 | Build tool |

---

## Setup

### Prerequisites
- Node.js ≥ 18
- Docker (for backend + database)

### 1. Clone & install

```bash
git clone <repo-url>
cd online-booking-system/frontend
npm install --cache /tmp/npm-cache   # Use temp cache if ~/.npm has permissions issues
```

> **Tip:** If you get npm `EPERM` errors, fix with:
> ```bash
> sudo chown -R $(id -u):$(id -g) ~/.npm
> ```

### 2. Environment

Create `frontend/.env`:

```env
VITE_GRAPHQL_HTTP=http://localhost:8000/graphql
VITE_GRAPHQL_WS=ws://localhost:8000/graphql
```

### 3. Start the backend

```bash
cd ..
docker compose up -d   # starts MySQL + Laravel + phpMyAdmin
```

### 4. Run the dev server

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## Project Structure

```
src/
├── components/
│   ├── Appointments/        AppointmentDrawer, CancelDialog
│   ├── BookingWizard/       BookingStep1-5, BookingWizard shell
│   ├── Calendar/            CalendarView, EventTooltip
│   ├── Clinicians/          ClinicianCard, ClinicianProfileDrawer, ClinicianFormDrawer
│   ├── Patients/            PatientDetailDrawer
│   ├── Settings/            ClinicProfileForm, UserManagement, NotificationTemplates,
│   │                        ServicesManager, RoomsManager
│   ├── ErrorFallback.jsx
│   └── ConfettiExplosion.jsx
├── context/
│   └── AuthContext.jsx
├── graphql/
│   ├── client.js            Apollo Client setup (auth link + WS link)
│   ├── queries.js
│   ├── mutations.js
│   └── subscriptions.js
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── AppointmentsPage.jsx
│   ├── NewAppointmentPage.jsx
│   ├── CalendarPage.jsx
│   ├── CliniciansPage.jsx
│   ├── PatientsPage.jsx
│   ├── SettingsPage.jsx
│   └── NotFoundPage.jsx
├── App.jsx                  Routes + React.lazy + Suspense
├── main.jsx                 ApolloProvider, SnackbarProvider, HelmetProvider
└── index.css                Global styles + FullCalendar overrides
```

---

## Building for Production

```bash
node_modules/.bin/vite build   # Use if npm run build is blocked by cache issue
# OR (after fixing npm cache):
npm run build
```

Output goes to `dist/`. Expected gzip sizes:
- Initial chunk: ~50KB
- MUI chunk: ~113KB
- Apollo chunk: ~63KB
- FullCalendar (CalendarPage): ~81KB

---

## Key Conventions

### GraphQL Queries
All queries and mutations are in `src/graphql/queries.js` and `src/graphql/mutations.js`. Import named exports:

```js
import { APPOINTMENTS_QUERY } from '../graphql/queries'
import { CREATE_APPOINTMENT_MUTATION } from '../graphql/mutations'
```

### Authentication
Auth state lives in `AuthContext`. Token is stored in `localStorage` and attached to every request via Apollo's auth link in `client.js`. Use the `useAuth()` hook:

```js
const { user, isAuthenticated, logout } = useAuth()
```

### Role Checks
```js
const isAdmin = user?.roles?.some(r => ['admin', 'super_admin'].includes(r.name))
```

### Toast Notifications
Use `notistack` via `useSnackbar()`:

```js
const { enqueueSnackbar } = useSnackbar()
enqueueSnackbar('Appointment booked!', { variant: 'success' })
```

### Forms
All forms use **React Hook Form** + **Zod** resolver. See `BookingStep4Patient.jsx` or `ClinicianFormDrawer.jsx` for reference patterns.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `EPERM` on npm install | `sudo chown -R $(id -u):$(id -g) ~/.npm` |
| GraphQL WS disconnects | CalendarPage falls back to 30s polling automatically |
| FullCalendar blank | Ensure `@fullcalendar/core` is installed: `npm install @fullcalendar/core --cache /tmp/npm-cache` |
| Build fails on `@mui/lab` | Already fixed — timeline rebuilt with pure MUI |
