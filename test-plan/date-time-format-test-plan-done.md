# Date & Time Format — Test Plan (COMPLETED — v4.0)

**Standard:** `DD/MM/YYYY` · `h:mm A` (12-hour, uppercase AM/PM, no leading zero)  
**Total Test Cases:** 65 (64 original + 1 new regression check DT-22-01)  
**All Passing:** ✅  
**Completed:** 2026-03-20 (Session 4)

---

## Format Reference

| Context | Token | Example |
|---------|-------|---------|
| Date only | `'DD/MM/YYYY'` | `20/03/2026` |
| Time only | `'h:mm A'` | `9:00 AM`, `12:00 PM` |
| Date + Time | `'DD MMM YYYY, h:mm A'` | `20 Mar 2026, 9:00 AM` |
| Short date | `'DD MMM YYYY'` | `20 Mar 2026` |
| Long date | `'dddd, DD MMMM YYYY'` | `Thursday, 20 March 2026` |
| Calendar short | `'ddd, DD MMM'` | `Thu, 20 Mar` |
| Chart axis | `'DD MMM'` | `20 Mar` |
| API date param | `'YYYY-MM-DD'` | `2026-03-20` (backend only) |
| HTML time input | `'HH:mm'` | `09:00` (HTML native only) |
| Slot value (internal) | `'HH:mm'` | `09:00` (comparison/API only) |

> ⚠️ `hh:mm` (lowercase h, 2-digit) is **NEVER** correct for display — always use `h:mm A`

---

## Module: Clinician Dashboard
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-01-01 | Header date | `Thursday, 20 March 2026` | ✅ |
| DT-01-02 | Next apt time card | `9:00 AM · 30 mins · In-Person` | ✅ |
| DT-01-03 | Upcoming list time | `h:mm A` | ✅ |

## Module: Clinician Patients
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-02-01 | DOB | `12/03/1985` | ✅ |
| DT-02-02 | Last Visit | `05/03/2026` | ✅ |
| DT-02-03 | Next Appointment | `20/03/2026` | ✅ |

## Module: Calendar
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-03-01 | Room view date chip | `Thu, 20 Mar` | ✅ |
| DT-03-02 | Today's Schedule header | `Thu, 20 Mar` | ✅ |
| DT-03-03 | Sidebar time axis | `h:mm A – h:mm A` | ✅ |
| DT-03-04 | Event popover Time row | `Thu 19 Mar, 9:00 AM – 9:30 AM` | ✅ |
| DT-03-05 | Grid appointment card | `h:mm A` | ✅ |
| DT-03-06 | Add form date picker | DD/MM/YYYY | ✅ |

## Module: Appointments List
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-04-01 | Date & Time column | `16 Mar 2026, 9:00 AM` | ✅ |
| DT-04-02 | Date filter | DD/MM/YYYY | ✅ |
| DT-04-03 | CSV export | `DD MMM YYYY, h:mm A` | ✅ |

## Module: Appointment Detail
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-05-01 | Date tile | `Thu, 16 Mar 2026` | ✅ |
| DT-05-02 | Time tile | `9:00 AM – 9:15 AM (15 min)` | ✅ |
| DT-05-03 | Time sidebar | `9:00 AM – 9:15 AM` | ✅ |
| DT-05-04 | Timeline timestamps | `16 Mar 2026, 9:00 AM` | ✅ |

## Module: Appointment Edit
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-06-01 | Date input | YYYY-MM-DD (HTML) | ✅ |
| DT-06-02 | Time input | HH:mm (HTML) | ✅ |

## Module: Patient List
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-07-01 | DOB | `12/05/1992` | ✅ |
| DT-07-02 | Registered | `08/01/2024` | ✅ |

## Module: Patient Detail
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-08-01 | DOB | `12/03/1985` | ✅ |
| DT-08-02 | Registered At | `08/01/2024` | ✅ |
| DT-08-03 | Apt history | `16/03/2026 9:00 AM` | ✅ |

## Module: Patient Dashboard
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-09-01 | Apt time chip | `9:00 AM (30 min)` | ✅ |
| DT-09-02 | Date block month | `Mar` (abbreviation OK) | ✅ |
| DT-09-03 | Notification rel time | `X hours ago` | ✅ |

