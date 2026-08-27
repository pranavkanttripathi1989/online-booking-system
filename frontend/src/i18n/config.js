import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
// The default/fallback language is bundled synchronously, deliberately —
// see the resources/partialBundledLanguages note below for why this
// doesn't violate I18N-8's "never bundle all languages" (only ONE is).
import enCommon from './locales/en/common.json'

// P1-07 (I18N-1…I18N-10) — the i18n layer this codebase has never had.
// FRONTEND_RULES.md's own §20.1 calls this the single most expensive rule
// to retrofit; this file exists so every future string goes through it
// from day one, rather than adding to the debt.

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
]
export const DEFAULT_LANGUAGE = 'en'
export const LANGUAGE_STORAGE_KEY = 'medibook_language'

// I18N-8 — "translation files load per-language, lazily. Never bundle all
// languages." A custom i18next backend using a dynamic import() per
// language is real code-splitting under Vite (each locale file becomes
// its own chunk) without adding a third runtime dependency
// (i18next-http-backend) for what is, in a bundled SPA, not actually an
// HTTP fetch.
const localeLoaders = {
  en: () => import('./locales/en/common.json'),
  hi: () => import('./locales/hi/common.json'),
  // I18N-4 — a generated (scripts/generate-pseudo-locale.mjs), +40%-length,
  // non-ASCII pseudo-locale, deliberately NOT in SUPPORTED_LANGUAGES so it
  // can never appear in the real switcher — loadable by
  // `i18n.changeLanguage('pseudo')` for tests/CI only.
  pseudo: () => import('./locales/pseudo/common.json'),
}

const lazyBackend = {
  type: 'backend',
  init: () => {},
  read: (language, _namespace, callback) => {
    const loader = localeLoaders[language]
    if (!loader) {
      callback(new Error(`No translations registered for language "${language}"`), null)
      return
    }
    loader()
      .then((mod) => callback(null, mod.default ?? mod))
      .catch((err) => callback(err, null))
  },
}

// I18N-3 — "language choice MUST be available before login, persist
// across sessions and devices [...] not buried in settings." Persisted
// choice wins; otherwise fall back to the browser's own language, then
// English. A real per-device-synced preference (not just localStorage)
// is a server-side account setting this slice does not build — logged in
// this slice's own PLAN as a stated, deliberate scope cut, not silently
// dropped.
function detectInitialLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    // 'pseudo' is deliberately not in SUPPORTED_LANGUAGES (never offered by
    // the real switcher — see localeLoaders' own comment) but IS accepted
    // here on initial load, specifically so e2e/pseudo-locale-overflow.spec.js
    // can activate it before first paint via a plain localStorage write —
    // no separate test-only code path to keep correct, no risk to a real
    // user (nothing in the real UI can ever set this value).
    if (stored && (stored === 'pseudo' || SUPPORTED_LANGUAGES.some((l) => l.code === stored))) return stored
  } catch {
    // localStorage can throw (private-mode Safari, storage disabled) —
    // fall through to the browser-language guess below.
  }
  const browserLang = (navigator.language || DEFAULT_LANGUAGE).slice(0, 2)
  return SUPPORTED_LANGUAGES.some((l) => l.code === browserLang) ? browserLang : DEFAULT_LANGUAGE
}

export function setLanguage(code) {
  if (!SUPPORTED_LANGUAGES.some((l) => l.code === code)) return
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
  } catch {
    // Best-effort persistence only — the in-memory i18next instance still
    // switches correctly for this session even if storage is unavailable.
  }
  i18n.changeLanguage(code)
}

i18n
  .use(lazyBackend)
  .use(initReactI18next)
  .init({
    lng: detectInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    // 'pseudo' included so an explicit changeLanguage('pseudo') in a test
    // isn't rejected — it is never reachable through language DETECTION
    // (browser-language guessing / the real switcher only ever offers
    // SUPPORTED_LANGUAGES) since it never appears there.
    supportedLngs: [...SUPPORTED_LANGUAGES.map((l) => l.code), 'pseudo'],
    ns: ['common'],
    defaultNS: 'common',
    // The fallback language (English) is provided directly rather than
    // going through the lazy backend, so there is never a loading flash
    // on first paint for the common case (English default, or a stored
    // English preference) and — just as importantly — the fallback is
    // always synchronously available even while a non-English language
    // is still loading, so a translation missing from a real Hindi file
    // resolves to real English text, not a blank string or a raw key.
    // `partialBundledLanguages` is what lets this coexist with the lazy
    // backend for every OTHER language, which is the actual I18N-8
    // requirement — one language bundled, not all of them.
    partialBundledLanguages: true,
    resources: { en: { common: enCommon } },
    interpolation: { escapeValue: false }, // React already escapes
    react: { useSuspense: true },
    returnEmptyString: false,
  })

export default i18n
