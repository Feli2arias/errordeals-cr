import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

it('renderiza el texto del badge', () => {
  render(<Badge>Walmart</Badge>)
  expect(screen.getByText('Walmart')).toBeInTheDocument()
})

it('aplica variante "resolved" con estilo correcto', () => {
  render(<Badge variant="resolved">Resuelto</Badge>)
  const badge = screen.getByText('Resuelto')
  expect(badge).toHaveClass('bg-gray-100')
})

it('aplica variante "active" por defecto', () => {
  render(<Badge>Activo</Badge>)
  const badge = screen.getByText('Activo')
  expect(badge).toHaveClass('bg-brand-50')
})
