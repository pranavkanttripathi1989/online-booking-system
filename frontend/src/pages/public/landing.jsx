/**
 * AG-4 — Landing.jsx
 * Public homepage with hero, doctor search filters, DoctorCard grid
 * Uses medicalTheme — no auth required
 */
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  Stack,
  Autocomplete,
  Avatar,
  Card,
  CardContent,
  CardActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Skeleton,
  Divider,
  Rating,
  InputAdornment,
  Alert,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import SearchIcon from '@mui/icons-material/Search'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import StarIcon from '@mui/icons-material/Star'
import VideocamIcon from '@mui/icons-material/Videocam'
import VerifiedIcon from '@mui/icons-material/Verified'
import TuneIcon from '@mui/icons-material/Tune'

// ─── Mock data ────────────────────────────────────────────────────────────────
const CLINICIAN_TYPES = [
  { id: 1, name: 'General Practitioner' },
  { id: 2, name: 'Cardiologist' },
  { id: 3, name: 'Neurologist' },
  { id: 4, name: 'Dermatologist' },
  { id: 5, name: 'Paediatrician' },
  { id: 6, name: 'Orthopaedic Surgeon' },
  { id: 7, name: 'Psychiatrist' },
  { id: 8, name: 'Physiotherapist' },
]

const LANGUAGES = ['English', 'French', 'Spanish', 'Arabic', 'Hindi', 'Mandarin', 'German', 'Portuguese']

const SPECIALTY_CHIPS = [
  'General Practice',
  'Cardiology',
  'Neurology',
  'Dermatology',
  'Paediatrics',
  'Orthopaedics',
  'Mental Health',
  'Physiotherapy',
  'Gynaecology',
]

// F-18 / BUG009. This block was six invented doctors, and the effect below was
// literally commented "Simulate GraphQL getClinicians" — complete with an 800ms
// fake delay — while backend/src/public exposes a real, @Public() getClinicians
// built against this very shape.
//
// The entity matches the mock field for field (rating, reviews, price,
// languages, bio, initials, videoEnabled, verified), because it was written
// from this page. All of it is derived server-side from real rows: rating and
// reviews from Reviews, price from the minimum linked service price.
//
// `nextAvailable` is the one field with no counterpart — computing it means
// walking ClinicianAvailability minus Blocks minus booked slots, which is the
// availability engine's job, not a landing page's. The line is removed rather
// than filled with a plausible time.
const GET_CLINICIANS = gql`
  query GetClinicians($search: PublicClinicianSearchInput) {
    getClinicians(search: $search) {
      id
      name
      specialty
      clinic
      rating
      reviews
      price
      languages
      bio
      initials
      videoEnabled
      verified
    }
  }
`

// ─── Card Skeleton ────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <Card sx={{ borderRadius: 3, p: 2 }}>
      <Stack direction="row" spacing={2}>
        <Skeleton variant="circular" width={64} height={64} />
        <Box flex={1}>
          <Skeleton width="60%" height={24} />
          <Skeleton width="40%" height={18} sx={{ mt: 0.5 }} />
          <Skeleton width="80%" height={18} sx={{ mt: 0.5 }} />
          <Skeleton width="50%" height={18} sx={{ mt: 0.5 }} />
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Skeleton variant="rounded" width="50%" height={36} />
        <Skeleton variant="rounded" width="50%" height={36} />
      </Stack>
    </Card>
  )
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────
function DoctorResultCard({ doctor, onViewProfile, onBook }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': {
          boxShadow: '0 6px 24px rgba(0,109,119,0.14)',
          transform: 'translateY(-2px)',
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flex: 1, p: 2.5 }}>
        <Stack direction="row" spacing={2}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.main',
              fontSize: '1.1rem',
              fontWeight: 800,
            }}
          >
            {doctor.initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {doctor.name}
              </Typography>
              {doctor.verified && <VerifiedIcon sx={{ fontSize: 16, color: 'info.main' }} />}
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
              <Chip label={doctor.specialty} size="small" color="primary" variant="outlined" />
              {doctor.videoEnabled && (
                <Chip
                  icon={<VideocamIcon sx={{ fontSize: 14 }} />}
                  label="Video"
                  size="small"
                  sx={{ bgcolor: (t) => alpha(t.palette.secondary.main, 0.14), color: 'secondary.dark', fontWeight: 700 }}
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {doctor.clinic}
            </Typography>
          </Box>
        </Stack>

        {/* Rating + price */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Rating
              value={doctor.rating}
              precision={0.1}
              size="small"
              readOnly
              icon={<StarIcon fontSize="inherit" sx={{ color: 'warning.main' }} />}
              emptyIcon={<StarIcon fontSize="inherit" />}
            />
            <Typography variant="caption" color="text.secondary">
              {doctor.rating} ({doctor.reviews})
            </Typography>
          </Stack>
          <Typography variant="h6" fontWeight={800} sx={{ color: 'primary.main' }}>
            ₹{doctor.price}
          </Typography>
        </Stack>

        {/* Languages */}
        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1.5 }}>
          {doctor.languages.map((lang) => (
            <Chip key={lang} label={lang} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
          ))}
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2.5, pb: 2, pt: 0 }}>
        <Button variant="outlined" fullWidth onClick={() => onViewProfile(doctor.id)}>
          View Profile
        </Button>
        <Button variant="contained" fullWidth onClick={() => onBook(doctor.id)}>
          Book Now
        </Button>
      </CardActions>
    </Card>
  )
}

