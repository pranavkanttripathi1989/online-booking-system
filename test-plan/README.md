# Test Plan Index — Online Booking System

**Last Updated:** 16 March 2026  
**Total Plans:** 22 test plans across 6 modules.

---

## Folder Structure

```
test-plan/
├── README.md                          ← this file
├── 16-03-2026-not-done/               ← legacy (superseded by manager/)
│
├── core/                              ← Shared routes accessible to all users
│   ├── settings-test-plan-not-done.md
│   ├── notifications-test-plan-not-done.md
│   └── profile-test-plan-not-done.md
│
├── patient-portal/                    ← /patient/* routes
│   ├── patient-dashboard-test-plan-not-done.md
│   ├── patient-appointments-test-plan-not-done.md
│   └── patient-profile-test-plan-not-done.md
│
├── clinician-portal/                  ← /clinician/* routes
│   ├── clinician-dashboard-test-plan-not-done.md
│   ├── clinician-calendar-test-plan-not-done.md
│   ├── clinician-availability-test-plan-not-done.md
│   └── clinician-patients-test-plan-not-done.md
│
├── staff/                             ← /staff/* routes
│   ├── staff-dashboard-test-plan-not-done.md
│   └── staff-appointments-test-plan-not-done.md
│
├── manager/                           ← /manager/* routes
│   ├── manager-dashboard-test-plan.md
│   ├── manager-availability-test-plan.md
│   ├── manager-blocks-test-plan.md
│   ├── manager-billing-test-plan.md
│   ├── manager-clinics-test-plan.md
│   ├── manager-rooms-test-plan.md
│   ├── manager-services-test-plan.md
│   └── manager-products-test-plan.md
│
└── shared/                            ← Routes accessible to multiple roles
    ├── test-results-page-test-plan-not-done.md
    └── reviews-page-test-plan-not-done.md
```

---

## Test Plan Status Summary

| Module | Plan | Status |
|--------|------|--------|
| **Admin** | admin module (users, roles, org, etc.) | Tested — see test-result/ |
| **Core — Settings** | core/settings-test-plan-not-done.md | ⚠️ Not Tested |
| **Core — Notifications** | core/notifications-test-plan-not-done.md | ⚠️ Not Tested |
| **Core — Profile** | core/profile-test-plan-not-done.md | ⚠️ Not Tested |
| **Patient — Dashboard** | patient-portal/patient-dashboard-test-plan-not-done.md | ⚠️ Not Tested |
| **Patient — Appointments** | patient-portal/patient-appointments-test-plan-not-done.md | ⚠️ Not Tested |
| **Patient — Profile** | patient-portal/patient-profile-test-plan-not-done.md | ⚠️ Not Tested |
| **Clinician — Dashboard** | clinician-portal/clinician-dashboard-test-plan-not-done.md | ⚠️ Not Tested |
| **Clinician — Calendar** | clinician-portal/clinician-calendar-test-plan-not-done.md | ⚠️ Not Tested |
| **Clinician — Availability** | clinician-portal/clinician-availability-test-plan-not-done.md | ⚠️ Not Tested |
| **Clinician — Patients** | clinician-portal/clinician-patients-test-plan-not-done.md | ⚠️ Not Tested |
| **Staff — Dashboard** | staff/staff-dashboard-test-plan-not-done.md | ⚠️ Not Tested |
| **Staff — Appointments** | staff/staff-appointments-test-plan-not-done.md | ⚠️ Not Tested |
| **Manager — Dashboard** | manager/manager-dashboard-test-plan.md | ⚠️ Not Tested |
| **Manager — Availability** | manager/manager-availability-test-plan.md | ⚠️ Not Tested |
| **Manager — Blocks** | manager/manager-blocks-test-plan.md | ⚠️ Not Tested |
| **Manager — Billing** | manager/manager-billing-test-plan.md | ⚠️ Not Tested |
| **Manager — Clinics** | manager/manager-clinics-test-plan.md | ⚠️ Not Tested |
| **Manager — Rooms** | manager/manager-rooms-test-plan.md | ⚠️ Not Tested |
| **Manager — Services** | manager/manager-services-test-plan.md | ⚠️ Not Tested |
| **Manager — Products** | manager/manager-products-test-plan.md | ⚠️ Not Tested |
| **Shared — Test Results** | shared/test-results-page-test-plan-not-done.md | ⚠️ Not Tested |
| **Shared — Reviews** | shared/reviews-page-test-plan-not-done.md | ⚠️ Not Tested |

---

## Naming Convention

- **`-not-done`** suffix = plan written but testing NOT yet executed.
- **No suffix** = plan written (may or may not have results in `test-result/`).
- Move file to `test-result/` folder once tests are executed.
