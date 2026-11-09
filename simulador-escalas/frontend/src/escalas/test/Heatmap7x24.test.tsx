import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Heatmap7x24 } from '../components/Heatmap7x24'
import { classify } from '../components/coverage'
import { slots } from './fixtures'
import { axeViolations } from './utils'

const data = slots((i) => {
  if (i === 6 * 24 + 3) return { gap: '-2.000000', status: 'deficit', deficit_occurrences: 3 } // dom 03h forte (1/3)
  if (i === 6 * 24 + 4) return { required_net: '10.000000', gap: '-0.500000', status: 'deficit' } // leve (95%)
  if (i === 1 * 24 + 2) return { gap: '1.000000', status: 'excesso' }
  return {}
})

describe('Heatmap7x24', () => {
  it('classifica déficit forte (<90%) e leve', () => {
    expect(classify(data[6 * 24 + 3])).toBe('forte')
    expect(classify(data[6 * 24 + 4])).toBe('leve')
    expect(classify(data[0])).toBe('exata')
    expect(classify(data[26])).toBe('excesso')
  })

  it('renderiza 168 células com ícone/texto redundante e rótulo acessível', () => {
    render(<Heatmap7x24 slots={data} weeks={8} teamsAt={() => ['C', 'D']} />)
    const cells = screen.getAllByRole('gridcell')
    expect(cells).toHaveLength(168)
    const dom3 = screen.getByLabelText(/^Domingo, 03 horas, déficit forte de 2 postos/)
    expect(dom3).toHaveAttribute('data-kind', 'forte')
    expect(dom3.textContent).toContain('▲−2')
    expect(dom3.getAttribute('aria-label')).toMatch(/turmas C, D, ocorre em 3 de 8 semanas/)
    expect(screen.getByLabelText(/^Terça, 02 horas, excesso/).textContent).toContain('●+1')
    expect(screen.getByRole('list', { name: 'Legenda do heatmap' })).toHaveTextContent('Déficit forte')
  })

  it('navega por setas, Home/End e PageDown (roving tabindex) e mostra tooltip', () => {
    const onActivate = vi.fn()
    render(<Heatmap7x24 slots={data} weeks={8} onActivate={onActivate} />)
    const grid = screen.getByRole('grid')
    const first = screen.getAllByRole('gridcell')[0]
    expect(first).toHaveAttribute('tabindex', '0')
    first.focus()
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(document.activeElement).toHaveAttribute('data-i', '1')
    fireEvent.keyDown(grid, { key: 'PageDown' })
    expect(document.activeElement).toHaveAttribute('data-i', String(6 * 24 + 1))
    fireEvent.keyDown(grid, { key: 'End' })
    expect(document.activeElement).toHaveAttribute('data-i', '167')
    fireEvent.keyDown(grid, { key: 'Home' })
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(document.activeElement).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tooltip')).toHaveTextContent('Dom 03:00 · Necessário 3 · Escalados 1 · Déficit −2')
    fireEvent.keyDown(grid, { key: 'Enter' })
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ slot_index: 6 * 24 + 3 }))
  })

  it('alternativa em tabela', () => {
    render(<Heatmap7x24 slots={data} weeks={8} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabela' }))
    expect(screen.getAllByRole('row')).toHaveLength(169)
  })

  it('sem violações axe', async () => {
    const { container } = render(<Heatmap7x24 slots={data} weeks={8} />)
    expect(await axeViolations(container)).toEqual([])
  })
})
