import { describe, it, expect } from 'vitest'
import { formatPrice, formatDiscount, formatTimeActive } from './format'

describe('formatPrice', () => {
  it('formatea precios en colones con separadores de miles', () => {
    expect(formatPrice(299999)).toBe('₡299.999')
  })

  it('formatea precios pequeños correctamente', () => {
    expect(formatPrice(1000)).toBe('₡1.000')
  })
})

describe('formatDiscount', () => {
  it('retorna el porcentaje redondeado con signo', () => {
    expect(formatDiscount(70.12)).toBe('-70%')
  })

  it('redondea al entero más cercano', () => {
    expect(formatDiscount(65.9)).toBe('-66%')
  })
})

describe('formatTimeActive', () => {
  it('muestra minutos cuando lleva menos de una hora', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    expect(formatTimeActive(tenMinutesAgo)).toBe('10 min')
  })

  it('muestra horas cuando lleva más de 60 minutos', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatTimeActive(twoHoursAgo)).toBe('2 h')
  })

  it('muestra "recién detectado" cuando lleva menos de 1 minuto', () => {
    const justNow = new Date(Date.now() - 30 * 1000).toISOString()
    expect(formatTimeActive(justNow)).toBe('recién detectado')
  })
})
