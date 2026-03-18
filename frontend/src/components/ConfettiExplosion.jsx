import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'

/**
 * Simple CSS-only confetti burst — no external lib needed.
 * Renders once on mount.
 */
export default function ConfettiExplosion() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
    const COUNT = 80

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('div')
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      const size = Math.random() * 10 + 6
      const angle = Math.random() * 360
      const distance = Math.random() * 180 + 60
      const duration = Math.random() * 1000 + 800
      const delay = Math.random() * 400

      el.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        transform: translate(-50%, -50%);
        animation: confetti-fly ${duration}ms ${delay}ms ease-out forwards;
        --angle: ${angle}deg;
        --dist: ${distance}px;
        opacity: 1;
        pointer-events: none;
      `
      container.appendChild(el)
    }

    // Inject keyframes once
    if (!document.getElementById('confetti-keyframes')) {
      const style = document.createElement('style')
      style.id = 'confetti-keyframes'
      style.textContent = `
        @keyframes confetti-fly {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
          100% {
            transform:
              translate(
                calc(-50% + cos(var(--angle)) * var(--dist)),
                calc(-50% + sin(var(--angle)) * var(--dist) - 120px)
              )
              rotate(720deg);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      while (container.firstChild) container.removeChild(container.firstChild)
    }
  }, [])

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  )
}
