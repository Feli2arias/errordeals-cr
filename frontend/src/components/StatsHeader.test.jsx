import { render, screen } from '@testing-library/react'
import { StatsHeader } from './StatsHeader'

it('muestra el total de alertas activas', () => {
  render(<StatsHeader activeCount={5} totalCount={120} storeCount={3} />)
  expect(screen.getByText('5')).toBeInTheDocument()
})

it('muestra el total histórico de alertas', () => {
  render(<StatsHeader activeCount={5} totalCount={120} storeCount={3} />)
  expect(screen.getByText('120')).toBeInTheDocument()
})

it('muestra el número de tiendas monitoreadas', () => {
  render(<StatsHeader activeCount={5} totalCount={120} storeCount={3} />)
  expect(screen.getByText('3')).toBeInTheDocument()
})
