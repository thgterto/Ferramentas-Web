import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { api, apiData, type OperationOut, type ScenarioOut } from '../api/client'
import { pct, fmt } from '../api/format'
import { Card, ErrorBox, Spinner } from '../components/ui'

export default function OperationPage() {
  const { org, op } = useParams()
  const opQ = useQuery({ queryKey: ['operation', op], queryFn: () => apiData<OperationOut>(`/operations/${op}`) })
  const sQ = useQuery({ queryKey: ['scenarios', op], queryFn: () => api<{ data: ScenarioOut[] }>(`/scenarios?operation_id=${op}&per_page=200`) })
  const base = `/escalas/o/${org}/operacoes/${op}`
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-semibold">{opQ.data?.name ?? 'Operação'}</h1>
        <Link to={`${base}/cenarios/novo?passo=1`} className="rounded-cell bg-primary px-4 py-2 font-medium text-white hover:bg-primary-hover">
          Novo cenário
        </Link>
      </div>
      <ErrorBox error={opQ.error ?? sQ.error} />
      <Card title="Cenários">
        {sQ.isLoading && <Spinner />}
        {sQ.data && sQ.data.data.length === 0 && <p className="text-ink-muted">Nenhum cenário. Comece pelo baseline 6x1 ou pelo modelo que você usa hoje.</p>}
        {sQ.data && sQ.data.data.length > 0 && (
          <table className="w-full text-body">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th scope="col" className="p-2">Cenário</th>
                <th scope="col" className="p-2">Status</th>
                <th scope="col" className="p-2 text-right">% coberto</th>
                <th scope="col" className="p-2 text-right">h-posto em déficit</th>
                <th scope="col" className="p-2 text-right">Headcount mín.</th>
                <th scope="col" className="p-2">Bloqueios</th>
              </tr>
            </thead>
            <tbody>
              {sQ.data.data.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-2">
                    <Link className="text-primary underline" to={`${base}/cenarios/${s.id}/cobertura`}>
                      {s.name}
                    </Link>
                  </td>
                  <td className="p-2">{s.status}</td>
                  <td className="p-2 text-right tabular-nums">{pct(s.kpis.coverage_pct)}</td>
                  <td className="p-2 text-right tabular-nums">{fmt(s.kpis.deficit_post_hours)}</td>
                  <td className="p-2 text-right tabular-nums">{s.kpis.headcount_min ?? '—'}</td>
                  <td className="p-2">{s.kpis.blocking_findings > 0 ? <span className="text-sev-erro">✕ inviável ({s.kpis.blocking_findings})</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
