import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client'
import { useTheme, useMediaQuery } from '@mui/material'
import {
  Box, Typography, Avatar, Badge, IconButton, InputBase, Chip,
  List, ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Autocomplete, Tooltip, CircularProgress,
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
import { useAuth } from '../../context/AuthContext'
import ErrorBoundary from '../../components/ErrorBoundary'
import { formatRelativeTime } from '../../utils/dateTime'

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
  }
`
const THREAD_DETAIL_FIELDS = gql`
  fragment ThreadDetailFields on MessageThread {
    id
    participants { id name role }
    last_message
    last_activity
    unread_count
    messages { id from_id from_name body sent_at read }
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
const MESSAGE_RECEIVED = gql`
  subscription MessageReceived($userId: ID!) {
    messageReceived(userId: $userId) { ...ThreadSummaryFields }
  }
  ${THREAD_FIELDS}
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
  const { user } = useAuth()
  const currentUserId = user?.id ?? user?.clinician?.id

  const [activeThreadId, setActiveThreadId] = useState(null)
  const [input,        setInput]        = useState('')
  const [searchQ,      setSearchQ]      = useState('')

  // BUG-MSG-002: Compose dialog state
  const [composeOpen,    setComposeOpen]    = useState(false)
  const [composeRecip,   setComposeRecip]   = useState(null)
  const [composeMsg,     setComposeMsg]     = useState('')

  const theme     = useTheme()
  const isMobile  = useMediaQuery(theme.breakpoints.down('sm'))
  const bottomRef = useRef(null)

  const { data: threadsData, refetch: refetchThreads } = useQuery(GET_THREADS, { fetchPolicy: 'cache-and-network' })
  const threads = threadsData?.threads ?? []

  const { data: activeThreadData } = useQuery(GET_THREAD, {
    variables: { id: activeThreadId },
    skip: !activeThreadId,
    fetchPolicy: 'cache-and-network',
  })
  const activeThread = activeThreadData?.thread ?? null

  const { data: contactsData } = useQuery(GET_MESSAGEABLE_CONTACTS)
  const composeContacts = contactsData?.messageableContacts ?? []

  const [sendMessageMutation]    = useMutation(SEND_MESSAGE)
  const [markThreadReadMutation] = useMutation(MARK_THREAD_READ)
  const [createThreadMutation]   = useMutation(CREATE_THREAD)

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
  const displayedThreads = useMemo(() => {
    if (!searchQ.trim()) return threads
    const q = searchQ.toLowerCase()
    return threads.filter(t =>
      t.participants.some(p => p.name?.toLowerCase().includes(q)) ||
      t.last_message?.toLowerCase().includes(q)
    )
  }, [threads, searchQ])


  // BUG-MSG-001 fix: mark thread as read when selected
  const handleSelectThread = (thread) => {
    setActiveThreadId(thread.id)
    if ((thread.unread_count ?? 0) > 0) {
      markThreadReadMutation({ variables: { threadId: thread.id } }).then(() => refetchThreads())
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !activeThreadId) return
    setInput('')
    await sendMessageMutation({ variables: { threadId: activeThreadId, body: input.trim() } })
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
      const { data } = await createThreadMutation({
        variables: { input: { participant_ids: [composeRecip.id], first_message: composeMsg.trim() } },
      })
      setActiveThreadId(data.createThread.id)
    }
    refetchThreads()
    setComposeOpen(false)
    setComposeRecip(null)
    setComposeMsg('')
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
              <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #F5F7FA', bgcolor: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Attach file">
                  <IconButton aria-label="Attach file" size="small" sx={{ color: '#B8C6D4', '&:hover': { color: '#1565C7' } }}><AttachFileRoundedIcon sx={{ fontSize: '1.1rem' }} /></IconButton>
                </Tooltip>
                <Tooltip title="Emoji">
                  <IconButton aria-label="Insert emoji" size="small" sx={{ color: '#B8C6D4', '&:hover': { color: '#1565C7' } }}><EmojiEmotionsOutlinedIcon sx={{ fontSize: '1.1rem' }} /></IconButton>
                </Tooltip>
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
                      onClick={handleSend} size="small" disabled={!input.trim()}
                      sx={{ bgcolor: input.trim() ? '#1A73E8' : '#E8EAED', color: input.trim() ? '#fff' : '#9AA0A6', width: 36, height: 36, transition: 'all 0.18s', '&:hover': { bgcolor: input.trim() ? '#1557B0' : '#E8EAED' } }}
                    >
                      <SendRoundedIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </span>
                </Tooltip>
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
