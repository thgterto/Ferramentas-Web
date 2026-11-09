import type { S, StructureOut } from '../api/client'
import { pct } from '../api/format'

/**
 * Subsetores e pools (v3.7): horas-posto por subsetor após o remanejamento hora a hora
 * (próprio, recebido de outro subsetor do pool, cedido, déficit) e comparação com/sem pool.
 */
export function SubsectorPanel({ scenario, structure }: { scenario: S['ScenarioOut']; structure: StructureOut }) {
  const k = scenario.kpis
  const rows = scenario.subsectors ?? []
  const name = new Map(structure.subsectors.map((x) => [x.code, x.name]))
  const poolOf = (code: string) => structure.pools.find((p) => p.subsector_codes.includes(code))
  const withPool = k.subsector_deficit_post_hours ?? 0
  const without = k.subsector_deficit_without_pool
  return (
    <section aria-label="Subsetores e pools" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4" data-testid="painel-subsetores">
      <h2 className="text-h2 font-semibold">Subsetores, posições e pools</h2>
      {structure.pools.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-caption">
          {structure.pools.map((p) => (
            <li key={p.code} className="rounded-cell border border-dashed border-primary px-2 py-1">
              <strong>Pool {p.name}</strong>: {p.subsector_codes.map((c) => name.get(c) ?? c).join(' ⇄ ')} · {p.mode === 'total' ? 'intercambialidade total' : `cargos ${p.allowed_role_codes.join(', ')}`}
              {p.max_borrowed_hours_week != null ? ` · até ${p.max_borrowed_hours_week} h emprestadas/sem/pessoa` : ''}
              {p.prefer_home ? ' · prefere a lotação de origem' : ''}
            </li>
          ))}
        </ul>
      )}
      {without != null && (
        <p className="text-body" aria-live="polite">
          Déficit nos subsetores: <strong>{without}</strong> h-posto sem pool → <strong>{withPool}</strong> com pool · {k.moved_hours ?? 0} horas remanejadas
        </p>
      )}
      <table className="w-full max-w-4xl text-body" aria-label="Cobertura por subsetor">
        <thead className="text-left text-caption text-ink-muted">
          <tr>
            {['Subsetor', 'Posições', 'Pool', 'Demanda', 'Próprio', 'Recebido', 'Cedido', 'Déficit', 'Cobertura'].map((h) => (
              <th key={h} scope="col" className="px-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-t border-border tabular-nums" data-subsector={r.code}>
              <th scope="row" className="px-1 text-left font-semibold">
                {name.get(r.code) ?? r.code}
              </th>
              <td className="px-1 text-caption">{structure.subsectors.find((x) => x.code === r.code)?.workstations?.map((w) => w.code).join(', ')}</td>
              <td className="px-1">{poolOf(r.code)?.code ?? '—'}</td>
              <td className="px-1">{r.demand_post_hours}</td>
              <td className="px-1">{r.own_post_hours}</td>
              <td className="px-1 text-primary">{r.received_post_hours ? `⇄ ${r.received_post_hours}` : 0}</td>
              <td className="px-1">{r.lent_post_hours}</td>
              <td className={r.deficit_post_hours ? 'px-1 font-bold text-sev-erro' : 'px-1'}>{r.deficit_post_hours}</td>
              <td className="px-1">{pct(r.pct_hours_covered)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
