import { useState, useEffect, useRef } from 'react'
import { useTheme, useMediaQuery } from '@mui/material'
import {
  Box, Typography, Avatar, Badge, IconButton, InputBase, Chip,
  List, ListItemButton,
} from '@mui/material'
import { Helmet } from 'react-helmet-async'
import DoneAllRoundedIcon         from '@mui/icons-material/DoneAllRounded'
import SearchRoundedIcon           from '@mui/icons-material/SearchRounded'
import AttachFileRoundedIcon       from '@mui/icons-material/AttachFileRounded'
import EmojiEmotionsOutlinedIcon   from '@mui/icons-material/EmojiEmotionsOutlined'
import SendRoundedIcon             from '@mui/icons-material/SendRounded'
import CallRoundedIcon             from '@mui/icons-material/CallRounded'
import VideocamRoundedIcon         from '@mui/icons-material/VideocamRounded'
import InfoOutlinedIcon            from '@mui/icons-material/InfoOutlined'
import ArrowBackRoundedIcon        from '@mui/icons-material/ArrowBackRounded'
import * as MockStore from '../../mocks/store'
import { useAuth } from '../../context/AuthContext'

// ─── Contact Item ─────────────────────────────────────────────────────────────
function ContactItem({ thread, active, currentUserId, onClick }) {
  // Pick the "other" participant name for display
  const other = thread.participants.find(p => p.id !== currentUserId) ?? thread.participants[0]
  const unread = thread.unread_count ?? 0
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
            {thread.last_activity ? new Date(thread.last_activity).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
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
      </Box>
    </ListItemButton>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, currentUserId }) {
  const isMe = msg.from_id === currentUserId
  const initials = (msg.from_name ?? '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
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
          {isMe && <DoneAllRoundedIcon sx={{ fontSize: '0.85rem', color: msg.read ? '#0F9D58' : '#9AA0A6' }} />}
        </Box>
      </Box>
    </Box>
  )
}

