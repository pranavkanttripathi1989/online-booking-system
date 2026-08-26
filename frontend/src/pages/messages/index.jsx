import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client'
import { useTheme, useMediaQuery } from '@mui/material'
import {
  Box, Typography, Avatar, Badge, IconButton, InputBase, Chip,
  List, ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Autocomplete, Tooltip, CircularProgress,
  Select, MenuItem, FormControl, Menu, Divider, Stack, InputLabel,
} from '@mui/material'
import { Helmet } from 'react-helmet-async'
import DoneAllRoundedIcon         from '@mui/icons-material/DoneAllRounded'
import DoneRoundedIcon            from '@mui/icons-material/DoneRounded'
import SearchRoundedIcon           from '@mui/icons-material/SearchRounded'
import AttachFileRoundedIcon       from '@mui/icons-material/AttachFileRounded'
import EmojiEmotionsOutlinedIcon   from '@mui/icons-material/EmojiEmotionsOutlined'
import SendRoundedIcon             from '@mui/icons-material/SendRounded'
import CallRoundedIcon             from '@mui/icons-material/CallRounded'
import VideocamRoundedIcon         from '@mui/icons-material/VideocamRounded'
import InfoOutlinedIcon            from '@mui/icons-material/InfoOutlined'
import ArrowBackRoundedIcon        from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon             from '@mui/icons-material/EditRounded'
import PersonRoundedIcon           from '@mui/icons-material/PersonRounded'
import LocalHospitalRoundedIcon    from '@mui/icons-material/LocalHospitalRounded'
import BadgeRoundedIcon            from '@mui/icons-material/BadgeRounded'
import CloseRoundedIcon            from '@mui/icons-material/CloseRounded'
import ContentPasteRoundedIcon     from '@mui/icons-material/ContentPasteRounded'
import DeleteOutlineRoundedIcon    from '@mui/icons-material/DeleteOutlineRounded'
import ApartmentRoundedIcon        from '@mui/icons-material/ApartmentRounded'
import { useAuth } from '../../context/AuthContext'
import ErrorBoundary from '../../components/ErrorBoundary'
import { formatRelativeTime } from '../../utils/dateTime'
import { CLINICS_QUERY } from '../../graphql/queries'

// backend/src/messages/** was built from scratch to match this page's exact
// shape (participants/last_message/last_activity/unread_count/messages) --
// see messages/entities/message.entity.ts. Was never wired up; this page ran
// on mocks/store.js exclusively until now (context/frontend-integration-audit.md).
const THREAD_FIELDS = gql`
  fragment ThreadSummaryFields on MessageThread {
    id
    participants { id name role }
    last_message
    last_activity
    unread_count
    assigned_to { id name role }
    sla_due_at
  }
`
const THREAD_DETAIL_FIELDS = gql`
  fragment ThreadDetailFields on MessageThread {
    id
    participants { id name role }
    last_message
    last_activity
    unread_count
    messages { id from_id from_name body sent_at read attachments { id file_ref mime_type original_filename } }
    assigned_to { id name role }
    sla_due_at
  }
`
const GET_THREADS = gql`
  query GetThreads {
    threads { ...ThreadSummaryFields }
  }
  ${THREAD_FIELDS}
`
const GET_THREAD = gql`
  query GetThread($id: ID!) {
    thread(id: $id) { ...ThreadDetailFields }
  }
  ${THREAD_DETAIL_FIELDS}
`
const GET_MESSAGEABLE_CONTACTS = gql`
  query GetMessageableContacts {
    messageableContacts { id name role }
  }
`
const SEND_MESSAGE = gql`
  mutation SendMessage($threadId: ID!, $body: String!) {
    sendMessage(threadId: $threadId, body: $body) { ...ThreadDetailFields }
  }
  ${THREAD_DETAIL_FIELDS}
`
const MARK_THREAD_READ = gql`
  mutation MarkThreadRead($threadId: ID!) {
    markThreadRead(threadId: $threadId)
  }
`
const CREATE_THREAD = gql`
  mutation CreateThread($input: CreateThreadInput!) {
    createThread(input: $input) { ...ThreadDetailFields }
  }
  ${THREAD_DETAIL_FIELDS}
`
// REQ043 -- shared-inbox assignment + SLA timer.
const ASSIGN_THREAD = gql`
  mutation AssignThread($threadId: ID!, $assigneeUserId: ID!) {
    assignThread(threadId: $threadId, assigneeUserId: $assigneeUserId) { ...ThreadDetailFields }
  }
  ${THREAD_DETAIL_FIELDS}
`
const MESSAGE_RECEIVED = gql`
  subscription MessageReceived($userId: ID!) {
    messageReceived(userId: $userId) { ...ThreadSummaryFields }
  }
  ${THREAD_FIELDS}
`

