import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth'
import { ApiError } from '../api/client'
import { Button, Field, inputCls } from '../components/ui'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})
type F = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [err, setErr] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<F>({ resolver: zodResolver(schema) })
  const onSubmit = async (v: F) => {
    setErr(null)
    try {
      await login(v.email, v.password)
      const next = sp.get('next')
      nav(next && next.startsWith('/escalas') ? next : '/escalas', { replace: true })
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 401 ? 'E-mail ou senha inválidos.' : 'Não foi possível entrar. Verifique a conexão e tente de novo.')
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full max-w-sm flex-col gap-4 rounded-card border border-border bg-surface p-6" aria-labelledby="login-t">
        <h1 id="login-t" className="text-h1 font-semibold">
          Entrar no simulador
        </h1>
        <Field label="E-mail" htmlFor="email" error={formState.errors.email?.message}>
          <input id="email" type="email" autoComplete="username" className={inputCls} aria-invalid={!!formState.errors.email} disabled={formState.isSubmitting} {...register('email')} />
        </Field>
        <Field label="Senha" htmlFor="password" error={formState.errors.password?.message}>
          <input id="password" type="password" autoComplete="current-password" className={inputCls} aria-invalid={!!formState.errors.password} disabled={formState.isSubmitting} {...register('password')} />
        </Field>
        {err && (
          <p role="alert" className="text-body text-sev-erro">
            {err}
          </p>
        )}
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
