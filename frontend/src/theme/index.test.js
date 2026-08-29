import { createAppTheme } from './index'

describe('createAppTheme', () => {
  it('defaults to the brand teal primary when no accentColor is given', () => {
    expect(createAppTheme('light').palette.primary.main).toBe('#006D77')
    expect(createAppTheme('dark').palette.primary.main).toBe('#4ECDC4')
  })

  it('applies a custom accentColor to palette.primary in both modes', () => {
    const light = createAppTheme('light', { accentColor: '#D93025' })
    const dark = createAppTheme('dark', { accentColor: '#D93025' })
    expect(light.palette.primary.main).toBe('#D93025')
    expect(dark.palette.primary.main).toBe('#D93025')
  })

  it('derives sidebarSelectedBg/table-head styling (MuiListItemButton, MuiTableHead) from the custom accent, not just palette.primary itself', () => {
    const theme = createAppTheme('light', { accentColor: '#0F9D58' })
    const selected = theme.components.MuiListItemButton.styleOverrides.root['&.Mui-selected'].background
    expect(selected).toBe('#0F9D58')
  })

  it('picks a readable contrastText for a light accent vs a dark one', () => {
    const lightAccent = createAppTheme('light', { accentColor: '#F9AB00' }) // amber -- dark text reads better
    const darkAccent = createAppTheme('light', { accentColor: '#1A2B3C' }) // near-black -- white text reads better
    expect(lightAccent.palette.primary.contrastText).toBe('#000')
    expect(darkAccent.palette.primary.contrastText).toBe('#fff')
  })

  it('leaves typography unchanged at the default fontScale of 1', () => {
    const theme = createAppTheme('light')
    expect(theme.typography.body1.fontSize).toBe('0.9375rem')
    expect(theme.typography.h1.fontSize).toBe('2rem')
  })

  it('scales typography up at fontScale 1.25 (XL preset)', () => {
    const theme = createAppTheme('light', { fontScale: 1.25 })
    expect(theme.typography.h1.fontSize).toBe('2.5rem') // 2rem * 1.25
    expect(theme.typography.body1.fontSize).toBe('1.171875rem') // 0.9375rem * 1.25
  })

  it('floor-clamps body2/caption at 14px even when scaled down (RES-6)', () => {
    const theme = createAppTheme('light', { fontScale: 0.9 })
    // body2 (13px) and caption (11px) are already under the 14px floor at
    // scale 1 -- scaling down further must not push them lower still.
    expect(theme.typography.body2.fontSize).toBe('0.875rem') // 14px
    expect(theme.typography.caption.fontSize).toBe('0.875rem') // 14px
  })

  it('still produces a valid theme (no throw) with no options object at all', () => {
    expect(() => createAppTheme('dark')).not.toThrow()
  })
})