// REQ058 (US-MSG-01) -- department/branch-scoped threads, oversight view.
const GET_DEPARTMENTS_FOR_MESSAGES = gql`
  query GetDepartmentsForMessages { departments { id name clinic { id name } } }
`
const GET_DEPARTMENT_THREADS = gql`
  query GetDepartmentThreads($departmentId: ID!) {
    departmentThreads(departmentId: $departmentId) { ...ThreadSummaryFields }
  }
  ${THREAD_FIELDS}
`
// REQ058 (US-MSG-01) -- the DB-row-creation half of the two-step upload
// (message-attachments.controller.ts's own POST /upload handles the file
// itself; this persists the metadata row once a real message id exists).
const CREATE_MESSAGE_ATTACHMENT = gql`
  mutation CreateMessageAttachment($input: CreateMessageAttachmentInput!) {
    createMessageAttachment(input: $input) { id file_ref mime_type original_filename }
  }
`
// REQ058 (US-MSG-03) -- canned replies.
const GET_CANNED_REPLIES = gql`
  query GetCannedReplies { cannedReplies { id title body created_at } }
`
const CREATE_CANNED_REPLY = gql`
  mutation CreateCannedReply($input: CreateCannedReplyInput!) {
    createCannedReply(input: $input) { success userErrors { message } cannedReply { id title body } }
  }
`
const UPDATE_CANNED_REPLY = gql`
  mutation UpdateCannedReply($id: ID!, $input: UpdateCannedReplyInput!) {
    updateCannedReply(id: $id, input: $input) { success userErrors { message } cannedReply { id title body } }
  }
`
const DELETE_CANNED_REPLY = gql`
  mutation DeleteCannedReply($id: ID!) {
    deleteCannedReply(id: $id) { success userErrors { message } }
  }
`

// ─── Role colour map (SUG-MSG-005) ───────────────────────────────────────────
const ROLE_STYLE = {
  patient:   { bg: '#E8F5E9', color: '#2E7D32', label: 'Patient',   icon: PersonRoundedIcon },
  clinician: { bg: '#E3F2FD', color: '#1565C0', label: 'Clinician', icon: LocalHospitalRoundedIcon },
  staff:     { bg: '#F3E5F5', color: '#6A1B9A', label: 'Staff',     icon: BadgeRoundedIcon },
}

function getRoleStyle(role) {
  return ROLE_STYLE[role] ?? ROLE_STYLE.staff
}

