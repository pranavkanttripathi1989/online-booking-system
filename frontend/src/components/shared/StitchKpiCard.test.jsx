import { render, screen } from '@testing-library/react'
import { EventNote } from '@mui/icons-material'
import StitchKpiCard from './StitchKpiCard'

// BUG035/BUG042 -- a null/undefined trend (no real prior-period baseline)
// used to render as a fabricated 0% or 100% badge. This card must render no
// badge at all in that case, and round a real trend to a sane precision.

describe('StitchKpiCard trend badge', () => {
  it('renders no trend badge when trend is null', () => {
    render(<StitchKpiCard title="Total Appointments" value="12" icon={<EventNote />} trend={null} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('renders no trend badge when trend is undefined', () => {
    render(<StitchKpiCard title="Total Appointments" value="12" icon={<EventNote />} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('renders a real trend rounded to 1 decimal', () => {
    render(<StitchKpiCard title="Total Appointments" value="12" icon={<EventNote />} trend={66.666666666666666} />)
    expect(screen.getByText('66.7%')).toBeInTheDocument()
  })

  it('renders a real zero trend (a genuine unchanged value, distinct from null)', () => {
    render(<StitchKpiCard title="Total Appointments" value="12" icon={<EventNote />} trend={0} />)
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })
})
