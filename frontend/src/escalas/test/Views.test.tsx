import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MonthlyMatrix } from '../components/MonthlyMatrix'
import { ByShiftView } from '../components/ByShiftView'
import { PersonCalendar } from '../components/PersonCalendar'
import { ShiftBoard } from '../components/ShiftBoard'
import { ShiftRuler } from '../pattern/ShiftRuler'
import { cellLabel, classify } from '../components/coverage'
import { carryBefore, shiftMonth, type MonthlyMatrix as MM } from '../api/matrix'
import type { AssignmentOut, S } from '../api/client'
import type { ShiftSpec } from '../pattern/model'
import { slots } from './fixtures'
import { axeViolations } from './utils'

const SEQ = ['M', 'M', 'T', 'T', 'N', 'N', 'F', 'F'] as const
const SH = {
  M: { start: '06:00', end: '14:00', label: '06–14', night: false },
  T: { start: '14:00', end: '22:00', label: '14–22', night: false },
  N: { start: '22:00', end: '06:00', label: '22–06', night: true },
} as const

/** 6x2 · 4 turmas × 2 pessoas · fevereiro/2027 (começa na segunda); turma D com cargo ENF. */
function matrix(opts: { deficitDay?: number } = {}): MM {
  const n = 28
  const days = Array.from({ length: n }, (_, i) => {
    const date = `2027-02-${String(i + 1).padStart(2, '0')}`
    const wd = (i % 7) + 1
    return { date, weekday: wd, is_weekend: wd >= 6, holiday: i === 8 ? 'Carnaval' : null }
  })
  const teamCells = (ti: number) =>
    Array.from({ length: n }, (_, d) => {
      const code = SEQ[(d + ti * 2) % 8]
      const prev = SEQ[(d - 1 + ti * 2 + 8) % 8]
      return { code, reserve: false, carry: prev === 'N' ? 'N' : null }
    })
  const totals = (cells: { code: string }[]) => ({
    worked_days: cells.filter((c) => c.code !== 'F').length,
    off_days: cells.filter((c) => c.code === 'F').length,
    hours: String(cells.filter((c) => c.code !== 'F').length * 8),
    sundays_off: cells.filter((c, i) => c.code === 'F' && i % 7 === 6).length,
    nights: cells.filter((c) => c.code === 'N').length,
  })
  const teams = ['A', 'B', 'C', 'D'].map((t, ti) => {
    const cells = teamCells(ti)
    return { code: t, size: '2', cells, totals: totals(cells) }
  })
  const people = teams.flatMap((t) => [1, 2].map((k) => ({ id: `${t.code}-0${k}`, name: `${t.code}-0${k}`, team: t.code, role: t.code === 'D' ? 'ENF' : null, cells: t.cells, totals: t.totals })))
  const daily = days.map((d, i) => {
    const by: Record<string, number> = { M: 0, T: 0, N: 0 }
    teams.forEach((t) => {
      const c = t.cells[i].code
      if (c !== 'F') by[c] += 2
    })
    if (opts.deficitDay === i) by.T = 1
    return { date: d.date, by_shift: by, required_by_shift: { M: 2, T: 2, N: 2 }, off: 2, deficit_shifts: opts.deficitDay === i ? ['T'] : [], deficit_hours: opts.deficitDay === i ? 8 : 0, handover_hours: 0, required_peak: 2 }
  })
  return {
    month: '2027-02',
    generated_people: true,
    days,
    shifts: (['M', 'T', 'N'] as const).map((c) => ({ code: c, ...SH[c], duration_min: 480, handover_min: 0, peak: false, crosses_midnight: c === 'N' })),
    people,
    teams,
    daily,
  }
}