// ─── Main Landing ─────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()

  // ── State ───────────────────────────────────────────────────────────────────
  const [specialty, setSpecialty] = useState(null)
  const [city, setCity] = useState('')
  const [date, setDate] = useState(null)
  const [priceRange, setPriceRange] = useState([0, 200])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedLangs, setSelectedLangs] = useState([])

  // Specialty, city and language are filtered SERVER-side by the resolver.
  // Price range and the multi-select chips stay client-side: the backend input
  // takes a single specialty/language, so the extra selections refine the
  // returned set rather than being silently dropped.
  const { data, loading, error, refetch } = useQuery(GET_CLINICIANS, {
    variables: {
      search: {
        specialty: specialty?.name || undefined,
        city: city || undefined,
        language: selectedLangs.length === 1 ? selectedLangs[0] : undefined,
      },
    },
    fetchPolicy: 'cache-and-network',
  })

  const results = useMemo(() => {
    // No mock fallback: an org with no published clinicians must show an empty
    // state, not six fictional doctors a patient could try to book.
    let list = data?.getClinicians ?? []
    if (selectedTypes.length > 0) list = list.filter((d) => selectedTypes.includes(d.specialty))
    if (selectedLangs.length > 1) list = list.filter((d) => (d.languages ?? []).some((l) => selectedLangs.includes(l)))
    // A clinician with no linked service has no price; excluding them on a
    // price filter they cannot satisfy would hide real people, so null passes.
    return list.filter((d) => d.price == null || (d.price >= priceRange[0] && d.price <= priceRange[1]))
  }, [data, selectedTypes, selectedLangs, priceRange])

  const handleSearch = () => {
    // Variables are reactive, so a change already refetches; this is the
    // explicit "Search" affordance re-running the same query.
    refetch()
  }

  const toggleType = (typeName) => {
    setSelectedTypes((prev) => (prev.includes(typeName) ? prev.filter((t) => t !== typeName) : [...prev, typeName]))
  }

  return (
    <Box>
      {/* ═══════ HERO SECTION ═══════════════════════════════════════════════ */}
      {/* BUG047 Phase 2 -- deliberate literal exception: a fixed marketing-hero
          gradient, independent of the app's own light/dark mode, matching
          login.jsx's BrandPanel and PublicLayout's footer convention. Content
          rendered on top of it (white text, the specialty chip row) stays
          literal for the same reason; the search Paper card and results below
          it are real theme-aware surfaces and are tokenised. */}
      <Box
        sx={{
          background: 'linear-gradient(160deg, #004D55 0%, #006D77 50%, #0A9396 100%)',
          py: { xs: 6, md: 12 },
          px: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h2" sx={{ color: '#fff', fontWeight: 800, mb: 1, fontSize: { xs: '1.6rem', md: '2rem' } }}>
          Find the right doctor. Book instantly.
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 540, mx: 'auto', mt: 1 }}>
          Browse top-rated specialists, check availability in real-time, and book your appointment in seconds.
        </Typography>

        {/* ── Search card ──────────────────────────────────────────────────── */}
        <Paper elevation={6} sx={{ borderRadius: 4, p: 3, mt: 5, mx: 'auto', maxWidth: 800 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Autocomplete
                options={CLINICIAN_TYPES}
                getOptionLabel={(opt) => opt.name}
                value={specialty}
                onChange={(_, v) => setSpecialty(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Specialty"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <LocalHospitalIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City or Clinic"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOnIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker label="Select date" value={date} onChange={(v) => setDate(v)} slotProps={{ textField: { fullWidth: true } }} />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                sx={{ py: 1.5, fontWeight: 700, fontSize: '0.95rem' }}
              >
                Find Doctors
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* ── Specialty chip row ───────────────────────────────────────────── */}
        <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
          {SPECIALTY_CHIPS.map((s) => (
            <Chip
              key={s}
              label={s}
              variant="outlined"
              onClick={() => {
                const match = CLINICIAN_TYPES.find((t) => t.name.includes(s.split(' ')[0]))
                setSpecialty(match || null)
              }}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: '#fff' },
                fontWeight: 600,
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* ═══════ FILTERS + RESULTS ═════════════════════════════════════════ */}
      <Container maxWidth="xl" sx={{ mt: 6, mb: 8 }}>
        <Grid container spacing={3}>
          {/* ── Sidebar filters ────────────────────────────────────────────── */}
          <Grid item xs={12} md={3}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 3,
                position: { md: 'sticky' },
                top: { md: 80 },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <TuneIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700}>
                  Filters
                </Typography>
              </Stack>

              {/* Specialty checkboxes */}
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                SPECIALTY
              </Typography>
              <FormGroup sx={{ mb: 2 }}>
                {CLINICIAN_TYPES.slice(0, 6).map((ct) => (
                  <FormControlLabel
                    key={ct.id}
                    control={
                      <Checkbox
                        checked={selectedTypes.includes(ct.name)}
                        onChange={() => toggleType(ct.name)}
                        size="small"
                        sx={{ '&.Mui-checked': { color: 'primary.main' } }}
                      />
                    }
                    label={<Typography variant="body2">{ct.name}</Typography>}
                  />
                ))}
              </FormGroup>

              <Divider sx={{ mb: 2 }} />

              {/* Language filter */}
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                LANGUAGE
              </Typography>
              <Autocomplete
                multiple
                options={LANGUAGES}
                value={selectedLangs}
                onChange={(_, v) => setSelectedLangs(v)}
                renderInput={(params) => <TextField {...params} placeholder="Any language" />}
                size="small"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ mb: 2 }} />

              {/* Price range slider */}
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                PRICE RANGE
              </Typography>
              <Slider
                value={priceRange}
                onChange={(_, v) => setPriceRange(v)}
                min={0}
                max={200}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `₹${v}`}
                sx={{ color: 'primary.main' }}
              />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption">₹{priceRange[0]}</Typography>
                <Typography variant="caption">₹{priceRange[1]}</Typography>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedTypes([])
                  setSelectedLangs([])
                  setPriceRange([0, 200])
                  setSpecialty(null)
                  setCity('')
                }}
              >
                Clear All Filters
              </Button>
            </Paper>
          </Grid>

          {/* ── Doctor results grid ────────────────────────────────────────── */}
          <Grid item xs={12} md={9}>
            {/* Result count */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h5" fontWeight={700}>
                {loading ? 'Searching…' : `${results.length} doctors found`}
              </Typography>
              {!loading && (
                <Typography variant="body2" color="text.secondary">
                  Sorted by rating
                </Typography>
              )}
            </Stack>

            {/* Grid */}
            <Grid container spacing={3}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Grid item xs={12} sm={6} lg={4} key={i}>
                      <CardSkeleton />
                    </Grid>
                  ))
                : results.map((doctor) => (
                    <Grid item xs={12} sm={6} lg={4} key={doctor.id}>
                      <DoctorResultCard
                        doctor={doctor}
                        onViewProfile={(id) => navigate(`/doctor/${id}`)}
                        onBook={(id) => navigate(`/appointments/book?doctor=${id}`)}
                      />
                    </Grid>
                  ))}
            </Grid>

            {/* Empty state */}
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                action={
                  <Button size="small" onClick={() => refetch()}>
                    Retry
                  </Button>
                }
              >
                Could not load doctors right now. {error.message}
              </Alert>
            )}

            {!loading && !error && results.length === 0 && (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, mt: 2 }}>
                <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" fontWeight={700}>
                  No doctors match your criteria
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try adjusting your filters or search for a different specialty.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
