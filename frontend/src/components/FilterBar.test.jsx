import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'

const defaultFilters = { store: 'all', onlyActive: true }

it('muestra botones de tienda: Todas, Walmart, Gollo, Monge', () => {
  render(<FilterBar filters={defaultFilters} onChange={() => {}} />)
  expect(screen.getByRole('button', { name: /todas/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /walmart/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /gollo/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /monge/i })).toBeInTheDocument()
})

it('llama onChange con el store correcto al hacer clic', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<FilterBar filters={defaultFilters} onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: /walmart/i }))
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, store: 'walmart' })
})

it('muestra el toggle "Solo activas"', () => {
  render(<FilterBar filters={defaultFilters} onChange={() => {}} />)
  expect(screen.getByRole('checkbox', { name: /solo activas/i })).toBeInTheDocument()
})

it('llama onChange al cambiar el toggle', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<FilterBar filters={defaultFilters} onChange={onChange} />)
  await user.click(screen.getByRole('checkbox', { name: /solo activas/i }))
  expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, onlyActive: false })
})
