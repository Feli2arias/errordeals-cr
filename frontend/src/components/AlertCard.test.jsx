import { render, screen } from '@testing-library/react'
import { AlertCard } from './AlertCard'

const activeAlert = {
  id: 'alert-1',
  current_price: 30000,
  historical_avg: 100000,
  discount_pct: 70,
  detected_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  is_active: true,
  resolved_at: null,
  products: {
    name: 'Smart TV 55"',
    url: 'https://walmart.co.cr/tv-55',
    image_url: 'https://img.walmart.co.cr/tv.jpg',
    store: 'walmart',
  },
}

const resolvedAlert = { ...activeAlert, is_active: false, resolved_at: new Date().toISOString() }

it('muestra el nombre del producto', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.getByText('Smart TV 55"')).toBeInTheDocument()
})

it('muestra el precio actual formateado', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.getByText('₡30.000')).toBeInTheDocument()
})

it('muestra el precio histórico formateado', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.getByText('₡100.000')).toBeInTheDocument()
})

it('muestra el porcentaje de descuento', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.getByText('-70%')).toBeInTheDocument()
})

it('el link apunta a la tienda', () => {
  render(<AlertCard alert={activeAlert} />)
  const link = screen.getByRole('link')
  expect(link).toHaveAttribute('href', 'https://walmart.co.cr/tv-55')
})

it('muestra badge "Resuelto" cuando is_active es false', () => {
  render(<AlertCard alert={resolvedAlert} />)
  expect(screen.getByText('Resuelto')).toBeInTheDocument()
})

it('no muestra badge "Resuelto" cuando is_active es true', () => {
  render(<AlertCard alert={activeAlert} />)
  expect(screen.queryByText('Resuelto')).not.toBeInTheDocument()
})
