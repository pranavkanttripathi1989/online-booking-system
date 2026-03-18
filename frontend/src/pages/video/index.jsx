import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Box, AppBar, Typography, Stack, Divider, Chip, IconButton, Fab, Badge,
  Tabs, Tab, TextField, Button, List, ListItem, ListItemText, Avatar
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  LocalHospital, Security, Mic, MicOff, Videocam, VideocamOff,
  ScreenShare, Chat, CallEnd, Settings, Send
} from '@mui/icons-material';

// --- Local Dark Theme Override ---
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#006D77',
    },
    secondary: {
      main: '#83C5BE',
    },
    error: {
      main: '#E63946',
    },
    background: {
      default: '#0A1F22',
      paper: '#0F2D33',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
    }
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        }
      }
    }
  }
});

// --- GraphQL ---
const GET_APPOINTMENT = gql`
  query GetAppointmentDetails($id: ID!) {
    getAppointment(id: $id) {
      id
      startTime
      endTime
      type
      status
      clinician {
        id
        name
        clinicianType
      }
      patient {
        id
        firstName
        lastName
      }
    }
  }
`;

// Define an explicit mutation or placeholder logic based on instructions
const UPDATE_APPOINTMENT_NOTES = gql`
  mutation UpdateAppointmentNotes($id: ID!, $notes: String!) {
    updateAppointment(id: $id, input: { notes: $notes }) {
      id
      status
    }
  }
`;


// --- Helper Components ---
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`panel-${index}`}
      sx={{ flexGrow: 1, display: value === index ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}
      {...other}
    >
      {value === index && children}
    </Box>
  );
}