describe('Matriz mensal (v3.6)', () => {
  it('pessoas × dias com sigla, F, ←N, feriado, rodapé e totais; grade acessível', async () => {
    const { container } = render(<MonthlyMatrix data={matrix({ deficitDay: 3 })} />)
    const grid = screen.getByRole('grid', { name: 'Matriz mensal 2027-02' })
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(8 * 28)
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(1 + 28 + 5)
    expect(screen.getByText('feriado: Carnaval')).toBeInTheDocument()
    // agrupado por turma por padrão
    expect(screen.getByRole('rowheader', { name: /Turma A \(2\)/ })).toBeInTheDocument()
    // A em N nos dias 05–06/02: no dia 06 e no 07 (folga) a noite anterior continua
    expect(screen.getByLabelText('A-01, 06/02/2027: turno N 22–06; continua de ontem: N 22–06')).toHaveTextContent('N←N')
    expect(screen.getByLabelText('A-01, 07/02/2027: folga; continua de ontem: N 22–06')).toHaveTextContent('F←N')
    // rodapé por turno + déficit destacado no dia 4
    const footT = container.querySelector('tr[data-foot="T"]')!
    expect(footT.querySelectorAll('td[data-deficit]')).toHaveLength(1)
    expect(footT).toHaveTextContent('▼1')
    expect(container.querySelector('tr[data-foot="F"]')).toHaveTextContent('Em folga')
    // totais por pessoa
    const rowA = container.querySelector('tr[data-row="A-01"]')!
    const tds = rowA.querySelectorAll('td:not([role="gridcell"])')
    expect([...tds].map((t) => t.textContent)).toEqual(['22', '6', '176', '1', '6'])
    // teclado
    const first = within(grid).getAllByRole('gridcell')[0]
    first.focus()
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(document.activeElement).toHaveAttribute('data-rc', '0-1')
    fireEvent.keyDown(grid, { key: 'End' })
    expect(document.activeElement).toHaveAttribute('data-rc', '0-27')
    expect(await axeViolations(container)).toEqual([])
  })

  it('filtros: turno N, cargo, turma, busca e linhas por turma', () => {
    render(<MonthlyMatrix data={matrix()} />)
    fireEvent.change(screen.getByLabelText('Turno'), { target: { value: 'N' } })
    const cells = screen.getAllByRole('gridcell')
    expect(cells.filter((c) => c.className.includes('opacity-30')).length).toBe(cells.filter((c) => c.dataset.code !== 'N').length)
    fireEvent.change(screen.getByLabelText('Turno'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'ENF' } })
    expect(screen.getAllByRole('gridcell')).toHaveLength(2 * 28)
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Turma'), { target: { value: 'B' } })
    expect(screen.getAllByRole('gridcell')).toHaveLength(2 * 28)
    fireEvent.change(screen.getByLabelText('Turma'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Buscar pessoa'), { target: { value: 'c-02' } })
    expect(screen.getAllByRole('rowheader').some((h) => h.textContent === 'C-02')).toBe(true)
    expect(screen.getAllByRole('gridcell')).toHaveLength(28)
    fireEvent.change(screen.getByLabelText('Buscar pessoa'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Agrupar por'), { target: { value: 'cargo' } })
    expect(screen.getByRole('rowheader', { name: /ENF \(2\)/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Turmas' }))
    expect(screen.getAllByRole('gridcell')).toHaveLength(4 * 28)
  })

  it('helpers: mês anterior/seguinte e véspera do horizonte para o Gantt', () => {
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
    expect(shiftMonth('2027-12', 1)).toBe('2028-01')
    // 06/02: turma A vem de N (05/02) → carry N
    expect(carryBefore(matrix(), '2027-02-06').A).toBe('N')
    expect(carryBefore(matrix(), '2027-03-01')).toEqual({})
  })
})

describe('Visão por turno (v3.6)', () => {
  it('para o dia: quem está em cada turno (agrupado por turma), quem continua e quem folga', async () => {
    const { container } = render(<ByShiftView data={matrix({ deficitDay: 0 })} />)
    const m = screen.getByRole('region', { name: 'Turno M' })
    expect(m).toHaveTextContent('Turma A: A-01, A-02')
    expect(m).toHaveTextContent('2 pessoas / 2 necessários')
    expect(screen.getByRole('region', { name: 'Turno T' })).toHaveTextContent('▼ déficit')
    expect(screen.getByRole('region', { name: 'Turno N' })).toHaveTextContent('Turma C: C-01, C-02')
    expect(screen.getByRole('region', { name: 'Continua de ontem' })).toHaveTextContent('Turma D: D-01 (ENF), D-02 (ENF)')
    expect(screen.getByRole('region', { name: 'Folga' })).toHaveTextContent('Turma D: D-01 (ENF), D-02 (ENF)')
    fireEvent.click(screen.getByRole('button', { name: 'Próximo dia' }))
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Terça, 02/02/2027')
    expect(await axeViolations(container)).toEqual([])
  })
})

describe('Visão pessoa (v3.6)', () => {
  it('calendário individual com totais, ←N, feriado e exportação', () => {
    const onExport = vi.fn()
    render(<PersonCalendar data={matrix()} onExport={onExport} />)
    expect(screen.getByRole('table', { name: 'Calendário de A-01 em 2027-02' })).toBeInTheDocument()
    expect(screen.getByLabelText('Totais de A-01 no mês')).toHaveTextContent('Horas no mês176')
    expect(screen.getByLabelText('06/02/2027: turno N 22–06; continua de ontem: N')).toHaveTextContent('← N 22–06')
    expect(screen.getByLabelText(/^09\/02\/2027 \(feriado Carnaval\)/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Colaborador'), { target: { value: 'D-01' } })
    expect(screen.getByRole('table', { name: 'Calendário de D-01 em 2027-02' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar ICS' }))
    expect(onExport).toHaveBeenCalledWith('ics', 'D-01')
  })
})

describe('Gantt: noite que vem do dia anterior (bug v3.5)', () => {
  it('1º dia do horizonte mostra "← N 22–06" de 00–06 a partir da véspera', () => {
    const asg: AssignmentOut[] = [
      { team: 'A', work_date: '2027-01-04', shift_code: null, is_day_off: true, starts_at: null, ends_at: null, clock_minutes: 0 },
      { team: 'B', work_date: '2027-01-04', shift_code: 'M', is_day_off: false, starts_at: '2027-01-04T06:00:00', ends_at: '2027-01-04T14:00:00', clock_minutes: 480 },
    ]
    const teams = ['A', 'B'].map((c) => ({ code: c, kind: 'regular', label: null, size_required: '1', size_assigned: 1, cycle_offset_days: 0, composition: {} }) as S['TeamOut'])
    const shifts = [
      { code: 'M', start: '06:00', duration_min: 480 },
      { code: 'N', start: '22:00', duration_min: 480 },
    ]
    const { rerender } = render(<ShiftBoard assignments={asg} teams={teams} shifts={shifts} start="2027-01-04" weeks={1} />)
    const rowA = () => within(screen.getByRole('table')).getAllByRole('row')[1]
    expect(rowA()).toHaveTextContent('F · folga')
    rerender(<ShiftBoard assignments={asg} teams={teams} shifts={shifts} start="2027-01-04" weeks={1} before={{ A: 'N', B: null }} />)
    expect(rowA()).toHaveTextContent('← N 22–06')
    expect(rowA()).toHaveTextContent(/folga; continua de ontem: N 22–06/)
    expect(rowA()).not.toHaveTextContent('F · folga')
  })
})

describe('Sobreposição de passagem (v3.6)', () => {
  it('heatmap classifica "passagem planejada" (não excesso ocioso)', () => {
    const s = slots((i) => (i === 14 ? { status: 'passagem', gap: '1.000000', scheduled_worst: '4.000000', handover: '1.000000' } : {}))
    expect(classify(s[14])).toBe('passagem')
    expect(cellLabel(s[14], 4)).toMatch(/passagem planejada de 1 postos \(sobreposição de passagem/)
    expect(classify(s[13])).toBe('exata')
  })

  it('construtor: passagem em minutos por turno estende o turno (06–14 + 20 → 06–14:20)', () => {
    function Harness() {
      const [s, setS] = useState<ShiftSpec[]>([{ code: 'M', start: '06:00', duration_min: 480, break_min: 60, handover_min: 0, peak: false }])
      return (
        <>
          <ShiftRuler shifts={s} used={new Set(['M'])} onChange={setS} />
          <output data-testid="dur">{`${s[0].duration_min}/${s[0].handover_min}`}</output>
        </>
      )
    }
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Sobreposição de passagem do turno M em minutos'), { target: { value: '20' } })
    expect(screen.getByTestId('dur')).toHaveTextContent('500/20')
    expect(screen.getByRole('img', { name: /M 06–14:20/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Sobreposição de passagem do turno M em minutos'), { target: { value: '30' } })
    expect(screen.getByTestId('dur')).toHaveTextContent('510/30')
  })
})
