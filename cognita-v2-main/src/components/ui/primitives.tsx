import React from 'react'

type CardPanelProps = {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function CardPanel({ children, style }: CardPanelProps) {
  return (
    <div className="bg-card border-t border-b border-border" style={style}>
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
    <p className="section-title px-4 mb-2" style={style}>
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
