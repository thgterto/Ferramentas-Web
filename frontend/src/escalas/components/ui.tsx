import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({
  variant = 'primary',
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button
      type="button"
      {...p}
      className={clsx(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-cell px-4 py-2 text-body font-medium',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-white hover:bg-primary-hover',
        variant === 'secondary' && 'border border-border bg-surface text-ink hover:bg-surface-2',
        variant === 'ghost' && 'text-primary hover:bg-surface-2',
        className,
      )}
    />
  )
}

export function Card({ title, children, className, actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={clsx('rounded-card border border-border bg-surface p-4', className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-h2 font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Field({ label, htmlFor, error, hint, children }: { label: ReactNode; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-caption font-medium text-ink-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-caption text-ink-subtle">{hint}</p>}
      {error && (
        <p role="alert" id={`${htmlFor}-erro`} className="text-caption text-sev-erro">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputCls =
  'min-h-9 rounded-cell border border-border bg-surface px-3 py-1.5 text-body text-ink aria-[invalid=true]:border-sev-erro'

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <div role="alert" className="rounded-card border border-sev-erro bg-sev-erro-bg px-3 py-2 text-body text-sev-erro">
      <span aria-hidden="true">✕ </span>
      {msg}
    </div>
  )
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <p role="status" className="text-body text-ink-muted">
      {label}
    </p>
  )
}
