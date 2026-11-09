import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ShiftBoard } from '../components/ShiftBoard'
import { Heatmap7x24 } from '../components/Heatmap7x24'
import { presenceAtSlot, presenceByHour } from '../api/schedule'
import type { AssignmentOut, S } from '../api/client'
import { slots } from './fixtures'
import { axeViolations } from './utils'

const T = { M: ['06:00', 8], T: ['14:00', 8], N: ['22:00', 8] } as const
/** 6x2 com 4 turmas a partir de 2027-01-04 (segunda), horários reais. */
function asg(days = 14): AssignmentOut[] {
  const out: AssignmentOut[] = []
  ;['A', 'B', 'C', 'D'].forEach((t, ti) => {
    for (let d = 0; d < days; d++) {
      const dt = new Date(Date.UTC(2027, 0, 4 + d))
      const iso = dt.toISOString().slice(0, 10)
      const code = (['M', 'M', 'T', 'T', 'N', 'N', null, null] as const)[(d + ti * 2) % 8]
      if (!code) {
        out.push({ team: t, work_date: iso, shift_code: null, is_day_off: true, starts_at: null, ends_at: null, clock_minutes: 0 })
        continue
      }
      const [st, h] = T[code]
      const s = new Date(`${iso}T${st}:00Z`)
      const e = new Date(s.getTime() + h * 3600_000)
      const f = (x: Date) => x.toISOString().slice(0, 19)
      out.push({ team: t, work_date: iso, shift_code: code, is_day_off: false, starts_at: f(s), ends_at: f(e), clock_minutes: h * 60 })
    }
  })
  return out
}
const teams: S['TeamOut'][] = ['A', 'B', 'C', 'D'].map((c, i) => ({ code: c, kind: 'regular', label: `Turma ${c}`, size_required: '2.000000', size_assigned: 2, cycle_offset_days: i * 2, composition: c === 'A' ? { ENF: 1, TEC: 1 } : { TEC: 2 } }))
const shifts = [
  { code: 'M', start: '06:00', duration_min: 480 },
  { code: 'T', start: '14:00', duration_min: 480 },
  { code: 'N', start: '22:00', duration_min: 480 },
]

describe('Quadro de turnos (v3.5)', () => {
  it('Gantt por dia: barras com sigla e horário, folga visível e continuação noturna', async () => {
    const { container } = render(<ShiftBoard assignments={asg()} teams={teams} shifts={shifts} start="2027-01-04" weeks={2} />)
    const legend = screen.getByRole('list', { name: 'Legenda dos turnos' })
    expect(legend).toHaveTextContent('M 06–14 · 8 h')
    expect(legend).toHaveTextContent('N 22–06 · 8 h')
    const table = screen.getByRole('table', { name: /Gantt de turnos em 04\/01\/2027/ })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(5)
    expect(rows[1]).toHaveTextContent('M 06–14') // A: M
    expect(rows[4]).toHaveTextContent('F · folga') // D no dia 0: posição 6 = F
    // terça: C entra em N na segunda à noite → continua de ontem
    fireEvent.click(screen.getByRole('button', { name: /Ter 05\/01/ }))
    expect(within(screen.getByRole('table')).getAllByRole('row')[3]).toHaveTextContent(/continua de ontem: N 22–06/)
    expect(await axeViolations(container)).toEqual([])
  })

  it('calendário turma × dia com SIGLA + horário, semanas e pessoas por cargo', () => {
    render(<ShiftBoard assignments={asg()} teams={teams} shifts={shifts} start="2027-01-04" weeks={2} roles={[{ code: 'ENF', name: 'Enfermeiro' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Calendário turma × dia' }))
    expect(screen.getAllByRole('gridcell')).toHaveLength(4 * 7)
    expect(screen.getByLabelText('Turma A, 04/01/2027: turno M, 06–14')).toHaveTextContent('M06–14')
    expect(screen.getByLabelText('Turma C, 04/01/2027: turno N, 22–06')).toBeInTheDocument()
    expect(screen.getByLabelText('Turma D, 04/01/2027: folga')).toHaveTextContent('F')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }))
    expect(screen.getByText(/Semana 2 de 2 · 11\/01\/2027–17\/01\/2027/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pessoas' }))
    expect(screen.getAllByRole('gridcell')).toHaveLength(8 * 7)
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'ENF' } })
    expect(screen.getAllByRole('gridcell')).toHaveLength(7)
    expect(screen.getByRole('rowheader', { name: /A·1/ })).toHaveTextContent('ENF')
    const g = screen.getByRole('grid')
    const first = screen.getAllByRole('gridcell')[0]
    first.focus()
    fireEvent.keyDown(g, { key: 'ArrowRight' })
    expect(document.activeElement).toHaveAttribute('data-rc', '0-1')
  })

  it('heatmap lista só as turmas EFETIVAMENTE trabalhando na hora, com turno', () => {
    const a = asg(14)
    const pres = presenceByHour(a, '2027-01-04')
    // seg 03h: semana 1 não traz a noite de domingo (fora do horizonte) → alvo "Escalados 2"
    const at = presenceAtSlot(pres, 3, '2027-01-04', 2, () => 2, 2)
    expect(at.week).toBe(2)
    expect(at.teams.map((p) => `${p.team}${p.shift}`)).toEqual(['DN'])
    expect(at.allWeeks[0]).toEqual([])
    const at10 = presenceAtSlot(pres, 10, '2027-01-04', 2)
    expect(at10.teams).toHaveLength(1)
    render(<Heatmap7x24 slots={slots()} weeks={2} presenceAt={(i) => presenceAtSlot(pres, i, '2027-01-04', 2)} />)
    const cell = screen.getByLabelText(/^Segunda, 10 horas/)
    expect(cell.getAttribute('aria-label')).toMatch(/turmas A \(M 06–14\)\.?$|turmas A \(M 06–14\)/)
    fireEvent.mouseEnter(cell)
    expect(screen.getByRole('tooltip')).toHaveTextContent(/Trabalhando \(semana \d, pior caso\): A \(M 06–14\)$/)
    fireEvent.click(cell)
    expect(screen.getByTestId('detalhe-hora')).toHaveTextContent('Semana 1: A (M 06–14)')
  })
})
