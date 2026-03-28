import React from 'react'

type CardPanelProps = {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function CardPanel({ children, style }: CardPanelProps) {
  return (
    <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', ...style }}>
      {children}
    </div>
  )
}

type SectionLabelProps = {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <p className="section-title" style={{ padding: '0 1rem', marginBottom: '0.5rem', ...style }}>
      {children}
    </p>
  )
}

type InlineHintProps = {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function InlineHint({ children, style }: InlineHintProps) {
  return (
    <p className="section-subtitle" style={style}>
      {children}
    </p>
  )
}
