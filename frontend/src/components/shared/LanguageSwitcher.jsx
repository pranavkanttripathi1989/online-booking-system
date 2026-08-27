import React from 'react'
import { useTranslation } from 'react-i18next'
import { Select, MenuItem } from '@mui/material'
import { SUPPORTED_LANGUAGES, setLanguage } from '../../i18n/config'

/**
 * I18N-3 — "language choice MUST be available before login [...] reachable
 * in <= 2 taps — not buried in settings." Meant to live in a header/nav
 * that's already on every public route, so this component owns none of
 * that placement itself.
 *
 * A11Y-12 — a MUI `Select` with no visible `InputLabel` needs
 * `inputProps={{ 'aria-label': ... }}` (a bare `aria-label` prop lands on
 * the wrong DOM node), and needs a `data-testid` once it can hold a real
 * value (its accessible name then concatenates label + value, breaking
 * `getByLabel`).
 *
 * @param {{ size?: 'small' | 'medium', sx?: object }} props
 */
export default function LanguageSwitcher({ size = 'small', sx }) {
  const { i18n, t } = useTranslation()

  return (
    <Select
      value={i18n.resolvedLanguage ?? i18n.language}
      onChange={(e) => setLanguage(e.target.value)}
      size={size}
      variant="outlined"
      data-testid="language-switcher"
      inputProps={{ 'aria-label': t('languageSwitcher.ariaLabel') }}
      sx={{ minWidth: 96, ...sx }}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <MenuItem key={lang.code} value={lang.code}>
          {lang.nativeLabel}
        </MenuItem>
      ))}
    </Select>
  )
}