export default function VideoConsultation() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  // Media state
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [callTimer, setCallTimer] = useState(0);

  // Right panel state
  const [activeTab, setActiveTab] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', text: 'Connection established. Waiting for clinician...', time: 'Now', isSystem: true }
  ]);
  const [notes, setNotes] = useState('');

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);

  // GraphQL
  const { data, loading, error } = useQuery(GET_APPOINTMENT, {
    variables: { id: appointmentId || "1" }, // Using "1" as default for preview mode if no params
    skip: !appointmentId && false, // We'll let it fetch something for dev/testing
  });

  const [saveNotesMutation, { loading: savingNotes }] = useMutation(UPDATE_APPOINTMENT_NOTES);

  // --- WebRTC Media Devices Mock setup ---
  // Note: Replace with proper Twilio/Daily.co SDK in production
  useEffect(() => {
    let localStream = null;

    const getMedia = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Mock remote video by connecting local stream if we want to visually test, 
        // but normally this would be handled by WebRTC RTCPeerConnection and ontrack events.
        // if (remoteVideoRef.current) {
        //   remoteVideoRef.current.srcObject = localStream; // Just for visual placeholder
        // }

      } catch (err) {
        console.error("Failed to acquire media devices", err);
        // Add a system message about failure
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          sender: 'System', 
          text: `Camera/Mic error: ${err.message}. Please check permissions.`, 
          time: 'Now', 
          isSystem: true 
        }]);
      }
    };

    getMedia();

    // Call timer
    timerRef.current = setInterval(() => {
      setCallTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format timer
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handlers
  const toggleMic = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const audioTracks = localVideoRef.current.srcObject.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !micOn;
      }
    }
    setMicOn(!micOn);
  };

  const toggleCamera = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const videoTracks = localVideoRef.current.srcObject.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !cameraOn;
      }
    }
    setCameraOn(!cameraOn);
  };

  const handleEndCall = () => {
    // Clean up streams
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    
    // Navigate back to dashboard or post-call summary
    navigate('/patient/dashboard');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    setMessages(prev => [
      ...prev, 
      { id: Date.now(), sender: 'You', text: chatInput, time: formatTime(callTimer), isSystem: false }
    ]);
    setChatInput('');
  };

  const handleSaveNotes = async () => {
    try {
      if (appointmentId) {
        await saveNotesMutation({ variables: { id: appointmentId, notes } });
      }
      setMessages(prev => [...prev, { id: Date.now(), sender: 'System', text: 'Notes saved successfully.', time: 'Now', isSystem: true }]);
    } catch (err) {
      console.error(err);
    }
  };


  const appt = data?.getAppointment;
  const clinicianName = appt?.clinician?.name || "Dr. Loading...";
  const title = `Consultation with ${clinicianName}`;

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ bgcolor: 'background.default', height: '100vh', display: 'flex', flexDirection: 'column', color: 'text.primary', overflow: 'hidden' }}>
        
        {/* APP BAR */}
        <AppBar position="static" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #1E4A52', boxShadow: 'none' }}>
          <Stack direction="row" alignItems="center" px={2} py={1.5} gap={2}>
            <Stack direction="row" alignItems="center" gap={1}>
              <LocalHospital color="primary" />
              <Typography variant="body1" fontWeight={700} color="white">HealthSync</Typography>
            </Stack>
            
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
            
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            
            <Box flexGrow={1} />
            
            <Chip icon={<Security sx={{ fontSize: 16 }} />} label="Secure" size="small" color="primary" variant="outlined" sx={{ color: 'primary.main', borderColor: 'primary.main' }} />
          </Stack>
        </AppBar>

        {/* MAIN LAYOUT */}
        <Box flexGrow={1} display="flex" p={2} gap={2} overflow="hidden">
          
          {/* VIDEO AREA */}
          <Box flexGrow={1} display="flex" flexDirection="column" position="relative" bgcolor="#000" borderRadius={3} overflow="hidden" boxShadow="0 8px 32px rgba(0,0,0,0.5)">
            
            {/* Remote Video (Main) */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            
            {/* Placeholder if remote video isn't connected */}
            <Box position="absolute" top={0} left={0} right={0} bottom={0} display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ opacity: 0.7, pointerEvents: 'none' }}>
               <Avatar sx={{ width: 100, height: 100, mb: 2, bgcolor: 'primary.main' }}>
                 {clinicianName.charAt(0)}
               </Avatar>
               <Typography variant="h6">{clinicianName}</Typography>
               <Typography variant="body2">{loading ? "Connecting..." : "Waiting for clinician to join"}</Typography>
            </Box>

            {/* Local Video (PIP) */}
            <Box 
              position="absolute" 
              bottom={80} 
              right={16} 
              width={{ xs: 120, md: 240 }} 
              height={{ xs: 160, md: 160 }} 
              bgcolor="#111" 
              borderRadius={2} 
              overflow="hidden" 
              border="2px solid rgba(255,255,255,0.3)"
              boxShadow="0 4px 12px rgba(0,0,0,0.5)"
              zIndex={10}
            >
              {cameraOn ? (
                 <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} // mirror local video
                />
              ) : (
                <Box height="100%" display="flex" alignItems="center" justifyContent="center" bgcolor="#222">
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>Me</Avatar>
                </Box>
              )}
            </Box>

            {/* Overlay Info */}
            <Box position="absolute" bottom={80} left={16} bgcolor="rgba(0,0,0,0.6)" borderRadius={2} px={2} py={0.5} zIndex={10}>
              <Typography variant="body2" color="white" fontWeight={500}>{clinicianName}</Typography>
            </Box>

            <Box position="absolute" top={16} left="50%" sx={{ transform: 'translateX(-50%)' }} bgcolor="rgba(0,0,0,0.6)" borderRadius={5} px={2} py={0.5} zIndex={10}>
              <Typography variant="caption" color="white" fontWeight={600} display="flex" alignItems="center" gap={1}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                {formatTime(callTimer)}
              </Typography>
            </Box>

            {/* CONTROLS BAR */}
            <Box position="absolute" bottom={0} left={0} right={0} bgcolor="rgba(10,31,34,0.85)" sx={{ backdropFilter: 'blur(10px)' }} py={2} display="flex" justifyContent="center" gap={3} alignItems="center" zIndex={20}>
              <IconButton 
                onClick={toggleMic} 
                sx={{ bgcolor: micOn ? 'rgba(255,255,255,0.1)' : 'error.main', color: 'white', '&:hover': { bgcolor: micOn ? 'rgba(255,255,255,0.2)' : 'error.dark' }, width: 56, height: 56 }}
              >
                {micOn ? <Mic /> : <MicOff />}
              </IconButton>
              
              <IconButton 
                onClick={toggleCamera} 
                sx={{ bgcolor: cameraOn ? 'rgba(255,255,255,0.1)' : 'error.main', color: 'white', '&:hover': { bgcolor: cameraOn ? 'rgba(255,255,255,0.2)' : 'error.dark' }, width: 56, height: 56 }}
              >
                {cameraOn ? <Videocam /> : <VideocamOff />}
              </IconButton>

              <IconButton 
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, width: 48, height: 48, display: { xs: 'none', sm: 'flex' } }}
              >
                <ScreenShare fontSize="small" />
              </IconButton>

              <Fab color="error" onClick={handleEndCall} sx={{ width: 64, height: 64, mx: 2 }}>
                <CallEnd fontSize="large" />
              </Fab>

              <IconButton 
                onClick={() => setActiveTab(1)}
                sx={{ bgcolor: activeTab === 1 ? 'primary.main' : 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: activeTab === 1 ? 'primary.dark' : 'rgba(255,255,255,0.2)' }, width: 48, height: 48 }}
              >
                <Badge color="error" variant="dot" invisible={activeTab === 1}>
                  <Chat fontSize="small" />
                </Badge>
              </IconButton>

              <IconButton 
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, width: 48, height: 48, display: { xs: 'none', sm: 'flex' } }}
              >
                <Settings fontSize="small" />
              </IconButton>
            </Box>
            
          </Box>

          {/* RIGHT SIDEBAR */}
          <Box width={{ xs: 280, lg: 340 }} bgcolor="#0F2D33" borderRadius={3} display={{ xs: 'none', md: 'flex' }} flexDirection="column" border="1px solid #1E4A52" overflow="hidden">
            <Tabs 
              value={activeTab} 
              onChange={(e, val) => setActiveTab(val)} 
              variant="fullWidth" 
              sx={{ borderBottom: '1px solid #1E4A52', minHeight: 48 }}
            >
              <Tab label="Info" sx={{ minHeight: 48 }} />
              <Tab label="Chat" sx={{ minHeight: 48 }} />
              <Tab label="Notes" sx={{ minHeight: 48 }} />
            </Tabs>

            {/* Tab 0: Info */}
            <TabPanel value={activeTab} index={0} sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Consultation Details</Typography>
              <Box bgcolor="rgba(0,0,0,0.2)" p={2} borderRadius={2} mb={2}>
                 <Typography variant="body2" fontWeight={600} color="primary.light">Patient</Typography>
                 <Typography variant="body1" mb={1}>{appt?.patient?.firstName} {appt?.patient?.lastName}</Typography>

                 <Typography variant="body2" fontWeight={600} color="primary.light">Clinician</Typography>
                 <Typography variant="body1" mb={1}>{clinicianName}</Typography>

                 <Typography variant="body2" fontWeight={600} color="primary.light">Status</Typography>
                 <Chip label="In Progress" size="small" color="success" sx={{ mt: 0.5 }} />
              </Box>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Typography variant="body2" color="text.secondary">
                Ensure you are in a quiet, well-lit environment. Connection is end-to-end encrypted.
              </Typography>
            </TabPanel>

            {/* Tab 1: Chat */}
            <TabPanel value={activeTab} index={1} sx={{ p: 0 }}>
              <Box flexGrow={1} overflow="auto" p={2} display="flex" flexDirection="column" gap={1}>
                {messages.map(msg => (
                  <Box key={msg.id} alignSelf={msg.isSystem ? 'center' : (msg.sender === 'You' ? 'flex-end' : 'flex-start')} maxWidth="85%">
                    {msg.isSystem ? (
                      <Typography variant="caption" color="text.secondary" textAlign="center" display="block" my={1}>
                        {msg.text}
                      </Typography>
                    ) : (
                      <Box>
                        <Typography variant="caption" color="text.secondary" px={1}>{msg.sender} • {msg.time}</Typography>
                        <Box bgcolor={msg.sender === 'You' ? 'primary.main' : 'rgba(255,255,255,0.1)'} p={1.5} borderRadius={2} sx={{ borderTopRightRadius: msg.sender === 'You' ? 4 : undefined, borderTopLeftRadius: msg.sender !== 'You' ? 4 : undefined }}>
                          <Typography variant="body2">{msg.text}</Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
              <Box p={2} borderTop="1px solid #1E4A52" component="form" onSubmit={handleSendMessage} display="flex" gap={1}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="Type a message..." 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)}
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                />
                <IconButton color="primary" type="submit" disabled={!chatInput.trim()} sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                  <Send fontSize="small" />
                </IconButton>
              </Box>
            </TabPanel>

            {/* Tab 2: Notes */}
            <TabPanel value={activeTab} index={2} sx={{ p: 2 }}>
               <Typography variant="subtitle2" color="text.secondary" gutterBottom>Private Notes</Typography>
               <Typography variant="caption" display="block" color="text.secondary" mb={2}>
                 These notes are only visible to you and will be saved to the appointment record.
               </Typography>
               
               <TextField 
                 multiline 
                 rows={12} 
                 fullWidth 
                 placeholder="Type your consultation notes here..." 
                 value={notes}
                 onChange={e => setNotes(e.target.value)}
                 sx={{ 
                   mb: 2, 
                   flexGrow: 1, 
                   '& .MuiOutlinedInput-root': { 
                     bgcolor: 'rgba(0,0,0,0.2)', 
                     alignItems: 'flex-start',
                     height: '100%'
                   } 
                 }}
               />
               <Button 
                 variant="contained" 
                 fullWidth 
                 onClick={handleSaveNotes} 
                 disabled={savingNotes}
               >
                 {savingNotes ? 'Saving...' : 'Save Notes'}
               </Button>
            </TabPanel>
          </Box>
        </Box>
      </Box>

      {/* Global CSS for pulsing animation on timer */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </ThemeProvider>
  );
}
