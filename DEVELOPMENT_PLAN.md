# MediBook SaaS — Full-Stack Development Plan

> **Project:** Online Doctor Appointment Booking System  
> **Stack:** React 18 + MUI v5 + Apollo Client | Laravel 11 + Lighthouse GraphQL | MySQL 8 | Docker  
> **Architecture:** Multi-tenant SaaS | Decoupled API-first  
> **Date:** March 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack](#3-technology-stack)
4. [Docker Architecture](#4-docker-architecture)
5. [Backend Development Plan](#5-backend-development-plan)
6. [Frontend Development Plan](#6-frontend-development-plan)
7. [Database Design](#7-database-design)
8. [GraphQL API Design](#8-graphql-api-design)
9. [Authentication & Security](#9-authentication--security)
10. [Development Phases & Milestones](#10-development-phases--milestones)
11. [Testing Strategy](#11-testing-strategy)
12. [Environment Configuration](#12-environment-configuration)
13. [Running the Project](#13-running-the-project)

---

## 1. Project Overview

**MediBook** is a cloud-based, multi-tenant SaaS platform that digitalises the entire patient appointment lifecycle — from discovery and self-booking to clinician scheduling, room allocation, and post-visit administration.

### Core Features
| Feature | Patient Benefit | Clinic Benefit |
|---|---|---|
| Online Self-Booking | 24/7 appointment access | Reduced admin overhead |
| Smart Slot Engine | See only available slots | Zero double-bookings |
| Multi-Clinic Support | Book at any branch | Centralised management |
| Role-Based Access | Secure personal data | Granular permissions |
| Real-Time Calendar | Live availability | Instant schedule updates |
| GraphQL API | Fast, precise data | Flexible integrations |

### User Roles
| Role | Description |
|---|---|
| `super_admin` | Platform owner; manages all tenants |
| `admin` | Clinic manager; manages clinicians, rooms, services |
| `receptionist` | Books/manages appointments on behalf of patients |
| `clinician` | Views own schedule, manages availability |
| `patient` | Self-books appointments via portal |

---

## 2. Repository Structure

```
online-booking-system/
├── backend/                    # Laravel 11 + Lighthouse GraphQL API
│   ├── app/
│   │   ├── GraphQL/
│   │   │   ├── Mutations/      # GraphQL mutation resolvers
│   │   │   ├── Queries/        # GraphQL query resolvers
│   │   │   └── Subscriptions/  # Real-time resolvers
│   │   ├── Models/             # Eloquent ORM models
│   │   ├── Http/
│   │   │   ├── Controllers/    # REST/health controllers
│   │   │   └── Middleware/     # Tenant scoping, auth middleware
│   │   ├── Services/           # Business logic layer
│   │   │   ├── AvailabilityService.php
│   │   │   ├── BookingService.php
│   │   │   └── NotificationService.php
│   │   └── Policies/           # RBAC authorization policies
│   ├── database/
│   │   ├── migrations/         # All table migrations
│   │   └── seeders/            # Demo data seeders
│   ├── graphql/
│   │   └── schema.graphql      # Full typed GraphQL schema
│   ├── config/                 # Laravel config files
│   ├── routes/                 # api.php, web.php
│   ├── docker/
│   │   └── nginx/
│   │       └── nginx.conf      # Nginx reverse proxy config
│   ├── Dockerfile              # PHP 8.3-fpm-alpine image
│   ├── composer.json           # PHP dependencies
│   └── .env.example            # Backend environment variables
│
├── frontend/                   # React 18 + MUI v5 + Apollo Client
│   ├── src/
│   │   ├── apollo/
│   │   │   └── client.js       # Apollo Client + auth middleware
│   │   ├── graphql/
│   │   │   ├── queries.js      # All GQL queries
│   │   │   ├── mutations.js    # All GQL mutations
│   │   │   └── subscriptions.js # Real-time GQL subscriptions
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── AppointmentsPage.jsx
│   │   │   ├── NewAppointmentPage.jsx
│   │   │   ├── CalendarPage.jsx
│   │   │   ├── CliniciansPage.jsx
│   │   │   ├── PatientsPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── components/
│   │   │   ├── Layout/         # Sidebar, Navbar, Breadcrumbs
│   │   │   ├── BookingWizard/  # Multi-step appointment booking form
│   │   │   ├── CalendarView/   # FullCalendar wrapper component
│   │   │   ├── AppointmentCard/
│   │   │   ├── ClinicianCard/
│   │   │   ├── PatientForm/
│   │   │   └── ProtectedRoute/ # Auth guard HOC
│   │   ├── hooks/              # Custom React hooks
│   │   ├── theme/
│   │   │   └── theme.js        # MUI custom theme (MediBook branding)
│   │   ├── utils/              # Date, formatting helpers
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── Dockerfile              # node:20-alpine dev image
│   ├── package.json            # All React dependencies
│   └── .env.example            # Frontend environment variables
│
├── docker-compose.yml          # Root orchestration file
├── .env.example                # Root environment variables
├── Makefile                    # Developer shortcuts
└── DEVELOPMENT_PLAN.md         # This file
```

---

## 3. Technology Stack

### Backend
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Laravel | 11 | PHP application framework |
| GraphQL Server | Lighthouse | 6.x | GraphQL schema + resolvers |
| Auth | Laravel Sanctum | 4.x | JWT / token authentication |
| RBAC | Spatie Permissions | 6.x | Role & permission management |
| Queue | Laravel Horizon | 5.x | Redis-backed job management |
| Search | Laravel Scout | 10.x | Full-text search abstraction |
| Language | PHP | 8.3 | Backend language |

### Frontend
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| UI Framework | React | 18.3 | Component-based UI |
| Component Library | MUI (Material UI) | v5 | Design system & components |
| GraphQL Client | Apollo Client | 3.x | GraphQL data fetching & cache |
| Routing | React Router | v6 | SPA client-side routing |
| Calendar | FullCalendar React | 6.x | Interactive calendar UI |
| Forms | React Hook Form + Zod | latest | Form management & validation |
| Charts | Recharts | 2.x | Dashboard analytics |
| Date/Time | Day.js | 1.x | Date manipulation |

### Infrastructure
| Service | Technology | Purpose |
|---|---|---|
| Containerisation | Docker + Docker Compose | Local dev & deployment |
| Web Server | Nginx (alpine) | Reverse proxy, SSL termination |
| Database | MySQL 8.0 | Primary relational datastore |
| Cache/Queue | Redis 7 | Sessions, jobs, pub/sub |
| DB Admin | phpMyAdmin | Visual MySQL management |
| Real-time | Laravel Echo + Pusher | WebSocket events |

---

## 4. Docker Architecture

### Services

```yaml
# docker-compose.yml overview
services:
  nginx:        # nginx:alpine — Reverse proxy on port 8000
  php-fpm:      # php:8.3-fpm-alpine — Laravel application
  mysql:        # mysql:8.0 — Primary database on port 3306
  redis:        # redis:7-alpine — Cache & queue on port 6379
  frontend:     # node:20-alpine — React dev server on port 3000
  phpmyadmin:   # phpMyAdmin — DB admin UI on port 8080
```

### Port Mapping
| Service | Internal Port | Host Port | URL |
|---|---|---|---|
| Frontend (React) | 3000 | 3000 | http://localhost:3000 |
| Backend (GraphQL) | 9000 (FPM) | via Nginx | http://localhost:8000/graphql |
| Nginx | 80 | 8000 | http://localhost:8000 |
| MySQL | 3306 | 3306 | — |
| Redis | 6379 | 6379 | — |
| phpMyAdmin | 80 | 8080 | http://localhost:8080 |

### Networking
All services share a private `medibook_network` bridge network. The frontend container calls the backend via `http://nginx:80` internally.

---

## 5. Backend Development Plan

### Phase 1 — Foundation
- [ ] Laravel 11 fresh install via Composer
- [ ] Configure `.env` (database, Redis, mail, Pusher)
- [ ] Install and publish Lighthouse GraphQL (`nuwave/lighthouse`)
- [ ] Install Laravel Sanctum for API auth
- [ ] Install Spatie Permissions for RBAC
- [ ] Install Laravel Horizon for queue management
- [ ] Configure multi-tenancy middleware (tenant_id scoping)

### Phase 2 — Database Migrations
Run in order:
1. `tenants` table
2. `users`, `roles`, `permissions`, `model_has_roles`
3. `clinics`, `clinic_settings`
4. `rooms`, `room_equipment`
5. `clinician_types`, `clinicians`, `clinician_clinic`
6. `service_categories`, `services`, `service_clinician`
7. `availability_templates`, `availability_overrides`
8. `time_slots`
9. `patients`, `patient_documents`, `patient_notes`
10. `appointments`, `appointment_notes`, `appointment_status_log`
11. `notifications`, `notification_templates`

### Phase 3 — Eloquent Models
Each model must:
- Use `SoftDeletes` trait
- Have `tenant_id` scope (global scope)
- Define all relationships
- Include `$fillable` array
- Cast JSON columns

Key models: `Tenant`, `User`, `Clinic`, `Clinician`, `Patient`, `Appointment`, `Service`, `Room`, `AvailabilityTemplate`, `TimeSlot`

### Phase 4 — GraphQL Schema & Resolvers
Define schema types in `graphql/schema.graphql` then implement resolvers in `app/GraphQL/`.

**Queries:**
- `me` — Authenticated user profile
- `appointments(filters)` — List with date/status/clinician filters
- `availableSlots(clinician_id, date)` — Slot engine output
- `clinicians(clinic_id)` — List clinicians
- `patients` — List patients (receptionist/admin only)
- `dashboard` — Aggregated stats

**Mutations:**
- `login(email, password)` → token
- `register(input)` → user + token
- `createAppointment(input)` → appointment
- `cancelAppointment(id, reason)` → appointment
- `rescheduleAppointment(id, new_slot)` → appointment
- `createClinician(input)` → clinician
- `updateAvailabilityTemplate(input)` → template
- `createPatient(input)` → patient

**Subscriptions:**
- `appointmentUpdated(clinician_id)` — Real-time calendar sync

### Phase 5 — Business Services
- **`AvailabilityService`** — Core slot engine: reads templates, applies overrides/blockouts, generates available slots, enforces buffer times
- **`BookingService`** — Atomic booking with Redis locking to prevent race conditions
- **`NotificationService`** — Queued email/SMS notifications via Laravel Notifications

### Phase 6 — Security
- RBAC policies on every resolver (`@can` Lighthouse directive)
- Tenant middleware on all queries (auto-inject `tenant_id`)
- Input validation via `@rules` directives
- Rate limiting: 60 req/min general, 10/min booking, 5/min auth
- All mutations logged with user, IP, timestamp, before/after state

---

## 6. Frontend Development Plan

### Phase 1 — Foundation
- [ ] React 18 app setup (Create React App or Vite)
- [ ] Install MUI v5, configure `ThemeProvider`
- [ ] Install Apollo Client 3, configure with auth headers
- [ ] Install React Router v6, set up route structure
- [ ] Create MUI custom theme (MediBook brand: primary blue/teal, dark sidebar)
- [ ] Set up global layout (sidebar + top nav)

### Phase 2 — Apollo Client Configuration
```js
// src/apollo/client.js
// - ApolloClient with InMemoryCache
// - authLink: attaches JWT token from localStorage to every request
// - errorLink: handles 401 → redirect to login
// - splitLink: WebSocket link for subscriptions, HTTP link for queries/mutations
```

### Phase 3 — GraphQL Operations
Co-locate GQL documents in `src/graphql/`:
- `queries.js` — All query documents
- `mutations.js` — All mutation documents
- `subscriptions.js` — Real-time subscription documents

### Phase 4 — Pages
| Page | Key Features |
|---|---|
| `LoginPage` | MUI form, useMutation LOGIN, JWT storage, redirect |
| `DashboardPage` | KPI cards (appointments, clinicians, patients), Recharts line/bar charts |
| `AppointmentsPage` | Table with filters (date, status, clinician), pagination, status badges |
| `NewAppointmentPage` | BookingWizard: select clinic → clinician → service → slot → confirm |
| `CalendarPage` | FullCalendar month/week/day, real-time via subscription, click to book |
| `CliniciansPage` | Grid of clinician cards, availability toggle, profile modal |
| `PatientsPage` | Searchable patient list, patient history modal |
| `SettingsPage` | Clinic settings, notification templates, user management |

### Phase 5 — Key Components

#### BookingWizard (multi-step)
```
Step 1: Select Clinic
Step 2: Select Clinician + Service
Step 3: Pick Date → Load available slots (availableSlots query)
Step 4: Confirm booking details
Step 5: Success confirmation + calendar add option
```

#### CalendarView (FullCalendar)
- Views: month, week, day, agenda
- Colour-coded by status: confirmed (green), pending (amber), cancelled (red)
- Click slot → open booking modal
- Real-time updates via `useSubscription(appointmentUpdated)`

### Phase 6 — Auth & Route Guards
```jsx
// ProtectedRoute — checks JWT token validity
// RoleGuard — checks user role before rendering page
// If unauthenticated → redirect to /login
// If unauthorized → show 403 page
```

---

## 7. Database Design

### Multi-Tenancy Strategy
Every table includes `tenant_id BIGINT FK`. A global Eloquent scope automatically appends `WHERE tenant_id = X` to all queries. The tenant is resolved from the JWT token on every request.

### Core Entity Groups
| Group | Tables |
|---|---|
| Tenancy | `tenants` |
| Auth/Users | `users`, `roles`, `permissions`, `model_has_roles` |
| Clinics | `clinics`, `clinic_settings` |
| Rooms | `rooms`, `room_equipment` |
| Clinicians | `clinicians`, `clinician_types`, `clinician_clinic` |
| Services | `services`, `service_categories`, `service_clinician` |
| Availability | `availability_templates`, `availability_overrides`, `time_slots` |
| Appointments | `appointments`, `appointment_notes`, `appointment_status_log` |
| Patients | `patients`, `patient_documents`, `patient_notes` |
| Notifications | `notifications`, `notification_templates` |

### Key Table: `appointments`
| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | |
| `tenant_id` | BIGINT FK | Multi-tenancy isolation |
| `patient_id` | BIGINT FK | |
| `clinician_id` | BIGINT FK | |
| `clinic_id` | BIGINT FK | |
| `room_id` | BIGINT FK (nullable) | |
| `service_id` | BIGINT FK | |
| `start_datetime` | DATETIME | UTC stored |
| `end_datetime` | DATETIME | Calculated from duration |
| `duration_minutes` | SMALLINT | |
| `status` | ENUM | pending/confirmed/cancelled/completed/no_show |
| `booked_by_type` | ENUM | patient/receptionist/admin |

---

## 8. GraphQL API Design

### Schema Structure
```graphql
# graphql/schema.graphql
type Query {
  me: User @auth
  appointments(filters: AppointmentFilters): [Appointment!]! @auth
  availableSlots(clinician_id: ID!, date: Date!): [TimeSlot!]! @auth
  clinicians(clinic_id: ID): [Clinician!]! @auth
  patients(search: String): [Patient!]! @auth @can(ability: "viewPatients")
  dashboard: DashboardStats! @auth @can(ability: "viewDashboard")
}

type Mutation {
  login(email: String!, password: String!): AuthPayload!
  register(input: RegisterInput!): AuthPayload!
  createAppointment(input: AppointmentInput!): Appointment! @auth
  cancelAppointment(id: ID!, reason: String): Appointment! @auth
  createClinician(input: ClinicianInput!): Clinician! @auth @can(ability: "manageClinicians")
  createPatient(input: PatientInput!): Patient! @auth
}

type Subscription {
  appointmentUpdated(clinician_id: ID!): Appointment! @auth
}
```

### Lighthouse Directives Used
| Directive | Purpose |
|---|---|
| `@auth` | Require authentication |
| `@can` | RBAC policy check |
| `@rules` | Input validation |
| `@paginate` | Auto-pagination |
| `@with` | Eager loading (prevents N+1) |
| `@softDeletes` | Include soft-deleted records |

---

## 9. Authentication & Security

### Auth Flow
1. `POST /graphql` with `login` mutation → returns JWT + refresh token
2. Frontend stores JWT in `localStorage`, refresh token in `httpOnly` cookie
3. Apollo Client `authLink` attaches `Authorization: Bearer <token>` to every request
4. Backend `EnsureValidToken` middleware validates token on every request
5. Tenant is extracted from token claims and applied as global DB scope

### Security Controls
| Control | Implementation | Standard |
|---|---|---|
| Authentication | JWT via Laravel Sanctum | OWASP A07 |
| Authorisation | RBAC + Policies on every resolver | OWASP A01 |
| Input Validation | GraphQL input types + `@rules` + Zod (FE) | OWASP A03 |
| SQL Injection | Eloquent ORM (parameterised queries) | OWASP A03 |
| Rate Limiting | 60/min general, 10/min booking, 5/min auth | OWASP A04 |
| Data Encryption | HTTPS/TLS 1.3, AES-256 at rest | HIPAA/GDPR |
| CORS | Strict origin whitelist | OWASP A05 |
| Audit Logging | All mutations logged with user, IP, timestamp | HIPAA |
| Password Policy | Bcrypt, min 12 chars, breach check | NIST SP 800-63 |
| 2FA | TOTP (mandatory for Admin+) | NIST SP 800-63 |

---

## 10. Development Phases & Milestones

> Each phase covers **Backend**, **Frontend**, **Database**, and **DevOps** tasks with clear deliverables and success criteria.

---

### 🚀 Phase 1 — Project Setup & Docker (Week 1)

**Goal:** All services running locally via Docker. Developers can open the app and GraphQL playground.

#### 🔧 Backend
- [ ] Initialise Laravel 11 project in `backend/` via `composer create-project`
- [ ] Install core packages: `nuwave/lighthouse`, `laravel/sanctum`, `spatie/laravel-permission`, `laravel/horizon`
- [ ] Publish vendor configs: Sanctum, Lighthouse, Spatie
- [ ] Create `backend/Dockerfile` using `php:8.3-fpm-alpine`
- [ ] Create `backend/docker/nginx/nginx.conf` reverse proxy for PHP-FPM
- [ ] Create `backend/.env.example` with all required variables

#### 🎨 Frontend
- [ ] Initialise React 18 app in `frontend/` using Vite (`npm create vite@latest`)
- [ ] Install MUI v5: `@mui/material @emotion/react @emotion/styled`
- [ ] Install Apollo Client: `@apollo/client graphql`
- [ ] Install React Router v6, FullCalendar, Recharts, React Hook Form, Zod, Day.js
- [ ] Create `frontend/Dockerfile` using `node:20-alpine`
- [ ] Create `frontend/.env.example`

#### 🗄️ Database & DevOps
- [ ] Create root `docker-compose.yml` with 6 services: `php-fpm`, `nginx`, `mysql`, `redis`, `frontend`, `phpmyadmin`
- [ ] Configure `medibook_network` bridge and named volumes for MySQL + Redis data persistence
- [ ] Create root `.env.example` with `MYSQL_*`, `PMA_*`, `APP_URL`, `FRONTEND_URL`
- [ ] Create `Makefile` with `up`, `down`, `bash`, `migrate`, `seed`, `logs`, `fresh` targets

#### ✅ Phase 1 Deliverables
| Item | URL | Status Check |
|---|---|---|
| React Frontend | http://localhost:3000 | Shows Vite/React default page |
| GraphQL Playground | http://localhost:8000/graphql | Lighthouse playground loads |
| phpMyAdmin | http://localhost:8080 | Login with root credentials |
| MySQL | Port 3306 | `docker-compose ps` shows healthy |

---

### 🔐 Phase 2 — Authentication & RBAC (Week 2)

**Goal:** Full auth system working end-to-end. Users can log in via the React UI and receive a scoped JWT.

#### 🔧 Backend
- [ ] Run migrations: `tenants`, `users`, `roles`, `permissions`, `model_has_roles`
- [ ] Implement `TenantMiddleware` — resolves tenant from JWT and sets global DB scope
- [ ] Build `AuthResolver` with `login` and `register` GraphQL mutations using Sanctum
- [ ] Implement token refresh mutation and `logout` mutation
- [ ] Seed roles: `super_admin`, `admin`, `receptionist`, `clinician`, `patient`
- [ ] Assign Spatie permissions per role (e.g. `viewPatients`, `manageClinicins`, `viewDashboard`)
- [ ] Add `@auth` and `@can` directives to all resolver schema definitions
- [ ] Write PHPUnit tests: login, register, token expiry, unauthorized access

#### 🎨 Frontend
- [ ] Create `src/apollo/client.js` — Apollo Client with `authLink` (JWT header) and `errorLink` (401 → redirect)
- [ ] Build `LoginPage.jsx` with MUI form, `useMutation(LOGIN)`, JWT saved to localStorage
- [ ] Create `ProtectedRoute` HOC — checks token validity, redirects to `/login` if missing
- [ ] Create `RoleGuard` HOC — checks user role, shows 403 if unauthorized
- [ ] Add `useQuery(ME)` on app load to hydrate user context (React Context or Zustand)
- [ ] Create `AuthContext` provider wrapping the whole app

#### 🗄️ Database
- [ ] Verify `tenants` table with demo clinic row
- [ ] Seed 5 demo users (one per role) linked to the demo tenant

#### ✅ Phase 2 Deliverables & Success Criteria
- Login form submits → JWT returned → stored in localStorage
- Navigating to `/dashboard` without token → redirected to `/login`
- `me` query returns correct authenticated user with role
- Different roles see different navigation menu items
- Multi-tenancy: User A's data never leaks to User B's tenant

---

### 👨‍⚕️ Phase 3 — Clinicians, Services & Availability Engine (Week 3)

**Goal:** Admins can create clinicians, set services, and define weekly availability templates.

#### 🔧 Backend
- [ ] Migrations: `clinician_types`, `clinicians`, `clinician_clinic`, `service_categories`, `services`, `service_clinician`
- [ ] Migrations: `availability_templates`, `availability_overrides`, `rooms`, `room_equipment`
- [ ] Eloquent models with relationships: `Clinician` ↔ `User`, `Clinician` ↔ `Clinic`, `Clinician` ↔ `Service`
- [ ] GraphQL schema: `Clinician`, `Service`, `AvailabilityTemplate` types + CRUD mutations
- [ ] Implement `AvailabilityService::generateSlots(clinician_id, date)`:
  - Read `availability_templates` for the given day of week
  - Apply `availability_overrides` (one-off changes)
  - Subtract booked appointments and buffer times
  - Return array of available `TimeSlot` objects
- [ ] `availableSlots(clinician_id, date)` GraphQL query returning open slots
- [ ] Write PHPUnit unit tests for `AvailabilityService` edge cases (blockouts, DST, buffers)

#### 🎨 Frontend
- [ ] Build `CliniciansPage.jsx` — grid of `ClinicianCard` components with MUI Card
- [ ] Build `ClinicianCard.jsx` — avatar, name, type, fee, availability toggle
- [ ] Build availability template editor (select days, start/end time, slot duration, buffer)
- [ ] Integrate `availableSlots` query: date picker → fetches slots dynamically
- [ ] Build `ServicesPage.jsx` — list of services with category grouping

#### 🗄️ Database
- [ ] Seed demo clinicians (Dr. Smith GP, Dr. Jones Specialist, Nurse Brown)
- [ ] Seed availability templates for Mon–Fri 09:00–17:00, 15-min slots, 5-min buffer
- [ ] Seed 5 demo services (General Consultation, Blood Test, Physiotherapy, etc.)

#### ✅ Phase 3 Deliverables & Success Criteria
- `availableSlots` query returns correct open slots for a given clinician + date
- Blockout dates show zero available slots
- Buffer time prevents back-to-back booking
- Admin can toggle clinician active/inactive

> ⚠️ **Risk:** Timezone handling — all times stored as UTC, displayed in clinic timezone. Test across DST boundaries.

---

### 📅 Phase 4 — Booking Engine & Appointment Management (Week 4)

**Goal:** Full end-to-end appointment booking with race condition protection.

#### 🔧 Backend
- [ ] Migrations: `appointments`, `appointment_notes`, `appointment_status_log`
- [ ] Implement `BookingService::createAppointment(input)`:
  - Acquire Redis distributed lock on `slot:{clinician_id}:{datetime}` with 5s TTL
  - Validate slot is still available (re-query inside lock)
  - Insert appointment row atomically
  - Release lock
  - Dispatch `AppointmentCreatedJob` to queue
- [ ] GraphQL mutations: `createAppointment`, `cancelAppointment`, `rescheduleAppointment`, `markNoShow`, `completeAppointment`
- [ ] GraphQL query: `appointments(filters: {date_range, status, clinician_id, patient_id})`
- [ ] Add `@paginate` to `appointments` query
- [ ] Policies: patients only see own appointments, clinicians only see assigned, admins see all
- [ ] Write PHPUnit feature tests: concurrent booking attempts (race condition test), cancellation, reschedule

#### 🎨 Frontend
- [ ] Build `BookingWizard` multi-step component:
  - **Step 1:** Select Clinic (dropdown, filtered by tenant)
  - **Step 2:** Select Clinician + Service (cards with avatars)
  - **Step 3:** Pick Date (Day.js date picker) → call `availableSlots` → show slot grid
  - **Step 4:** Confirm details (patient info, notes)
  - **Step 5:** Success screen with appointment reference number
- [ ] Add Zod validation schema for each step
- [ ] Build `AppointmentsPage.jsx` — data table with MUI DataGrid
  - Columns: date/time, clinician, service, status badge, actions
  - Server-side filters: date range picker, status dropdown, clinician filter
- [ ] Status badges with colour: pending (amber), confirmed (green), cancelled (red), no_show (grey)
- [ ] Build cancel/reschedule modals with confirmation dialogs

#### 🗄️ Database
- [ ] Seed 30 demo appointments across 3 clinicians over 2 weeks (mix of statuses)
- [ ] Verify `appointment_status_log` triggers on every status change

#### ✅ Phase 4 Deliverables & Success Criteria
- Two simultaneous booking requests for the same slot → only one succeeds
- BookingWizard completes end-to-end in < 3 clicks after slot selection
- Appointment list filters work correctly with pagination
- Cancellation creates `appointment_status_log` entry with reason and timestamp

> ⚠️ **Risk:** Race condition — verified by PHPUnit concurrent request test using multiple processes.

---

### 🗓️ Phase 5 — Real-Time Calendar & WebSocket (Week 5)

**Goal:** Live calendar view that updates instantly when any appointment is booked or changed.

#### 🔧 Backend
- [ ] Configure Laravel Echo Server + Pusher credentials in `.env`
- [ ] Create `AppointmentUpdated` broadcast event (fires on create, cancel, reschedule, complete)
- [ ] Implement `appointmentUpdated(clinician_id)` GraphQL subscription via Lighthouse
- [ ] Configure `config/broadcasting.php` for Pusher driver
- [ ] Implement clinician-scoped calendar query: `mySchedule(date_range)` for clinician role
- [ ] Add `@with` eager loading to calendar queries (prevent N+1 with patient, service, room joins)

#### 🎨 Frontend
- [ ] Install and configure FullCalendar: `@fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction`
- [ ] Build `CalendarPage.jsx`:
  - Views: Month, Week, Day, Agenda toggle buttons
  - Load appointments via `useQuery(APPOINTMENTS)` mapped to FullCalendar `events`
  - Colour-code events: `#4CAF50` confirmed, `#FFC107` pending, `#F44336` cancelled
  - Click event → open appointment detail drawer
  - Click empty slot → open `BookingWizard` pre-filled with that date/time
- [ ] Add `useSubscription(APPOINTMENT_UPDATED)` — on event receive, update Apollo cache and re-render calendar
- [ ] Configure Apollo Client `splitLink`: WebSocket transport for subscriptions, HTTP for queries/mutations
- [ ] Build clinician-specific `MySchedulePage.jsx` showing only own appointments

#### 🗄️ Database & DevOps
- [ ] Add `pusher` service to `docker-compose.yml` (or use Pusher cloud sandbox)
- [ ] Validate that broadcast events appear in Pusher debug console

#### ✅ Phase 5 Deliverables & Success Criteria
- Book an appointment in Tab A → calendar in Tab B updates within 1 second (no page refresh)
- Calendar renders 30 demo appointments with correct colours
- Click on appointment shows full detail (patient, clinician, service, room, notes)
- Clinician can only view their own calendar entries

> ⚠️ **Risk:** WebSocket disconnect — fallback polling every 30s implemented if subscription drops.

---

### 🔔 Phase 6 — Notifications, Analytics & Admin Tools (Week 6)

**Goal:** Automated notification pipeline working. Dashboard shows real analytics. Admin has full visibility.

#### 🔧 Backend
- [ ] Migrations: `notifications`, `notification_templates`
- [ ] Implement `AppointmentConfirmationNotification` (Mail + database channel):
  - Queued via Redis/Horizon
  - Blade email template with MediBook branding, clinic logo
  - Template variables: `{patient_name}`, `{clinician_name}`, `{date}`, `{time}`, `{cancel_link}`
- [ ] Implement `ReminderJob` — dispatched 24h and 1h before appointment via Laravel scheduler
- [ ] Implement `CancellationNotification` (sent to both patient and clinician)
- [ ] Build `DashboardResolver` returning aggregated stats:
  - Total appointments (today, this week, this month)
  - Clinician utilisation % (slots booked / slots available)
  - No-show rate, revenue by service, new patients count
- [ ] Configure Laravel Horizon dashboard at `/horizon` (admin only)
- [ ] Build audit log query: `auditLogs(filters)` returning mutations log entries

#### 🎨 Frontend
- [ ] Build `DashboardPage.jsx`:
  - **Row 1:** 4 KPI cards (Total Appointments, Clinicians, Patients, Revenue) with trend arrows
  - **Row 2:** Recharts `LineChart` — appointment volume over last 30 days
  - **Row 3:** Recharts `BarChart` — clinician utilisation %, `PieChart` — bookings by service
  - **Row 4:** Recent appointments table (last 5, quick status update)
- [ ] Build `SettingsPage.jsx`:
  - Clinic profile editor (name, logo, address, timezone)
  - Notification template editor (customise email body per event type)
  - User management table (invite users, assign roles, deactivate)
- [ ] Verify phpMyAdmin shows all tables, relationships, and seeded data

#### 🗄️ Database
- [ ] Seed `notification_templates` for: booking confirmation, 24h reminder, cancellation, welcome email
- [ ] Verify Horizon queue workers consume jobs without errors (`make bash` → `php artisan horizon`)

#### ✅ Phase 6 Deliverables & Success Criteria
- Book appointment → confirmation email received within 10 seconds
- Dashboard KPI numbers match direct MySQL count queries
- Horizon dashboard shows zero failed jobs
- Admin can edit notification template and see change reflected in next email

---

### 🔒 Phase 7 — Security Hardening & Testing (Week 7)

**Goal:** All security controls verified. Test coverage meets targets. System ready for staging.

#### 🔧 Backend Testing
- [ ] **PHPUnit Unit Tests (80%+ coverage):**
  - `AvailabilityService` — slot generation, buffers, blockouts, DST
  - `BookingService` — race condition, double-booking prevention
  - `NotificationService` — correct channels, template rendering
  - All RBAC policies — each role gets correct access/denial
- [ ] **PHPUnit Feature Tests (70%+ coverage):**
  - All GraphQL queries with auth (valid token, expired token, wrong role)
  - All GraphQL mutations (happy path + validation failures)
  - Multi-tenancy isolation (tenant A cannot read tenant B's data)
  - Rate limiting (exceed 10 booking/min → 429 returned)
- [ ] **OWASP ZAP automated scan** — fix all High and Critical findings
- [ ] Verify SQL injection protection: Eloquent ORM only, no raw queries with user input
- [ ] Verify CORS headers: only `localhost:3000` and production domain whitelisted
- [ ] Enable `LIGHTHOUSE_CACHE_ENABLE=true` and benchmark cache hit performance

#### 🎨 Frontend Testing
- [ ] **Jest Unit Tests (70%+ coverage):**
  - Apollo client auth link (attaches/strips token correctly)
  - Date/time utility functions (UTC → clinic timezone conversion)
  - Form validators (Zod schemas for booking, registration)
  - Custom hooks: `useAuth`, `useAvailableSlots`, `useAppointments`
- [ ] **React Testing Library Component Tests (60%+):**
  - `BookingWizard` — each step renders + validates + progresses
  - `CalendarView` — events render with correct colours
  - `LoginPage` — form submits, error state shows, redirect occurs
  - `ProtectedRoute` — unauthenticated redirect works
- [ ] **Playwright E2E Tests (key journeys):**
  - `booking_flow.spec.ts` — login → find clinician → pick slot → book → confirm email
  - `cancellation_flow.spec.ts` — view appointment → cancel → status updates → email sent
  - `admin_flow.spec.ts` — create clinician → set availability → verify in calendar
  - `role_access.spec.ts` — patient cannot access `/settings`, receptionist cannot access `/admin`

#### 🗄️ Database & DevOps
- [ ] Run `php artisan lighthouse:validate-schema` to confirm schema is error-free
- [ ] Verify all foreign keys, indexes, and soft delete columns present in all tables
- [ ] Docker image vulnerability scan: `docker scout cves` or `trivy image`
- [ ] Confirm all `.env` secrets are excluded from version control (`.gitignore` audit)

#### ✅ Phase 7 Deliverables & Success Criteria
- PHPUnit: 80%+ unit, 70%+ feature (run `php artisan test --coverage`)
- Jest: 70%+ pass (run `npm test -- --coverage`)
- All 4 Playwright E2E journeys pass on first run
- OWASP ZAP: zero High severity findings
- `docker-compose up` from cold start completes with all services healthy in < 60s

---

### 🚀 Phase 8 — Polish, Performance & Launch Prep (Week 8)

**Goal:** Production-ready. CI/CD pipeline green. Performance targets met. Docs complete.

#### 🔧 Backend
- [ ] Enable Laravel config/route/view caching: `php artisan optimize`
- [ ] Enable Lighthouse query caching: `LIGHTHOUSE_CACHE_ENABLE=true`
- [ ] Implement GraphQL query complexity limits (prevent abuse via deeply nested queries)
- [ ] Add database read replica config support in `config/database.php`
- [ ] Write `backend/README.md`:
  - Prerequisites (PHP 8.3, Composer, Docker)
  - Installation steps, migrations, seeding
  - Running tests, Horizon, scheduler
  - GraphQL schema exploration guide

#### 🎨 Frontend
- [ ] Lighthouse performance audit — achieve LCP < 2.5s, CLS < 0.1, FID < 100ms
- [ ] Implement code splitting with `React.lazy` + `Suspense` for all page components
- [ ] Add loading skeletons (MUI `Skeleton`) for all data-fetching states
- [ ] Add empty states and error boundary components
- [ ] Audit and implement WCAG 2.1 AA accessibility (axe-core scan, keyboard navigation)
- [ ] Add `<title>` and `<meta>` tags per page via React Helmet
- [ ] Write `frontend/README.md`:
  - Prerequisites (Node 20+, Docker)
  - Running locally, environment setup
  - GraphQL codegen workflow
  - Component library overview

#### 🗄️ DevOps & CI/CD
- [ ] Create `.github/workflows/ci.yml` — GitHub Actions pipeline:
  - **Stage 1:** ESLint + PHP CS Fixer lint check
  - **Stage 2:** PHPUnit + Jest tests with coverage reports
  - **Stage 3:** GraphQL schema validation (`lighthouse:validate-schema`)
  - **Stage 4:** Docker image build + push to registry (GHCR or ECR)
  - **Stage 5:** Deploy to staging (`docker-compose pull && up`)
  - **Stage 6:** Playwright E2E smoke tests against staging URL
  - **Stage 7 (tagged release only):** Blue/green deploy to production
  - **Stage 8:** Slack notification with deploy summary
- [ ] Tag all Docker images: `medibook-backend:1.0.0`, `medibook-frontend:1.0.0`
- [ ] Create `docker-compose.prod.yml` with production overrides (no volume mounts, restart policies)
- [ ] Document environment variable secrets management (AWS Secrets Manager / GitHub Secrets)

#### 📊 Performance Benchmarks (must meet before launch)
| Metric | Target | Tool |
|---|---|---|
| `availableSlots` API response | < 200ms p95 | k6 load test |
| GraphQL `appointments` list (paginated) | < 150ms p95 | k6 |
| Frontend LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| Frontend CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| Docker cold-start (all services healthy) | < 60s | Manual timer |
| 100 concurrent booking requests | Zero race conditions | k6 + custom script |

#### ✅ Phase 8 Deliverables & Success Criteria
- CI/CD pipeline passes green on `main` branch push
- All performance benchmarks met (k6 report + Lighthouse report attached)
- `README.md` in both `backend/` and `frontend/` covers full setup in < 10 minutes
- Production Docker images tagged and pushed to registry
- Staging environment accessible and smoke tests passing

---

### 📋 Overall Phase Summary

| Phase | Week | Theme | Key Output |
|---|---|---|---|
| **1** | Week 1 | Setup & Docker | All 6 services running locally |
| **2** | Week 2 | Auth & RBAC | JWT login + role-based access working |
| **3** | Week 3 | Clinicians & Availability | Slot engine generating correct open slots |
| **4** | Week 4 | Booking Engine | End-to-end appointment booking (no race conditions) |
| **5** | Week 5 | Real-Time Calendar | Live calendar with WebSocket updates |
| **6** | Week 6 | Notifications & Analytics | Email queue + dashboard charts |
| **7** | Week 7 | Security & Testing | 70%+ coverage + OWASP clean |
| **8** | Week 8 | Polish & Launch | CI/CD green + performance targets met |

---

## 11. Testing Strategy

| Test Type | Tool | Coverage Target | Focus |
|---|---|---|---|
| Unit Tests (BE) | PHPUnit 11 | 80%+ | Services, slot engine, policies |
| Feature Tests (BE) | PHPUnit + Pest | 70%+ | Resolvers, auth, booking lifecycle |
| Unit Tests (FE) | Jest + RTL | 70%+ | Hooks, utils, form validation |
| Component Tests (FE) | React Testing Library | 60%+ | BookingWizard, calendar, modals |
| E2E Tests | Playwright | Key journeys | Full booking flow, login, cancellation |
| Performance | k6 / Lighthouse | Core Web Vitals | Slot query < 200ms, LCP < 2.5s |
| Security | OWASP ZAP | OWASP Top 10 | DAST scanning, injection, auth bypass |

---

## 12. Environment Configuration

### Root `.env`
```env
# MySQL
MYSQL_DATABASE=medibook_db
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_USER=medibook
MYSQL_PASSWORD=medibook_secret

# phpMyAdmin
PMA_HOST=mysql
PMA_PORT=3306

# App
APP_ENV=local
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### Backend `.env` (key variables)
```env
APP_KEY=base64:...
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=medibook_db
DB_USERNAME=medibook
DB_PASSWORD=medibook_secret

REDIS_HOST=redis
REDIS_PORT=6379

LIGHTHOUSE_CACHE_ENABLE=false

QUEUE_CONNECTION=redis
BROADCAST_DRIVER=pusher

JWT_SECRET=your-256-bit-secret

PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=mt1
```

### Frontend `.env`
```env
REACT_APP_GRAPHQL_URL=http://localhost:8000/graphql
REACT_APP_GRAPHQL_WS_URL=ws://localhost:8000/graphql
REACT_APP_PUSHER_KEY=
REACT_APP_PUSHER_CLUSTER=mt1
```

---

## 13. Running the Project

### Prerequisites
- Docker Desktop installed and running
- Docker Compose v2+
- `make` (included on macOS/Linux)

### Quick Start
```bash
# Clone and enter the project
cd online-booking-system

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all Docker services
make up
# or: docker-compose up -d --build

# Run database migrations and seed demo data
make migrate
make seed

# View logs
make logs
```

### Makefile Commands
```bash
make up          # Start all containers (detached)
make down        # Stop all containers
make restart     # Restart all containers
make build       # Rebuild all images
make logs        # Tail container logs
make bash        # Shell into php-fpm container
make migrate     # Run Laravel migrations
make seed        # Run database seeders
make test-be     # Run PHPUnit tests
make test-fe     # Run Jest tests
make fresh       # Drop all tables + re-migrate + re-seed
```

### Access Points
| Service | URL | Credentials |
|---|---|---|
| React Frontend | http://localhost:3000 | — |
| GraphQL Playground | http://localhost:8000/graphql | — |
| phpMyAdmin | http://localhost:8080 | root / rootpassword |
| Laravel API | http://localhost:8000 | — |

### Default Demo Users (after seeding)
| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@medibook.app | password |
| Admin | admin@clinic1.com | password |
| Clinician | dr.smith@clinic1.com | password |
| Receptionist | reception@clinic1.com | password |
| Patient | patient@example.com | password |

---

> **Built with ❤️ for MediBook SaaS** — March 2026