// ─── MessagesPage ─────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { user } = useAuth()
  // Use u-3 (clinician) as default current user when auth not available
  const currentUserId = user?.id ?? user?.clinician?.id ?? 'u-3'

  const [threads,       setThreads]       = useState(() => MockStore.getStore().message_threads)
  const [activeThread,  setActiveThread]  = useState(null)
  const [input,         setInput]         = useState('')
  const [searchQ,       setSearchQ]       = useState('')
  const theme     = useTheme()
  const isMobile  = useMediaQuery(theme.breakpoints.down('sm'))
  const bottomRef = useRef(null)

  // Reload threads when store updates
  useEffect(() => {
    const unsub = MockStore.subscribe(() => {
      setThreads([...MockStore.getStore().message_threads])
      if (activeThread) {
        setActiveThread(MockStore.getThreadById(activeThread.id))
      }
    })
    return unsub
  }, [activeThread])

  // Scroll to bottom of messages when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages?.length])

  // Set first thread as active on load
  useEffect(() => {
    if (!activeThread && threads.length > 0) {
      setActiveThread(threads[0])
    }
  }, [threads]) // eslint-disable-line

  const displayedThreads = searchQ
    ? threads.filter(t => t.participants.some(p => p.name?.toLowerCase().includes(searchQ.toLowerCase())))
    : threads

  const handleSend = () => {
    if (!input.trim() || !activeThread) return
    MockStore.sendMessage(activeThread.id, currentUserId, input.trim())
    setInput('')
  }

  const activeMessages = activeThread?.messages ?? []
  const otherParticipant = activeThread?.participants?.find(p => p.id !== currentUserId) ?? activeThread?.participants?.[0]

  return (
    <Box className="page-enter" sx={{ height: 'calc(100vh - 64px - 48px)', display: 'flex', gap: 0, overflow: 'hidden' }}>
      <Helmet><title>Messages — MediBook</title></Helmet>

      {/* ── Contact List Pane ──────────────────────────────────────────────── */}
      <Box sx={{
        width: { xs: '100%', sm: 320 }, flexShrink: 0,
        display: { xs: activeThread ? 'none' : 'flex', sm: 'flex' },
        flexDirection: 'column',
        bgcolor: '#fff', borderRadius: 3, border: '1px solid #E2E8F0',
        mr: 2, overflow: 'hidden',
      }}>
        {/* Header */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #F5F7FA' }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#0D1B2E', mb: 1.5 }}>Messages</Typography>
          {/* Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F5F7FA', border: '1.5px solid #E2E8F0', borderRadius: 2, px: 1.5, py: 0.75 }}>
            <SearchRoundedIcon sx={{ color: '#B8C6D4', fontSize: '1rem' }} />
            <InputBase
              placeholder="Search conversations…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              sx={{ flex: 1, fontSize: '0.82rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
          </Box>
        </Box>

        {/* Thread list */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
          <List disablePadding>
            {displayedThreads.map(t => (
              <ContactItem
                key={t.id}
                thread={t}
                active={activeThread?.id === t.id}
                currentUserId={currentUserId}
                onClick={() => setActiveThread(t)}
              />
            ))}
            {displayedThreads.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">No conversations found</Typography>
              </Box>
            )}
          </List>
        </Box>
      </Box>

      {/* ── Active Conversation Pane ───────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {activeThread ? (
          <>
            {/* Thread Header */}
            <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: '1px solid #F8F9FA', display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, bgcolor: '#fff' }}>
              {isMobile && (
                <IconButton size="small" onClick={() => setActiveThread(null)} sx={{ color: '#5F6368', mr: 0.5 }}>
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
                  <Chip label={otherParticipant?.role ?? 'user'} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#E8F0FE', color: '#1A73E8', border: 'none', textTransform: 'capitalize' }} />
                </Box>
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
                {[CallRoundedIcon, VideocamRoundedIcon, InfoOutlinedIcon].map((Icon, i) => (
                  <IconButton key={i} size="small" sx={{ color: '#9AA0A6', '&:hover': { bgcolor: '#F8F9FA', color: '#1A73E8' }, transition: 'all 0.15s' }}>
                    <Icon sx={{ fontSize: '1.15rem' }} />
                  </IconButton>
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
              <IconButton size="small" sx={{ color: '#B8C6D4', '&:hover': { color: '#1565C7' } }}><AttachFileRoundedIcon sx={{ fontSize: '1.1rem' }} /></IconButton>
              <IconButton size="small" sx={{ color: '#B8C6D4', '&:hover': { color: '#1565C7' } }}><EmojiEmotionsOutlinedIcon sx={{ fontSize: '1.1rem' }} /></IconButton>
              <Box sx={{
                flex: 1, bgcolor: '#F8F9FA', border: '1.5px solid #E8EAED', borderRadius: '12px', px: 2, py: 1,
                display: 'flex', alignItems: 'center',
                '&:focus-within': { borderColor: '#1A73E8', boxShadow: '0 0 0 3px rgba(26,115,232,0.12)', bgcolor: '#fff' },
                transition: 'all 0.18s',
              }}>
                <InputBase
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message…"
                  multiline maxRows={3}
                  sx={{ flex: 1, fontSize: { xs: '16px', sm: '0.875rem' }, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
              </Box>
              <IconButton
                onClick={handleSend} size="small" disabled={!input.trim()}
                sx={{ bgcolor: input.trim() ? '#1A73E8' : '#E8EAED', color: input.trim() ? '#fff' : '#9AA0A6', width: 36, height: 36, transition: 'all 0.18s', '&:hover': { bgcolor: input.trim() ? '#1557B0' : '#E8EAED' } }}
              >
                <SendRoundedIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Box>
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#B8C6D4' }}>
            <Typography variant="h6" fontWeight={600}>Select a conversation</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>Choose from the left to start messaging</Typography>
          </Box>
        )}
      </Box>

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
