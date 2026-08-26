import React, { useState } from 'react'
import { Avatar } from '@mui/material'

function md5Hash(str) {
  // Simple Gravatar URL generation without crypto
  // Use email-based Gravatar via URL encoding
  return str.trim().toLowerCase()
}

function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}` || '?'
}

const SIZE_MAP = { sm: 32, md: 40, lg: 64, xl: 96 }

export default function PatientAvatar({ email, firstName, lastName, size = 'md', sx = {} }) {
  const [imgError, setImgError] = useState(false)
  const px = typeof size === 'number' ? size : SIZE_MAP[size] || 40

  // Gravatar URL using encodeURIComponent for simplicity
  const gravatarUrl =
    email && !imgError ? `https://www.gravatar.com/avatar/${encodeURIComponent(email.trim().toLowerCase())}?d=404&s=${px * 2}` : null

  const initials = getInitials(firstName, lastName)

  return (
    <Avatar
      src={gravatarUrl || undefined}
      onError={() => setImgError(true)}
      sx={{
        width: px,
        height: px,
        bgcolor: '#006D77',
        color: '#fff',
        fontSize: px < 40 ? '0.75rem' : px < 64 ? '1rem' : '1.4rem',
        fontWeight: 700,
        ...sx,
      }}
    >
      {initials}
    </Avatar>
  )
}
