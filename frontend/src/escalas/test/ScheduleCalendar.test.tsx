import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ScheduleCalendar, type CalendarTarget } from '../components/ScheduleCalendar'
import { FindingsPanel } from '../components/FindingsPanel'
import type { FindingOut } from '../api/client'
import { FINDINGS, assignments } from './fixtures'
import { axeViolations } from './utils'

function Both() {
  const [target, setTarget] = useState<CalendarTarget | null>(null)
  const go = (f: FindingOut) => setTarget({ date: f.occurs_on!, team: f.team, nonce: Date.now() })
  return (
    <>
      <ScheduleCalendar assignments={assignments()} teams={['A', 'B', 'C', 'D']} start="2027-01-04" weeks={8} findings={FINDINGS} target={target} />
      <FindingsPanel findings={FINDINGS} onGoTo={go} />
    </>
  )
}

describe('ScheduleCalendar + FindingsPanel', () => {
  it('mostra 4 turmas × 56 dias com códigos e folgas', () => {
    render(<ScheduleCalendar assignments={assignments()} teams={['A', 'B', 'C', 'D']} start="2027-01-04" weeks={8} />)
    expect(screen.getAllByRole('gridcell')).toHaveLength(4 * 56)
    expect(screen.getByLabelText('Turma A, 04/01/2027: turno M')).toBeInTheDocument()
    expect(screen.getByLabelText(/Turma A, 10\/01\/2027 \(domingo\): folga/)).toBeInTheDocument()
  })

  it('limita a 8 semanas', () => {
    render(<ScheduleCalendar assignments={[]} teams={['A']} start="2027-01-04" weeks={12} />)
    expect(screen.getAllByRole('gridcell')).toHaveLength(56)
  })

  it('"Ver no calendário" leva o foco à célula da turma/data da violação', () => {
    render(<Both />)
    const cell = screen.getByLabelText(/^Turma C, 20\/01\/2027.*CLT_JORNADA_DIARIA/)
    fireEvent.click(screen.getByRole('button', { name: 'Ver no calendário' }))
    expect(document.activeElement).toBe(cell)
    expect(cell).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowRight' })
    expect(document.activeElement).toHaveAttribute('data-date', '2027-01-21')
  })

  it('agrupa achados por severidade e filtra', () => {
    render(<FindingsPanel findings={FINDINGS} />)
    expect(screen.getByRole('heading', { name: 'Erro · 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Alerta · 1' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Erro (1)' }))
    expect(screen.queryByRole('heading', { name: 'Alerta · 1' })).not.toBeInTheDocument()
    expect(screen.getByText(/3 achados: 1 erros, 1 alertas, 1 informativos/)).toBeInTheDocument()
  })

  it('sem violações axe', async () => {
    const { container } = render(<Both />)
    expect(await axeViolations(container)).toEqual([])
  })
})
