/**
 * MOCK MESSAGES — 8 threads, 35 messages (Section 4, Feature 12)
 * MOCK NOTIFICATIONS — 20 records
 */

export const MESSAGE_THREADS = [
  {
    id: 'thread-1',
    participants: [
      { id: 'pt-1',  name: 'Alice Thompson',   role: 'patient',   avatar: 'https://i.pravatar.cc/150?img=1' },
      { id: 'cln-1', name: 'Dr. Sarah Mitchell', role: 'clinician', avatar: 'https://i.pravatar.cc/150?img=47' },
    ],
    last_message: "Yes Thursday works, I've booked the 9am slot. Thank you!",
    last_activity: '2026-03-13T14:22:00Z',
    unread_count: 0,
    messages: [
      { id: 'msg-1', from_id: 'pt-1',  from_name: 'Alice Thompson',    from_role: 'patient',   body: "Hi Dr. Mitchell, I've been feeling dizzy the past two days. Should I come in?",                             sent_at: '2026-03-12T10:00:00Z', read: true },
      { id: 'msg-2', from_id: 'cln-1', from_name: 'Dr. Sarah Mitchell', from_role: 'clinician', body: 'Hi Alice, thanks for reaching out. How severe on a scale of 1–10, and any other symptoms?',                 sent_at: '2026-03-12T10:30:00Z', read: true },
      { id: 'msg-3', from_id: 'pt-1',  from_name: 'Alice Thompson',    from_role: 'patient',   body: 'About a 4/10. Also slightly nauseous in the morning. No fever.',                                             sent_at: '2026-03-12T11:00:00Z', read: true },
      { id: 'msg-4', from_id: 'cln-1', from_name: 'Dr. Sarah Mitchell', from_role: 'clinician', body: "This could be related to your blood pressure medication. Let's book you in for a BP check. Can you do Thursday morning?", sent_at: '2026-03-13T09:00:00Z', read: true },
      { id: 'msg-5', from_id: 'pt-1',  from_name: 'Alice Thompson',    from_role: 'patient',   body: "Yes Thursday works, I've booked the 9am slot. Thank you!",                                                   sent_at: '2026-03-13T14:22:00Z', read: true },
    ],
  },
  {
    id: 'thread-2',
    participants: [
      { id: 'pt-6',  name: 'Dmitri Volkov',     role: 'patient',   avatar: 'https://i.pravatar.cc/150?img=6' },
      { id: 'cln-6', name: 'Dr. Ben Whitfield',  role: 'clinician', avatar: 'https://i.pravatar.cc/150?img=59' },
    ],
    last_message: 'Common issue. Try anchoring to physical sensation — press your feet firmly on the floor as you breathe. See you next Monday.',
    last_activity: '2026-03-12T18:40:00Z',
    unread_count: 1,
    messages: [
      { id: 'msg-6', from_id: 'pt-6',  from_name: 'Dmitri Volkov',    from_role: 'patient',   body: "Dr. Whitfield, I'm struggling with the exercises from our last session.",           sent_at: '2026-03-11T14:00:00Z', read: true },
      { id: 'msg-7', from_id: 'cln-6', from_name: 'Dr. Ben Whitfield', from_role: 'clinician', body: "That's okay Dmitri, these things take time. Which exercise is giving you trouble?",   sent_at: '2026-03-11T16:00:00Z', read: true },
      { id: 'msg-8', from_id: 'pt-6',  from_name: 'Dmitri Volkov',    from_role: 'patient',   body: 'The breathing exercises. My mind keeps wandering.',                                   sent_at: '2026-03-12T09:00:00Z', read: true },
      { id: 'msg-9', from_id: 'cln-6', from_name: 'Dr. Ben Whitfield', from_role: 'clinician', body: 'Common issue. Try anchoring to physical sensation — press your feet firmly on the floor as you breathe. See you next Monday.', sent_at: '2026-03-12T18:40:00Z', read: false },
    ],
  },
  {
    id: 'thread-3',
    participants: [
      { id: 'pt-12', name: 'Hassan Malik',       role: 'patient',   avatar: 'https://i.pravatar.cc/150?img=12' },
      { id: 'cln-4', name: 'Dr. Tom Greaves',     role: 'clinician', avatar: 'https://i.pravatar.cc/150?img=33' },
    ],
    last_message: 'Brilliant, thank you!',
    last_activity: '2026-03-11T09:15:00Z',
    unread_count: 0,
    messages: [
      { id: 'msg-10', from_id: 'pt-12', from_name: 'Hassan Malik',    from_role: 'patient',   body: 'My prescription for the cream has run out. Can I get a repeat?',                       sent_at: '2026-03-10T09:00:00Z', read: true },
      { id: 'msg-11', from_id: 'cln-4', from_name: 'Dr. Tom Greaves', from_role: 'clinician', body: "Of course. I've sent a repeat to your pharmacy. Should be ready in 24 hours.",         sent_at: '2026-03-10T11:00:00Z', read: true },
      { id: 'msg-12', from_id: 'pt-12', from_name: 'Hassan Malik',    from_role: 'patient',   body: 'Brilliant, thank you!',                                                                 sent_at: '2026-03-11T09:15:00Z', read: true },
    ],
  },
  {
    id: 'thread-4',
    participants: [
      { id: 'pt-5',  name: 'Sophie Turner',      role: 'patient',   avatar: 'https://i.pravatar.cc/150?img=5' },
      { id: 'cln-4', name: 'Dr. Tom Greaves',     role: 'clinician', avatar: 'https://i.pravatar.cc/150?img=33' },
    ],
    last_message: 'Perfect, see you then!',
    last_activity: '2026-03-15T16:00:00Z',
    unread_count: 0,
    messages: [
      { id: 'msg-13', from_id: 'pt-5',  from_name: 'Sophie Turner',   from_role: 'patient',   body: 'Just confirming my appointment tomorrow at 11am?',                                      sent_at: '2026-03-15T10:00:00Z', read: true },
      { id: 'msg-14', from_id: 'cln-4', from_name: 'Dr. Tom Greaves', from_role: 'clinician', body: 'Yes confirmed, Consultation A. Please arrive 5 minutes early.',                          sent_at: '2026-03-15T14:00:00Z', read: true },
      { id: 'msg-15', from_id: 'pt-5',  from_name: 'Sophie Turner',   from_role: 'patient',   body: 'Perfect, see you then!',                                                                 sent_at: '2026-03-15T16:00:00Z', read: true },
    ],
  },
  {
    id: 'thread-5',
    participants: [
      { id: 'pt-9',  name: 'Mei-Lin Zhang',      role: 'patient',   avatar: 'https://i.pravatar.cc/150?img=9' },
      { id: 'cln-7', name: 'Dr. Amara Diallo',   role: 'clinician', avatar: 'https://i.pravatar.cc/150?img=41' },
    ],
    last_message: 'Will do, thank you.',
    last_activity: '2026-03-14T11:30:00Z',
    unread_count: 0,
    messages: [
      { id: 'msg-16', from_id: 'pt-9',  from_name: 'Mei-Lin Zhang',   from_role: 'patient',   body: "Hi, I'd like to continue physio — is there availability next week?",                    sent_at: '2026-03-13T09:00:00Z', read: true },
      { id: 'msg-17', from_id: 'cln-7', from_name: 'Dr. Amara Diallo', from_role: 'clinician', body: 'Hi Mei-Lin! I have slots Tuesday 10am or Thursday 2pm.',                               sent_at: '2026-03-13T11:00:00Z', read: true },
      { id: 'msg-18', from_id: 'pt-9',  from_name: 'Mei-Lin Zhang',   from_role: 'patient',   body: 'Thursday 2pm please.',                                                                   sent_at: '2026-03-14T09:00:00Z', read: true },
      { id: 'msg-19', from_id: 'cln-7', from_name: 'Dr. Amara Diallo', from_role: 'clinician', body: 'Booked! See you then. Please wear comfortable clothing.',                               sent_at: '2026-03-14T10:00:00Z', read: true },
      { id: 'msg-20', from_id: 'pt-9',  from_name: 'Mei-Lin Zhang',   from_role: 'patient',   body: 'Will do, thank you.',                                                                    sent_at: '2026-03-14T11:30:00Z', read: true },
    ],
  },
  {
    id: 'thread-6',
    participants: [
      { id: 'pt-11', name: 'Ingrid Larsson',     role: 'patient',   avatar: 'https://i.pravatar.cc/150?img=11' },
      { id: 'cln-5', name: 'Lucy Harrington',    role: 'clinician', avatar: 'https://i.pravatar.cc/150?img=44' },
    ],
    last_message: "Consistency is key but don't be hard on yourself. See you Friday.",
    last_activity: '2026-03-15T09:00:00Z',
    unread_count: 2,
    messages: [
      { id: 'msg-21', from_id: 'pt-11', from_name: 'Ingrid Larsson',   from_role: 'patient',   body: 'Lucy, my back has been much better this week!',                                          sent_at: '2026-03-14T08:00:00Z', read: true },
      { id: 'msg-22', from_id: 'cln-5', from_name: 'Lucy Harrington',  from_role: 'clinician', body: "That's great news Ingrid! Keep doing the morning exercises.",                           sent_at: '2026-03-14T09:00:00Z', read: true },
      { id: 'msg-23', from_id: 'pt-11', from_name: 'Ingrid Larsson',   from_role: 'patient',   body: 'I missed them yesterday but got back on track today.',                                   sent_at: '2026-03-15T08:00:00Z', read: false },
      { id: 'msg-24', from_id: 'cln-5', from_name: 'Lucy Harrington',  from_role: 'clinician', body: "Consistency is key but don't be hard on yourself. See you Friday.",                     sent_at: '2026-03-15T09:00:00Z', read: false },
    ],
  },
  {
    id: 'thread-7',
    participants: [
      { id: 'pt-14', name: 'Roberto Silva',      role: 'patient',   avatar: 'https://i.pravatar.cc/150?img=14' },
      { id: 'cln-3', name: 'Dr. Priya Sharma',   role: 'clinician', avatar: 'https://i.pravatar.cc/150?img=49' },
    ],
    last_message: "Good luck. I'll review the results with you at our March 18 appointment.",
    last_activity: '2026-03-13T15:45:00Z',
    unread_count: 0,
    messages: [
      { id: 'msg-25', from_id: 'pt-14', from_name: 'Roberto Silva',    from_role: 'patient',   body: 'Dr. Sharma, should I stop the beta-blockers before my stress test?',                    sent_at: '2026-03-12T09:00:00Z', read: true },
      { id: 'msg-26', from_id: 'cln-3', from_name: 'Dr. Priya Sharma', from_role: 'clinician', body: 'Please don\'t stop any medication without consulting first. Keep taking them as prescribed.', sent_at: '2026-03-12T11:00:00Z', read: true },
      { id: 'msg-27', from_id: 'pt-14', from_name: 'Roberto Silva',    from_role: 'patient',   body: 'Sorry, I should have called. The test is on Wednesday.',                                 sent_at: '2026-03-12T14:00:00Z', read: true },
      { id: 'msg-28', from_id: 'cln-3', from_name: 'Dr. Priya Sharma', from_role: 'clinician', body: 'No problem. For the stress test, continue all medications. Stay hydrated and no caffeine that morning.', sent_at: '2026-03-13T09:00:00Z', read: true },
      { id: 'msg-29', from_id: 'pt-14', from_name: 'Roberto Silva',    from_role: 'patient',   body: 'Understood, thank you doctor.',                                                           sent_at: '2026-03-13T11:00:00Z', read: true },
      { id: 'msg-30', from_id: 'cln-3', from_name: 'Dr. Priya Sharma', from_role: 'clinician', body: "Good luck. I'll review the results with you at our March 18 appointment.",               sent_at: '2026-03-13T15:45:00Z', read: true },
    ],
  },
  {
    id: 'thread-8',
    participants: [
      { id: 'pt-3',  name: 'Fatima Al-Hassan',  role: 'patient',   avatar: 'https://i.pravatar.cc/150?img=3' },
      { id: 'cln-3', name: 'Dr. Priya Sharma',   role: 'clinician', avatar: 'https://i.pravatar.cc/150?img=49' },
    ],
    last_message: "I've just booked for tomorrow 10am. Should I go to A&E tonight?",
    last_activity: '2026-03-15T21:30:00Z',
    unread_count: 1,
    messages: [
      { id: 'msg-31', from_id: 'pt-3',  from_name: 'Fatima Al-Hassan', from_role: 'patient',   body: "Dr. Sharma, I've been getting palpitations in the evenings.",                           sent_at: '2026-03-14T19:00:00Z', read: true },
      { id: 'msg-32', from_id: 'cln-3', from_name: 'Dr. Priya Sharma', from_role: 'clinician', body: 'How long have these been happening? Are they accompanied by breathlessness?',            sent_at: '2026-03-15T09:00:00Z', read: true },
      { id: 'msg-33', from_id: 'pt-3',  from_name: 'Fatima Al-Hassan', from_role: 'patient',   body: 'About 5 days. No breathlessness, but I feel anxious during them.',                      sent_at: '2026-03-15T10:00:00Z', read: true },
      { id: 'msg-34', from_id: 'cln-3', from_name: 'Dr. Priya Sharma', from_role: 'clinician', body: "Please book an urgent appointment — I want to run an ECG. Don't wait for your scheduled slot.", sent_at: '2026-03-15T14:00:00Z', read: true },
      { id: 'msg-35', from_id: 'pt-3',  from_name: 'Fatima Al-Hassan', from_role: 'patient',   body: "I've just booked for tomorrow 10am. Should I go to A&E tonight?",                       sent_at: '2026-03-15T21:30:00Z', read: false },
    ],
  },
]

