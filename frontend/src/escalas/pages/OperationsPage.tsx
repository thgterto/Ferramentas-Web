import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { api, apiData, type OperationOut } from '../api/client'
import { Button, Card, ErrorBox, Field, Spinner, inputCls } from '../components/ui'

const SECTORS = ['industria', 'saude', 'logistica', 'varejo', 'ti_noc', 'contact_center', 'saneamento', 'outro'] as const

export default function OperationsPage() {
  const { org } = useParams()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['operations'], queryFn: () => api<{ data: OperationOut[] }>('/operations?per_page=200') })
  const [name, setName] = useState('')
  const [sector, setSector] = useState<string>('industria')
  const create = useMutation({
    mutationFn: () => apiData<OperationOut>('/operations', { body: { name, sector, is_24x7: true } }),
    onSuccess: () => {
      setName('')
      void qc.invalidateQueries({ queryKey: ['operations'] })
    },
  })
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-h1 font-semibold">Operações</h1>
      <Card title="Nova operação">
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim().length >= 2) create.mutate()
          }}
        >
          <Field label="Nome" htmlFor="op-nome">
            <input id="op-nome" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </Field>
          <Field label="Setor" htmlFor="op-setor">
            <select id="op-setor" className={inputCls} value={sector} onChange={(e) => setSector(e.target.value)}>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={create.isPending}>
            Criar operação
          </Button>
        </form>
        <div className="mt-2">
          <ErrorBox error={create.error} />
        </div>
      </Card>
      {q.isLoading && <Spinner />}
      <ErrorBox error={q.error} />
      {q.data && q.data.data.length === 0 && <p className="text-ink-muted">Nenhuma operação. Crie a primeira acima.</p>}
      {q.data && q.data.data.length > 0 && (
        <table className="w-full border-collapse rounded-card bg-surface text-body">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th scope="col" className="p-2">Operação</th>
              <th scope="col" className="p-2">Setor</th>
              <th scope="col" className="p-2">Regime</th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-2">
                  <Link className="text-primary underline" to={`/escalas/o/${org}/operacoes/${o.id}`}>
                    {o.name}
                  </Link>
                </td>
                <td className="p-2">{o.sector}</td>
                <td className="p-2">{o.is_24x7 ? '24/7' : 'janela fixa'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