// ─── Contact Item ─────────────────────────────────────────────────────────────
function ContactItem({ thread, active, currentUserId, onClick }) {
  const other  = thread.participants.find(p => p.id !== currentUserId) ?? thread.participants[0]
  const unread = thread.unread_count ?? 0
  const rs     = getRoleStyle(other?.role)
  const RoleIcon = rs.icon
  return (
    <ListItemButton
      onClick={onClick}
      selected={active}
      sx={{
        py: 1.5, px: 2, gap: 1.5,
        borderRadius: 2, mx: 1, mb: 0.5,
        borderLeft: active ? '3px solid #1A73E8' : '3px solid transparent',
        '&.Mui-selected': { bgcolor: '#E8F0FE' },
        '&:hover': { bgcolor: active ? '#E8F0FE' : '#F8F9FA' },
        transition: 'all 0.15s',
      }}
    >
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: active ? '#1A73E8' : '#E8F0FE', color: active ? '#fff' : '#1A73E8', fontSize: '0.8rem', fontWeight: 700 }}>
          {(other?.name ?? '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
        </Avatar>
        <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', bgcolor: '#0F9D58', border: '2px solid #fff' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
          <Typography variant="body2" fontWeight={unread ? 700 : 500} sx={{ color: '#202124' }} noWrap>
            {other?.name ?? 'Unknown'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#9AA0A6', flexShrink: 0, ml: 1 }}>
            {/* SUG-DT-S7-001: relative time ("2 min ago", "3 days ago", etc.) instead of a raw clock time */}
            {thread.last_activity ? formatRelativeTime(thread.last_activity) : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: unread ? '#202124' : '#9AA0A6', fontWeight: unread ? 600 : 400 }} noWrap>
            {thread.last_message}
          </Typography>
          {unread > 0 && (
            <Box sx={{ bgcolor: '#D93025', color: '#fff', borderRadius: '10px', px: 0.8, fontSize: '0.6rem', fontWeight: 700, ml: 0.5, minWidth: 18, textAlign: 'center', flexShrink: 0 }}>
              {unread}
            </Box>
          )}
        </Box>
        {/* SUG-MSG-005: Role type chip */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.4 }}>
          <RoleIcon sx={{ fontSize: '0.7rem', color: rs.color }} />
          <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 600, color: rs.color }}>
            {rs.label}
          </Typography>
        </Box>
      </Box>
    </ListItemButton>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, currentUserId }) {
  const isMe     = msg.from_id === currentUserId
  const initials = (msg.from_name ?? '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  // SUG-MSG-006: Delivery status indicator
  // Optimistic: our sent messages show "Sent" tick; older messages (read: true) show "Read" double-tick in teal
  const DeliveryIcon = msg.read ? DoneAllRoundedIcon : DoneRoundedIcon
  const deliveryColor = msg.read ? '#0F9D58' : '#9AA0A6'

  return (
    <Box sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', mb: 1.5 }}>
      {!isMe && (
        <Avatar sx={{ width: 30, height: 30, bgcolor: '#E8F0FE', color: '#1A73E8', fontSize: '0.7rem', fontWeight: 700, mr: 1, mt: 0.5, flexShrink: 0 }}>
          {initials}
        </Avatar>
      )}
      <Box sx={{ maxWidth: '72%' }}>
        <Box
          sx={{
            px: 2, py: 1.25,
            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            bgcolor: isMe ? '#1A73E8' : '#F1F3F4',
            color:   isMe ? '#FFFFFF' : '#202124',
            boxShadow: isMe ? '0 2px 8px rgba(26,115,232,0.20)' : '0 1px 4px rgba(32,33,36,0.06)',
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {msg.body}
          </Typography>
          {/* REQ058 (US-MSG-01) -- message attachments */}
          {msg.attachments?.length > 0 && (
            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
              {msg.attachments.map((a) => {
                const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
                return (
                  <Typography
                    key={a.id} component="a" href={`${apiBase}${a.file_ref}`} target="_blank" rel="noreferrer"
                    sx={{
                      fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'underline',
                      color: isMe ? 'rgba(255,255,255,0.9)' : '#1A73E8',
                    }}
                  >
                    <AttachFileRoundedIcon sx={{ fontSize: '0.85rem' }} /> {a.original_filename}
                  </Typography>
                )
              })}
            </Stack>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 0.4, mt: 0.4 }}>
          <Typography variant="caption" sx={{ color: '#9AA0A6', fontSize: '0.68rem' }}>
            {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Typography>
          {/* SUG-MSG-006: delivery tick for sent messages */}
          {isMe && (
            <Tooltip title={msg.read ? 'Read' : 'Sent'} placement="top">
              <DeliveryIcon sx={{ fontSize: '0.85rem', color: deliveryColor }} />
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  )
}

// ─── Thread header role chip ──────────────────────────────────────────────────
function RoleChip({ role }) {
  const rs = getRoleStyle(role)
  const Icon = rs.icon
  return (
    <Chip
      icon={<Icon sx={{ fontSize: '0.75rem !important', color: `${rs.color} !important` }} />}
      label={rs.label}
      size="small"
      sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: rs.bg, color: rs.color, border: 'none', borderRadius: 1 }}
    />
  )
}

// ─── MessagesPage ─────────────────────────────────────────────────────────────
function MessagesPage() {
  const { user, hasRole } = useAuth()
  const currentUserId = user?.id ?? user?.clinician?.id
  // REQ058 (US-MSG-01/03) -- department/clinic scoping, canned replies, and
  // the department-oversight view are all staff concepts; messageableContacts/
  // threads themselves stay open to every role, unchanged by this slice.
  const isManagerish = hasRole('manager') || hasRole('admin') || hasRole('super_admin')

  const [activeThreadId, setActiveThreadId] = useState(null)
  const [input,        setInput]        = useState('')
  const [searchQ,      setSearchQ]      = useState('')

  // BUG-MSG-002: Compose dialog state
  const [composeOpen,    setComposeOpen]    = useState(false)
  const [composeRecip,   setComposeRecip]   = useState(null)
  const [composeMsg,     setComposeMsg]     = useState('')
  // REQ058 (US-MSG-01) -- optional department/clinic scope on a new thread.
  const [composeDept,    setComposeDept]    = useState(null)
  const [composeClinic,  setComposeClinic]  = useState(null)

  // REQ058 (US-MSG-01) -- staged file for the message currently being composed.
  const [stagedFile, setStagedFile] = useState(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const fileInputRef = useRef(null)

  // REQ058 (US-MSG-03) -- canned-reply menu + inline management dialog.
  const [cannedMenuAnchor, setCannedMenuAnchor] = useState(null)
  const [manageCannedOpen, setManageCannedOpen] = useState(false)
  const [cannedEditingId,  setCannedEditingId]  = useState(null)
  const [cannedTitle,      setCannedTitle]      = useState('')
  const [cannedBody,       setCannedBody]       = useState('')

  // REQ058 (US-MSG-01) -- department-threads oversight filter (manager+ only;
  // threads() itself stays participant-only, unchanged by this slice).
  const [deptFilterOn, setDeptFilterOn] = useState(false)
  const [deptFilterId, setDeptFilterId] = useState('')

  const theme     = useTheme()
  const isMobile  = useMediaQuery(theme.breakpoints.down('sm'))
  const bottomRef = useRef(null)

  const { data: threadsData, refetch: refetchThreads } = useQuery(GET_THREADS, { fetchPolicy: 'cache-and-network' })
  const threads = threadsData?.threads ?? []

  const { data: deptThreadsData } = useQuery(GET_DEPARTMENT_THREADS, {
    variables: { departmentId: deptFilterId },
    skip: !isManagerish || !deptFilterOn || !deptFilterId,
    fetchPolicy: 'cache-and-network',
  })
  const threadsSource = useMemo(
    () => (deptFilterOn && deptFilterId) ? (deptThreadsData?.departmentThreads ?? []) : threads,
    [deptFilterOn, deptFilterId, deptThreadsData, threads],
  )

  const { data: activeThreadData, refetch: refetchActiveThread } = useQuery(GET_THREAD, {
    variables: { id: activeThreadId },
    skip: !activeThreadId,
    fetchPolicy: 'cache-and-network',
  })
  const activeThread = activeThreadData?.thread ?? null

  const { data: contactsData } = useQuery(GET_MESSAGEABLE_CONTACTS)
  const composeContacts = contactsData?.messageableContacts ?? []

  const { data: departmentsData } = useQuery(GET_DEPARTMENTS_FOR_MESSAGES, { skip: !isManagerish })
  const departments = departmentsData?.departments ?? []
  const { data: clinicsData } = useQuery(CLINICS_QUERY, { skip: !isManagerish })
  const clinicsList = clinicsData?.clinics ?? []

  const { data: cannedRepliesData, refetch: refetchCannedReplies } = useQuery(GET_CANNED_REPLIES, { skip: !isManagerish })
  const cannedReplies = cannedRepliesData?.cannedReplies ?? []

  const [sendMessageMutation]    = useMutation(SEND_MESSAGE)
  const [markThreadReadMutation] = useMutation(MARK_THREAD_READ)
  const [createThreadMutation]   = useMutation(CREATE_THREAD)
  const [assignThreadMutation]   = useMutation(ASSIGN_THREAD)
  const [createMessageAttachmentMutation] = useMutation(CREATE_MESSAGE_ATTACHMENT)
  const [createCannedReplyMutation] = useMutation(CREATE_CANNED_REPLY)
  const [updateCannedReplyMutation] = useMutation(UPDATE_CANNED_REPLY)
  const [deleteCannedReplyMutation] = useMutation(DELETE_CANNED_REPLY)

  // Real-time: replaces MockStore.subscribe's fake local pub-sub with the
  // real graphql-ws subscription (next-10-features-implementation-plan.md #10).
  useSubscription(MESSAGE_RECEIVED, {
    variables: { userId: currentUserId },
    skip: !currentUserId,
    onData: ({ data }) => {
      refetchThreads()
      if (data?.data?.messageReceived?.id === activeThreadId) refetchThreads()
    },
  })

  // Scroll to bottom of messages when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages?.length])

  // Set first thread as active on load (desktop only)
  useEffect(() => {
    if (!activeThreadId && threads.length > 0 && !isMobile) {
      setActiveThreadId(threads[0].id)
    }
  }, [threads]) // eslint-disable-line

  // BUG-MSG-004 fix: use useMemo instead of inline filter to avoid race condition
  // REQ058 (US-MSG-01) -- filters whichever list is currently active: the
  // normal participant-scoped threads, or (manager+, when toggled) the
  // department-oversight list.
  const displayedThreads = useMemo(() => {
    if (!searchQ.trim()) return threadsSource
    const q = searchQ.toLowerCase()
    return threadsSource.filter(t =>
      t.participants.some(p => p.name?.toLowerCase().includes(q)) ||
      t.last_message?.toLowerCase().includes(q)
    )
  }, [threadsSource, searchQ])


  // BUG-MSG-001 fix: mark thread as read when selected
  const handleSelectThread = (thread) => {
    setActiveThreadId(thread.id)
    if ((thread.unread_count ?? 0) > 0) {
      markThreadReadMutation({ variables: { threadId: thread.id } }).then(() => refetchThreads())
    }
  }

  // REQ058 (US-MSG-01) -- stages a file for the next send; the actual
  // upload happens in handleSend, once a real message id exists to attach
  // it to (matches this file's other REST-alongside-Apollo endpoints).
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (file) setStagedFile(file)
    e.target.value = ''
  }

  const uploadStagedAttachment = async (file, messageId) => {
    const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${apiBase}/message-attachments/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const upload = await res.json()
    if (!res.ok || !upload.file_ref) throw new Error(upload.message || 'Failed to upload attachment')
    await createMessageAttachmentMutation({
      variables: { input: { message_id: messageId, file_ref: upload.file_ref, mime_type: upload.mime_type, original_filename: file.name } },
    })
  }

  const handleSend = async () => {
    if ((!input.trim() && !stagedFile) || !activeThreadId) return
    const body = input.trim() || `📎 ${stagedFile.name}`
    const fileToUpload = stagedFile
    setInput('')
    setStagedFile(null)
    const { data } = await sendMessageMutation({ variables: { threadId: activeThreadId, body } })
    if (fileToUpload) {
      setUploadingAttachment(true)
      try {
        const messages = data?.sendMessage?.messages ?? []
        const newMessage = messages[messages.length - 1]
        if (newMessage) await uploadStagedAttachment(fileToUpload, newMessage.id)
        refetchActiveThread()
      } catch {
        // Message itself already sent successfully; the attachment upload
        // failing is a secondary, recoverable problem, not a reason to
        // pretend the send itself failed.
      } finally {
        setUploadingAttachment(false)
      }
    }
    refetchThreads()
  }

  // BUG-MSG-002: handle compose new message
  const handleComposeSend = async () => {
    if (!composeRecip || !composeMsg.trim()) return
    const existingThread = threads.find(t =>
      t.participants.some(p => p.id === composeRecip.id) &&
      t.participants.some(p => p.id === currentUserId)
    )
    if (existingThread) {
      await sendMessageMutation({ variables: { threadId: existingThread.id, body: composeMsg.trim() } })
      setActiveThreadId(existingThread.id)
    } else {
      // REQ058 (US-MSG-01) -- department_id, when chosen, already implies
      // its own clinic server-side; a separately-chosen clinic only applies
      // when no department was picked (a branch-wide, not department-
      // specific, thread).
      const { data } = await createThreadMutation({
        variables: { input: {
          participant_ids: [composeRecip.id],
          first_message: composeMsg.trim(),
          ...(composeDept ? { department_id: composeDept.id } : {}),
          ...(!composeDept && composeClinic ? { clinic_id: composeClinic.id } : {}),
        } },
      })
      setActiveThreadId(data.createThread.id)
    }
    refetchThreads()
    setComposeOpen(false)
    setComposeRecip(null)
    setComposeMsg('')
    setComposeDept(null)
    setComposeClinic(null)
  }

  // REQ058 (US-MSG-03) -- canned-reply management (inline mini-dialog, not
  // a separate page -- these are just title+body).
  const resetCannedForm = () => { setCannedEditingId(null); setCannedTitle(''); setCannedBody('') }

  const handleSaveCannedReply = async () => {
    if (!cannedTitle.trim() || !cannedBody.trim()) return
    if (cannedEditingId) {
      await updateCannedReplyMutation({ variables: { id: cannedEditingId, input: { title: cannedTitle.trim(), body: cannedBody.trim() } } })
    } else {
      await createCannedReplyMutation({ variables: { input: { title: cannedTitle.trim(), body: cannedBody.trim() } } })
    }
    resetCannedForm()
    refetchCannedReplies()
  }

  const handleDeleteCannedReply = async (id) => {
    await deleteCannedReplyMutation({ variables: { id } })
    refetchCannedReplies()
  }

  const activeMessages     = activeThread?.messages ?? []
  const otherParticipant   = activeThread?.participants?.find(p => p.id !== currentUserId) ?? activeThread?.participants?.[0]

  // BUG-MSG-003: mobile view — show conversation list OR thread
  const showList   = !isMobile || !activeThreadId
  const showThread = !isMobile || !!activeThreadId

  return (
    <Box className="page-enter" sx={{
      display: 'flex', gap: 0, overflow: 'hidden',
      mx: { xs: -2, sm: -2.5, md: -3 },
      mt: { xs: -2, sm: -2.5, md: -3 },
      mb: { xs: -2, sm: -2.5, md: -3 },
      // xs: subtract AppBar(67px) + mobile bottom-nav(~57px) + mobile padding(16px)
      // sm+: subtract AppBar(67px) only — bottom nav hidden above sm
      height: { xs: `calc(100vh - 67px - 73px)`, sm: `calc(100vh - 67px)`, md: `calc(100vh - 67px)` },
      p: { xs: 1, sm: 1.5, md: 2 },
      bgcolor: 'background.default',
    }}>
      <Helmet>
        <title>Messages — MediBook</title>
        <meta name="description" content="Messages inbox — view, search, and send messages to patients and clinicians." />
      </Helmet>

      {/* ── Contact List Pane ──────────────────────────────────────────────── */}
      {showList && (
        <Box sx={{
          width: { xs: '100%', sm: 320 }, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          bgcolor: '#fff', borderRadius: 3, border: '1px solid #E2E8F0',
          mr: { xs: 0, sm: 2 }, overflow: 'hidden',
        }}>
          {/* Header — search + compose inline (BUG-MSG-002 fix) */}
          <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #F5F7FA' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Search — BUG-MSG-004: useMemo filtered */}
              <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', gap: 1, bgcolor: '#F5F7FA', border: '1.5px solid #E2E8F0', borderRadius: 2, px: 1.5, py: 0.75 }}>
                <SearchRoundedIcon sx={{ color: '#B8C6D4', fontSize: '1rem' }} />
                <InputBase
                  id="messages-search"
                  placeholder="Search conversations…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  sx={{ flex: 1, fontSize: '0.82rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
              </Box>
              {/* Compose button — always visible inline with search */}
              <Tooltip title="New Message">
                <IconButton
                  id="compose-new-message-btn"
                  aria-label="New message"
                  size="small"
                  onClick={() => setComposeOpen(true)}
                  sx={{ color: '#006D77', bgcolor: '#E0F7F7', '&:hover': { bgcolor: '#C8F0F0' }, borderRadius: 1.5, flexShrink: 0, width: 36, height: 36 }}
                >
                  <EditRoundedIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
            {/* REQ058 (US-MSG-01) -- department-oversight filter, manager+
                only; threads() itself (the default view) is unaffected. */}
            {isManagerish && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25, flexWrap: 'wrap', rowGap: 0.75 }}>
                <Chip
                  icon={<ApartmentRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                  label="Department view"
                  size="small"
                  onClick={() => setDeptFilterOn((v) => !v)}
                  color={deptFilterOn ? 'primary' : 'default'}
                  variant={deptFilterOn ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                />
                {deptFilterOn && (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select
                      value={deptFilterId}
                      displayEmpty
                      onChange={(e) => setDeptFilterId(e.target.value)}
                      sx={{ fontSize: '0.78rem', '& .MuiSelect-select': { py: 0.5 } }}
                    >
                      <MenuItem value="" disabled>Choose department…</MenuItem>
                      {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            )}
          </Box>

          {/* Thread list */}
          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            <List disablePadding>
              {displayedThreads.map(t => (
                <ContactItem
                  key={t.id}
                  thread={t}
                  active={activeThreadId === t.id}
                  currentUserId={currentUserId}
                  onClick={() => handleSelectThread(t)}  // BUG-MSG-001 fix
                />
              ))}
              {displayedThreads.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <SearchRoundedIcon sx={{ fontSize: '2rem', color: '#B8C6D4', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No conversations found</Typography>
                  <Typography variant="caption" color="text.secondary">Try a different name or keyword</Typography>
                </Box>
              )}
            </List>
          </Box>
        </Box>
      )}

      {/* ── Active Conversation Pane ───────────────────────────────────────── */}
      {showThread && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {activeThreadId && !activeThread ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
          ) : activeThread ? (
            <>
              {/* Thread Header */}
              <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: '1px solid #F8F9FA', display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, bgcolor: '#fff' }}>
                {/* BUG-MSG-003: Mobile back button */}
                {isMobile && (
                  <IconButton
                    id="back-to-inbox-btn"
                    aria-label="Back to inbox"
                    size="small"
                    onClick={() => setActiveThreadId(null)}
                    sx={{ color: '#5F6368', mr: 0.5 }}
                  >
                    <ArrowBackRoundedIcon sx={{ fontSize: '1.2rem' }} />
                  </IconButton>
                )}
                <Box sx={{ position: 'relative' }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#E8F0FE', color: '#1A73E8', fontWeight: 700 }}>
                    {(otherParticipant?.name ?? '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                  </Avatar>
                  <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', bgcolor: '#0F9D58', border: '2px solid #fff' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} sx={{ color: '#202124', fontSize: '0.95rem' }} noWrap>{otherParticipant?.name ?? 'Unknown'}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#0F9D58', fontWeight: 600 }}>● Online</Typography>
                    {/* SUG-MSG-005: styled role chip in thread header */}
                    <RoleChip role={otherParticipant?.role ?? 'staff'} />
                  </Box>
                </Box>
                {/* REQ043 -- shared-inbox assignment + SLA timer */}
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                  {activeThread.sla_due_at && (
                    <Tooltip title={`SLA due ${new Date(activeThread.sla_due_at).toLocaleString('en-IN')}`}>
                      <Chip
                        size="small"
                        label={new Date(activeThread.sla_due_at) < new Date() ? 'SLA overdue' : 'SLA on track'}
                        sx={{
                          fontWeight: 700, fontSize: '0.7rem',
                          bgcolor: new Date(activeThread.sla_due_at) < new Date() ? '#FCE8E6' : '#E6F4EA',
                          color:   new Date(activeThread.sla_due_at) < new Date() ? '#B3261E' : '#188038',
                        }}
                      />
                    </Tooltip>
                  )}
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={activeThread.assigned_to?.id ?? ''}
                      displayEmpty
                      onChange={(e) => assignThreadMutation({ variables: { threadId: activeThread.id, assigneeUserId: e.target.value } })}
                      renderValue={(v) => v ? (activeThread.assigned_to?.name ?? 'Assigned') : 'Unassigned'}
                      sx={{ fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.75 } }}
                      aria-label="Assign conversation"
                    >
                      <MenuItem value="" disabled>Assign to…</MenuItem>
                      {composeContacts.map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
                  {[
                    { Icon: CallRoundedIcon,     title: 'Call',       label: 'Start voice call' },
                    { Icon: VideocamRoundedIcon, title: 'Video call', label: 'Start video call' },
                    { Icon: InfoOutlinedIcon,    title: 'Info',       label: 'Conversation info' },
                  ].map(({ Icon, title, label }, i) => (
                    <Tooltip key={i} title={title}>
                      <IconButton aria-label={label} size="small" sx={{ color: '#9AA0A6', '&:hover': { bgcolor: '#F8F9FA', color: '#1A73E8' }, transition: 'all 0.15s' }}>
                        <Icon sx={{ fontSize: '1.15rem' }} />
                      </IconButton>
                    </Tooltip>
                  ))}
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5, bgcolor: '#F5F7FA' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Typography variant="caption" sx={{ bgcolor: '#E2E8F0', color: '#7A96AE', borderRadius: 2, px: 2, py: 0.5, fontWeight: 600 }}>
                    {activeThread?.last_activity
                      ? new Date(activeThread.last_activity).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'short' })
                      : 'Today'}
                  </Typography>
                </Box>
                {activeMessages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId} />
                ))}
                <div ref={bottomRef} />
              </Box>

              {/* Input */}
              <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #F5F7FA', bgcolor: '#fff' }}>
                {/* REQ058 (US-MSG-01) -- staged attachment preview */}
                {stagedFile && (
                  <Chip
                    size="small"
                    icon={<AttachFileRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                    label={stagedFile.name}
                    onDelete={() => setStagedFile(null)}
                    deleteIcon={<CloseRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
                    sx={{ mb: 1, maxWidth: 260 }}
                  />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input type="file" ref={fileInputRef} hidden onChange={handleFileSelected} />
                  <Tooltip title="Attach file">
                    <IconButton aria-label="Attach file" size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#B8C6D4', '&:hover': { color: '#1565C7' } }}><AttachFileRoundedIcon sx={{ fontSize: '1.1rem' }} /></IconButton>
                  </Tooltip>
                  <Tooltip title="Emoji">
                    <IconButton aria-label="Insert emoji" size="small" sx={{ color: '#B8C6D4', '&:hover': { color: '#1565C7' } }}><EmojiEmotionsOutlinedIcon sx={{ fontSize: '1.1rem' }} /></IconButton>
                  </Tooltip>
                  {/* REQ058 (US-MSG-03) -- canned replies */}
                  {isManagerish && (
                    <Tooltip title="Insert canned reply">
                      <IconButton aria-label="Insert canned reply" size="small" onClick={(e) => setCannedMenuAnchor(e.currentTarget)} sx={{ color: '#B8C6D4', '&:hover': { color: '#1565C7' } }}>
                        <ContentPasteRoundedIcon sx={{ fontSize: '1.05rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Menu anchorEl={cannedMenuAnchor} open={!!cannedMenuAnchor} onClose={() => setCannedMenuAnchor(null)}>
                    {cannedReplies.length === 0 && <MenuItem disabled>No canned replies yet</MenuItem>}
                    {cannedReplies.map((cr) => (
                      <MenuItem key={cr.id} onClick={() => { setInput(cr.body); setCannedMenuAnchor(null) }}>
                        {cr.title}
                      </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem onClick={() => { setCannedMenuAnchor(null); resetCannedForm(); setManageCannedOpen(true) }}>
                      Manage canned replies…
                    </MenuItem>
                  </Menu>
                  <Box sx={{
                    flex: 1, bgcolor: '#F8F9FA', border: '1.5px solid #E8EAED', borderRadius: '12px', px: 2, py: 1,
                    display: 'flex', alignItems: 'center',
                    '&:focus-within': { borderColor: '#1A73E8', boxShadow: '0 0 0 3px rgba(26,115,232,0.12)', bgcolor: '#fff' },
                    transition: 'all 0.18s',
                  }}>
                    <InputBase
                      id="message-input"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Type a message…"
                      multiline maxRows={3}
                      sx={{ flex: 1, fontSize: { xs: '16px', sm: '0.875rem' }, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                  </Box>
                  <Tooltip title="Send">
                    <span>
                      <IconButton
                        id="send-message-btn"
                        onClick={handleSend} size="small" disabled={(!input.trim() && !stagedFile) || uploadingAttachment}
                        sx={{ bgcolor: (input.trim() || stagedFile) ? '#1A73E8' : '#E8EAED', color: (input.trim() || stagedFile) ? '#fff' : '#9AA0A6', width: 36, height: 36, transition: 'all 0.18s', '&:hover': { bgcolor: (input.trim() || stagedFile) ? '#1557B0' : '#E8EAED' } }}
                      >
                        {uploadingAttachment ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SendRoundedIcon sx={{ fontSize: '1rem' }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#B8C6D4' }}>
              <EditRoundedIcon sx={{ fontSize: '3rem', mb: 1.5, opacity: 0.4 }} />
              <Typography variant="h6" fontWeight={600}>Select a conversation</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>Choose from the left to start messaging</Typography>
              <Button
                variant="outlined" startIcon={<EditRoundedIcon />} size="small"
                onClick={() => setComposeOpen(true)}
                sx={{ mt: 2, borderRadius: 2, textTransform: 'none', color: '#006D77', borderColor: '#006D77', '&:hover': { bgcolor: '#E0F7F7', borderColor: '#006D77' } }}
              >
                New Message
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* ── Compose New Message Dialog (BUG-MSG-002 fix) ─────────────────────── */}
      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>New Message</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Autocomplete
            id="compose-recipient"
            options={composeContacts}
            getOptionLabel={opt => `${opt.name} (${opt.role})`}
            groupBy={opt => opt.role.charAt(0).toUpperCase() + opt.role.slice(1) + 's'}
            value={composeRecip}
            onChange={(_, v) => setComposeRecip(v)}
            renderOption={(props, option) => {
              const rs = getRoleStyle(option.role)
              const RIcon = rs.icon
              return (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RIcon sx={{ fontSize: '1rem', color: rs.color }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                    <Typography variant="caption" sx={{ color: rs.color }}>{rs.label}</Typography>
                  </Box>
                </Box>
              )
            }}
            renderInput={params => (
              <TextField {...params} label="To — patient, clinician, or staff" size="small" autoFocus fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            )}
            sx={{ mb: 2 }}
          />
          {/* REQ058 (US-MSG-01) -- optional department/branch scope, staff only.
              Picking a department implies its own clinic server-side, so the
              clinic select is only meaningful when no department is chosen. */}
          {isManagerish && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="compose-department-label">Department (optional)</InputLabel>
                <Select
                  labelId="compose-department-label"
                  label="Department (optional)"
                  value={composeDept?.id ?? ''}
                  onChange={(e) => {
                    const dept = departments.find((d) => d.id === e.target.value) ?? null
                    setComposeDept(dept)
                    if (dept) setComposeClinic(null)
                  }}
                  displayEmpty
                >
                  <MenuItem value="">None</MenuItem>
                  {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth disabled={!!composeDept}>
                <InputLabel id="compose-clinic-label">Clinic / branch (optional)</InputLabel>
                <Select
                  labelId="compose-clinic-label"
                  label="Clinic / branch (optional)"
                  value={composeClinic?.id ?? ''}
                  onChange={(e) => setComposeClinic(clinicsList.find((c) => c.id === e.target.value) ?? null)}
                  displayEmpty
                >
                  <MenuItem value="">None</MenuItem>
                  {clinicsList.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          )}
          <TextField
            id="compose-message-body"
            label="Message"
            multiline rows={4} fullWidth size="small"
            value={composeMsg}
            onChange={e => setComposeMsg(e.target.value)}
            placeholder="Type your message…"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setComposeOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            id="compose-send-btn"
            variant="contained" disabled={!composeRecip || !composeMsg.trim()}
            onClick={handleComposeSend}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#006D77', '&:hover': { bgcolor: '#005B64' } }}
            startIcon={<SendRoundedIcon />}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>

      {/* REQ058 (US-MSG-03) -- canned-reply management (inline, not a
          separate page -- these are just a title and a body). */}
      <Dialog open={manageCannedOpen} onClose={() => { setManageCannedOpen(false); resetCannedForm() }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Manage Canned Replies</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={1.5} sx={{ mb: 2.5, maxHeight: 260, overflowY: 'auto' }}>
            {cannedReplies.length === 0 && (
              <Typography variant="body2" color="text.secondary">No canned replies yet — add one below.</Typography>
            )}
            {cannedReplies.map((cr) => (
              <Box key={cr.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.25, borderRadius: 2, border: '1px solid #F1F3F4' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>{cr.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {cr.body}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => { setCannedEditingId(cr.id); setCannedTitle(cr.title); setCannedBody(cr.body) }}>
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteCannedReply(cr.id)}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            {cannedEditingId ? 'Edit reply' : 'Add new reply'}
          </Typography>
          <Stack spacing={1.5}>
            <TextField label="Title" size="small" fullWidth value={cannedTitle} onChange={(e) => setCannedTitle(e.target.value)} />
            <TextField label="Reply text" size="small" fullWidth multiline rows={3} value={cannedBody} onChange={(e) => setCannedBody(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {cannedEditingId && <Button onClick={resetCannedForm} sx={{ textTransform: 'none' }}>Cancel edit</Button>}
          <Button onClick={() => { setManageCannedOpen(false); resetCannedForm() }} sx={{ textTransform: 'none' }}>Close</Button>
          <Button
            variant="contained" disabled={!cannedTitle.trim() || !cannedBody.trim()}
            onClick={handleSaveCannedReply}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#006D77', '&:hover': { bgcolor: '#005B64' } }}
          >
            {cannedEditingId ? 'Save changes' : 'Add reply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Typing dot animation */}
      <style>{`
        @keyframes typingDot {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </Box>
  )
}

// ErrorBoundary wrapper for crash resilience
export default function MessagesPageWithBoundary() {
  return <ErrorBoundary><MessagesPage /></ErrorBoundary>
}
