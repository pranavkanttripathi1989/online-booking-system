/**
 * DoctorCard — compact card for doctor search results, landing page grid, saved doctors etc.
 * Shows avatar, name, specialty, rating, location, price, and a Book button.
 */
import React from 'react'
import { Card, CardContent, CardActions, Stack, Box, Typography, Chip, Avatar, Button, Rating, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import VideocamIcon from '@mui/icons-material/Videocam'
import VerifiedIcon from '@mui/icons-material/Verified'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

export default function DoctorCard({
  id = '1',
  name = 'Dr. Sarah Johnson',
  specialty = 'Cardiology',
  clinic = 'City Heart Clinic',
  location = 'London, UK',
  rating = 4.9,
  reviews = 148,
  price = 85,
  nextSlot = 'Tomorrow 09:00',
  video = true,
  verified = true,
  initials,
}) {
  const navigate = useNavigate()
  const avatarInitials =
    initials ||
    name
      .split(' ')
      .filter((_, i) => i !== 0)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #D0E8EA',
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': {
          boxShadow: '0 6px 24px rgba(0,109,119,0.14)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, flex: 1 }}>
        {/* Avatar + name */}
        <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: '#006D77', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
            {avatarInitials}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
              <Typography fontWeight={700} noWrap sx={{ fontSize: '0.95rem' }}>
                {name}
              </Typography>
              {verified && <VerifiedIcon sx={{ color: '#006D77', fontSize: 15, flexShrink: 0 }} />}
            </Stack>
            <Chip label={specialty} size="small" color="primary" sx={{ fontWeight: 600 }} />
          </Box>
        </Stack>

        {/* Rating */}
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
          <Rating value={rating} precision={0.1} size="small" readOnly />
          <Typography variant="body2" fontWeight={700}>
            {rating}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({reviews} reviews)
          </Typography>
        </Stack>

        {/* Location + video badge */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
          <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {clinic} · {location}
          </Typography>
        </Stack>
        {video && (
          <Chip
            icon={<VideocamIcon />}
            label="Video available"
            size="small"
            sx={{ bgcolor: '#EDE9FE', color: '#7C3AED', fontSize: '0.7rem', mt: 0.5 }}
          />
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Price + next available */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" color="primary" fontWeight={800}>
              ₹{price}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              per session
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <AccessTimeIcon sx={{ fontSize: 13, color: '#2DC653' }} />
            <Typography variant="caption" sx={{ color: '#2DC653', fontWeight: 600 }}>
              {nextSlot}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0, gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate(`/doctor/${id}`)}
          aria-label={`View ${name}'s profile`}
          sx={{ flex: 1 }}
        >
          View Profile
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate('/appointments/book')}
          aria-label={`Book appointment with ${name}`}
          sx={{ flex: 1 }}
        >
          Book Now
        </Button>
      </CardActions>
    </Card>
  )
}
