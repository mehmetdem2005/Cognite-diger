import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type Variant = 'primary' | 'secondary'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        variant === 'primary' ? 'bg-teal-700 text-white hover:bg-teal-800' : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        className
      )}
      {...props}
    />
  )
}
