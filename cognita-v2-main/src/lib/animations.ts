'use client'

/**
 * Animation Utilities
 * Micro-interactions that improve user experience
 */

import { useEffect, useRef } from 'react'

/**
 * Scroll-triggered fade-in animation
 */
export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in')
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)

    return () => {
      if (ref.current) observer.unobserve(ref.current)
    }
  }, [])

  return ref
}

/**
 * Stagger animation for lists (for Framer Motion or similar)
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25 },
  },
}

/**
 * Hover scale animation utilities (CSS classes)
 */
export const hoverScale = {
  className: 'transition-transform duration-150 hover:scale-105 active:scale-95',
}

export const hoverShadow = {
  className: 'transition-shadow duration-150 hover:shadow-lg focus-visible:shadow-lg',
}

/**
 * Animation timing functions
 */
export const animations = {
  fade: 'animate-fade-in',
  shimmer: 'skeleton',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
}

/**
 * Page transition effect helper
 */
export function pageTransition() {
  if (typeof window !== 'undefined') {
    document.documentElement.style.opacity = '0.9'
    setTimeout(() => {
      document.documentElement.style.opacity = '1'
    }, 150)
  }
}
