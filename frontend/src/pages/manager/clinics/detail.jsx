import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Chip, Divider, Grid, IconButton, Paper, Skeleton, Stack, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon      from '@mui/icons-material/EditRounded'
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import PhoneRoundedIcon     from '@mui/icons-material/PhoneRounded'
import EmailRoundedIcon     from '@mui/icons-material/EmailRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import ScheduleRoundedIcon  from '@mui/icons-material/ScheduleRounded'
import { CLINIC_DETAIL_QUERY, ROOMS_QUERY } from '../../../graphql/queries'

export default function ClinicDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading } = useQuery(CLINIC_DETAIL_QUERY, { variables: { id } })
  const { data: roomsData } = useQuery(ROOMS_QUERY, { variables: { clinic_id: id } })
  const clinic = data?.clinic
  const rooms  = (roomsData?.rooms ?? []).filter(r => r.clinic?.id === id)

  if (loading) return (
    <Box>
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius:2, mb:3 }} />
      <Grid container spacing={3}>
        {[...Array(3)].map((_,i) => <Grid item xs={12} md={4} key={i}><Skeleton variant="rectangular" height={200} sx={{ borderRadius:3 }} /></Grid>)}
      </Grid>
    </Box>
  )

  const InfoRow = ({ icon: Icon, label, value }) => value ? (
    <Box sx={{ display:'flex', alignItems:'flex-start', gap:1.5, mb:1.5 }}>
      <Icon sx={{ color:'#5F6368', fontSize:'1.1rem', mt:0.3 }} />
      <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={600}>{value}</Typography></Box>
    </Box>
  ) : null

  return (
    <Box className="page-enter">
      <Helmet><title>{clinic?.name ?? 'Clinic'} — MediBook</title></Helmet>

      {/* Header */}
      <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:3, flexWrap:'wrap' }}>
        <IconButton onClick={() => navigate('/manager/clinics')} sx={{ bgcolor:'#F1F3F4','&:hover':{bgcolor:'#E8EAED'} }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5, flex:1 }}>
          <Box sx={{ width:44, height:44, borderRadius:3, background:'linear-gradient(135deg,#006D77,#005F69)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ApartmentRoundedIcon sx={{ color:'#fff', fontSize:'1.4rem' }} />
          </Box>
          <Box>
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
              <Typography variant="h5" fontWeight={800}>{clinic?.name}</Typography>
              <Chip size="small" label={clinic?.is_active ? 'Active' : 'Inactive'} color={clinic?.is_active ? 'success' : 'default'} sx={{ fontWeight:700 }} />
            </Box>
            <Typography variant="body2" color="text.secondary">{clinic?.city}</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<EditRoundedIcon />}
          onClick={() => navigate(`/manager/clinics/${id}/edit`)}
          sx={{ borderRadius:2.5, textTransform:'none', fontWeight:700, background:'linear-gradient(135deg,#4285F4,#1A73E8)' }}>
          Edit Clinic
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Clinic Info */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p:3, borderRadius:3, border:'1px solid #E8EAED', height:'100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>Contact & Location</Typography>
            <InfoRow icon={LocationOnRoundedIcon} label="Address" value={[clinic?.address, clinic?.city, clinic?.postcode].filter(Boolean).join(', ')} />
            <InfoRow icon={PhoneRoundedIcon}      label="Phone"   value={clinic?.phone} />
            <InfoRow icon={EmailRoundedIcon}      label="Email"   value={clinic?.email} />
            <InfoRow icon={ScheduleRoundedIcon}   label="Timezone" value={clinic?.timezone} />
          </Paper>
        </Grid>

        {/* Rooms */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p:3, borderRadius:3, border:'1px solid #E8EAED' }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
              <Typography variant="subtitle1" fontWeight={700}>Rooms ({rooms.length})</Typography>
              <Button size="small" variant="outlined" onClick={() => navigate('/manager/rooms/new')}
                sx={{ borderRadius:2, textTransform:'none', fontWeight:700 }}>+ Add Room</Button>
            </Box>
            <Divider sx={{ mb:2 }} />
            {rooms.length === 0 ? (
              <Box sx={{ textAlign:'center', py:4 }}>
                <Typography variant="body2" color="text.secondary">No rooms yet</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {rooms.map(r => (
                  <Box key={r.id} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', p:1.5, borderRadius:2, border:'1px solid #F1F3F4', '&:hover':{ bgcolor:'#F8F9FA' } }}>
                    <Box>
                      <Typography fontWeight={700}>{r.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Capacity: {r.capacity ?? 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Chip size="small" label={r.is_active ? 'Active' : 'Inactive'} color={r.is_active ? 'success' : 'default'} />
                      <Button size="small" variant="outlined" onClick={() => navigate(`/manager/rooms/${r.id}/edit`)}
                        sx={{ borderRadius:2, textTransform:'none' }}>Edit</Button>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
