import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-500 disabled:bg-stone-300 disabled:text-stone-600 dark:disabled:bg-stone-700 dark:disabled:text-stone-300',
  secondary:
    'border-2 border-stone-300 bg-white text-stone-900 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
