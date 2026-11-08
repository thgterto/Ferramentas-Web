import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renderiza sem erros', () => {
    render(<App />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
