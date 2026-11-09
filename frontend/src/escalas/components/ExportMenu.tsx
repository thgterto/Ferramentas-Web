import { useState } from 'react'
import { apiBlob } from '../api/client'
import { Button } from './ui'
import { download } from './download'


/** Export CSV/XLSX (FR-23) direto do resultado. */
export function ExportMenu({ scenarioId }: { scenarioId: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const run = async (format: 'csv' | 'xlsx') => {
    setBusy(format)
    setErr(null)
    try {
      const { blob, filename } = await apiBlob(`/scenarios/${scenarioId}/exports`, { body: { format } })
      download(blob, filename)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha no export')
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" disabled={!!busy} onClick={() => void run('csv')}>
        {busy === 'csv' ? 'Exportando…' : 'Exportar CSV'}
      </Button>
      <Button variant="secondary" disabled={!!busy} onClick={() => void run('xlsx')}>
        {busy === 'xlsx' ? 'Exportando…' : 'Exportar XLSX'}
      </Button>
      {err && (
        <span role="alert" className="text-caption text-sev-erro">
          {err}
        </span>
      )}
    </div>
  )
}