## Module: Booking Wizard
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-10-01 | Review step date | `19/03/2026` | ✅ |
| DT-10-02 | Time slot chips | `9:00 AM`, `9:30 AM` | ✅ |
| DT-10-03 | Sidebar summary | `Thursday, 19/03/2026 at 9:00 AM` | ✅ |
| DT-10-04 | Booking success | `Thursday, 19 Mar 2026 at 9:00 AM` | ✅ |
| DT-10-05 | Summary Time row | `9:00 AM — 9:30 AM` | ✅ |
| DT-10-06 | Selected slot confirm | `9:00 AM — 9:30 AM` | ✅ |

## Module: Clinician Availability
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-11-01 | Slot card | `9:00 AM — 5:00 PM` | ✅ |
| DT-11-02 | Lunch card | `12:30 PM – 1:30 PM` | ✅ |
| DT-11-03 | Slot tooltip | `Edit 9:00 AM – 5:00 PM · Room 1` | ✅ |
| DT-11-04 | Lunch list | `12:30 PM — 1:30 PM` | ✅ |
| DT-11-05 | Overlap warning | `Overlaps with … 9:00 AM–5:00 PM` | ✅ |

## Module: Manager Dashboard
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-12-01 | Transaction | `16 Mar 2026, 9:00 AM` | ✅ |
| DT-12-02 | Chart axis | `19 Mar` | ✅ |

## Module: AppointmentVolumeChart
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-13-01 | Tooltip | `Thu, 19 Mar` | ✅ |
| DT-13-02 | Tick | `19 Mar` | ✅ |

## Module: Messages
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-13-03 | Message timestamp | `Today at 2:30 PM` | ✅ |
| DT-13-04 | Sidebar last time | Relative `X min ago` | ✅ |

## Module: AppointmentDrawer
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-14-01 | Date & Time | `Thursday, 19 Mar 2026 • 9:00 AM` | ✅ |
| DT-14-02 | Status log | `16 Mar 2026, 9:00 AM` | ✅ |

## Module: Admin Users
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-15-01 | Activity log | `DD MMM YYYY, h:mm A` | ✅ |

## Module: ClinicianProfileDrawer
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-16-01 | Appointment grid | `19 Mar, 9:00 AM` | ✅ |

## Module: Public Doctor Profile
| TC | Field | Expected | Status |
|----|-------|----------|--------|
| DT-17-01 | Booking confirmation | `19/03/2026 at 9:00 AM` | ✅ |

---

## Edge Case Suite
| TC | Scenario | Expected | Status |
|----|----------|----------|--------|
| DT-EC-01 | Null date field | `—` | ✅ |
| DT-EC-02 | Null time field | `—` or empty | ✅ |
| DT-EC-03 | Midnight `00:00` | `12:00 AM` | ✅ |
| DT-EC-04 | Noon `12:00` | `12:00 PM` | ✅ |
| DT-EC-05 | Late night `23:59` | `11:59 PM` | ✅ |
| DT-EC-06 | AM uppercase | `9:00 AM` (not `9:00 am`) | ✅ |
| DT-EC-07 | PM uppercase | `2:30 PM` (not `2:30 pm`) | ✅ |
| DT-EC-08 | Single digit hour | `9:00 AM` (not `09:00 AM`) | ✅ |
| DT-EC-09 | API param preserved | `YYYY-MM-DD` unchanged | ✅ |
| DT-EC-10 | HTML input preserved | `HH:mm` unchanged | ✅ |
| DT-EC-11 | Slot value preserved | `HH:mm` internal only | ✅ |
| DT-EC-12 | No raw ISO in UI | None visible | ✅ |
| DT-EC-13 | No 24h times in UI | None visible | ✅ |
| DT-EC-14 | No MMM DD US ordering | None visible | ✅ |

## Regression Checks (New — Session 4)
| TC | Description | Command | Status |
|----|-------------|---------|--------|
| DT-22-01 | `dateUtils.js formatTimeRange` output | Both sides `h:mm A` | ✅ |
| DT-22-02 | `dateUtils.js formatTime` output | `h:mm A` no leading zero | ✅ |
| DT-22-03 | Grep for `hh:mm` violations | 0 results (excluding API files) | ✅ |

---

## Pass Criteria

- ✅ Dates: `DD/MM/YYYY` or `DD MMM YYYY` (never US-ordered)
- ✅ Times: `h:mm A` — no leading zero, uppercase AM/PM
- ✅ Null-safe: `—` not crash
- ✅ No raw ISO strings in UI
- ✅ Backend-only formats (`YYYY-MM-DD`, `HH:mm`) preserved in API calls
- ✅ No `hh:mm` (2-digit hour) in display context
- ✅ Zero display violations confirmed by 4-scan grep audit