// ─── Notifications (20 records for u-3 / cln-1) ─────────────────────────────
export const NOTIFICATIONS = [
  { id: 'notif-1',  type: 'appointment_confirmed', title: 'Appointment confirmed',        body: 'Alice Thompson - 16 Mar 09:00',      read: true,  created_at: '2026-03-14T08:00:00Z' },
  { id: 'notif-2',  type: 'appointment_confirmed', title: 'Appointment confirmed',        body: 'Marcus Chen - 16 Mar 09:30',          read: true,  created_at: '2026-03-14T08:05:00Z' },
  { id: 'notif-3',  type: 'new_message',          title: 'New message from Alice Thompson', body: 'Hi Dr. Mitchell, I\'ve been feeling dizzy...', read: true,  created_at: '2026-03-12T10:00:00Z' },
  { id: 'notif-4',  type: 'appointment_reminder', title: 'Reminder: 4 appointments tomorrow', body: 'Monday 16 March',               read: false, created_at: '2026-03-15T18:00:00Z' },
  { id: 'notif-5',  type: 'review_received',      title: 'New 5-star review',             body: 'From Hassan Malik',                  read: false, created_at: '2026-03-05T12:00:00Z' },
  { id: 'notif-6',  type: 'appointment_cancelled',title: 'Appointment cancelled',         body: 'Charles Beaumont - Mar 12',           read: true,  created_at: '2026-03-12T07:30:00Z' },
  { id: 'notif-7',  type: 'new_message',          title: 'New message from Fatima Al-Hassan', body: "I've been getting palpitations...", read: false, created_at: '2026-03-15T21:30:00Z' },
  { id: 'notif-8',  type: 'appointment_confirmed', title: 'Appointment confirmed',        body: 'Sophie Turner - 21 Mar 10:00',        read: false, created_at: '2026-03-15T09:00:00Z' },
  { id: 'notif-9',  type: 'no_show',             title: 'Patient no-show',               body: 'Ingrid Larsson - Mar 08 14:00',        read: true,  created_at: '2026-03-08T14:20:00Z' },
  { id: 'notif-10', type: 'appointment_reminder', title: 'Tomorrow: 6 appointments',     body: 'Starting at 09:00',                    read: true,  created_at: '2026-03-15T07:00:00Z' },
  { id: 'notif-11', type: 'new_message',          title: 'New message from Ingrid Larsson', body: 'Lucy, my back has been much better...', read: false, created_at: '2026-03-15T08:00:00Z' },
  { id: 'notif-12', type: 'review_received',      title: 'New 4-star review',             body: 'From Roberto Silva',                 read: true,  created_at: '2026-03-04T16:00:00Z' },
  { id: 'notif-13', type: 'appointment_confirmed', title: 'Appointment confirmed',        body: 'David Okonkwo - 19 Mar 09:00',        read: true,  created_at: '2026-03-14T10:00:00Z' },
  { id: 'notif-14', type: 'appointment_confirmed', title: 'Appointment confirmed',        body: 'Elena Vasquez - 21 Mar 10:00',        read: false, created_at: '2026-03-15T10:00:00Z' },
  { id: 'notif-15', type: 'system',               title: 'Platform update',               body: 'MediBook v2.4 deployed successfully',  read: true,  created_at: '2026-03-10T06:00:00Z' },
]
