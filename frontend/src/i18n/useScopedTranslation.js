import { useEffect, useState } from 'react'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, localeLoaders, enCommon } from './config'

// P2-08 (US-RX-07) — locks a specific piece of UI (a printed prescription)
// to the language it was issued in, independent of the app's own current
// UI language (a clinician viewing a Hindi-issued Rx keeps their own
// English UI everywhere else).
//
// Deliberately NOT built on i18next's own cloneInstance()/getFixedT() — an
// earlier draft used that and was hard to reason about alongside the
// shared instance's own `react: { useSuspense: true }` wiring. This small
// standalone loader (reusing config.js's own per-language dynamic import,
// not a new mechanism) never touches the shared i18next instance at all,
// which is simpler to verify correct: no interaction with the global
// instance's own language-switching or Suspense behaviour to reason about.
const cache = { [DEFAULT_LANGUAGE]: enCommon }
const inflight = {}

function loadBundle(lang, onDone) {
  if (cache[lang] !== undefined) {
    onDone(cache[lang])
    return
  }
  if (!inflight[lang]) {
    const loader = localeLoaders[lang]
    inflight[lang] = loader
      ? loader()
          .then((mod) => {
            cache[lang] = mod.default ?? mod
          })
          .catch(() => {
            cache[lang] = null // load failed -- callers fall back to defaultValue/key
          })
      : Promise.resolve().then(() => {
          cache[lang] = null
        })
  }
  inflight[lang].then(() => onDone(cache[lang]))
}

function getAtPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj)
}

// Returns { t, ready } where `t(key, { defaultValue })` looks up a dotted
// path (e.g. "prescription.frequencyCode.BD") in the bundle for `language`
// (falling back to DEFAULT_LANGUAGE for an unrecognised/missing value, same
// as the app-wide i18n instance's own fallbackLng), returning `defaultValue`
// -- or the bare key if none was given -- when the bundle hasn't loaded yet
// or has no entry for that path. No interpolation/pluralisation support;
// this document's own label set needs neither.
export function useScopedTranslation(language) {
  const lang = language && SUPPORTED_LANGUAGES.some((l) => l.code === language) ? language : DEFAULT_LANGUAGE
  const [bundle, setBundle] = useState(cache[lang])
  const [ready, setReady] = useState(cache[lang] !== undefined)

  useEffect(() => {
    let cancelled = false
    if (cache[lang] !== undefined) {
      setBundle(cache[lang])
      setReady(true)
      return undefined
    }
    setReady(false)
    loadBundle(lang, (loaded) => {
      if (!cancelled) {
        setBundle(loaded)
        setReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [lang])

  const fallbackBundle = cache[DEFAULT_LANGUAGE]
  const t = (key, options) => {
    const defaultValue = typeof options === 'string' ? options : (options?.defaultValue ?? key)
    const value = getAtPath(bundle, key) ?? getAtPath(fallbackBundle, key)
    return value ?? defaultValue
  }

  return { t, ready }
}
