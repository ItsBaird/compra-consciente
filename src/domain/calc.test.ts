import { describe, expect, it } from 'vitest'
import { PERFIL_DEFECTO, decidir, diferenciaPct, evaluar, umbralTarifa, validarAlternativa } from './calc'
import type { Alternativa } from './types'

const alts: Alternativa[] = [
  { id: 'A', letra: 'A', proveedor: 'Importador mayorista', precio: 1_900_000, vida: 3, wOn: 45, wSusp: 3, wOff: 1, peso: 7.5, rohs: true, retoma: false },
  { id: 'B', letra: 'B', proveedor: 'Marca internacional', precio: 2_250_000, vida: 5, wOn: 22, wSusp: 1.5, wOff: 0.5, peso: 6, rohs: true, retoma: true },
  { id: 'C', letra: 'C', proveedor: 'Proveedor local (Huila)', precio: 2_500_000, vida: 6, wOn: 28, wSusp: 2, wOff: 0.8, peso: 6.8, rohs: true, retoma: true },
]
const p = PERFIL_DEFECTO

describe('caso de prueba (sección 10)', () => {
  const { resultados, decision } = evaluar(alts, p)
  const [A, B, C] = resultados

  it('kWh/año por equipo', () => {
    expect(A.kwhEquipoAnio).toBeCloseTo(94.2, 6)
    expect(B.kwhEquipoAnio).toBeCloseTo(46.14, 6)
    expect(C.kwhEquipoAnio).toBeCloseTo(59.808, 6)
  })
  it('kWh_H, compra_H y LCC', () => {
    expect(A.kwhH).toBeCloseTo(28260, 4)
    expect(B.kwhH).toBeCloseTo(13842, 4)
    expect(C.kwhH).toBeCloseTo(17942.4, 4)
    expect(A.compraH).toBeCloseTo(190_000_000, 2)
    expect(B.compraH).toBeCloseTo(135_000_000, 2)
    expect(C.compraH).toBeCloseTo(125_000_000, 2)
    expect(A.lcc).toBeCloseTo(218_260_000, 0)
    expect(B.lcc).toBeCloseTo(148_842_000, 0)
    expect(C.lcc).toBeCloseTo(142_942_400, 0)
  })
  it('CO2 y RAEE', () => {
    expect(A.co2).toBeCloseTo(6217.2, 2)
    expect(B.co2).toBeCloseTo(3045.24, 2)
    expect(C.co2).toBeCloseTo(3947.328, 2)
    expect(A.raee).toBeCloseTo(750, 6)
    expect(B.raee).toBeCloseTo(360, 6)
    expect(C.raee).toBeCloseTo(340, 6)
  })
  it('A no cumple; B gana por desempate ambiental', () => {
    expect(A.cumple).toBe(false)
    expect(decision.tipo).toBe('ok')
    if (decision.tipo !== 'ok') return
    expect(decision.menorLcc.alt.letra).toBe('C')
    expect(decision.ganadora.alt.letra).toBe('B')
    expect(decision.motivo).toBe('desempate')
    expect(diferenciaPct(C, B)).toBeCloseTo(4.13, 2)
    expect((1 - B.co2 / C.co2) * 100).toBeCloseTo(22.9, 1)
  })
  it('con banda 4 % gana C por costo', () => {
    const d = decidir(resultados, 4)
    expect(d.tipo === 'ok' && d.ganadora.alt.letra).toBe('C')
    expect(d.tipo === 'ok' && d.motivo).toBe('costo')
  })
  it('umbral de tarifa C→B = 2.438,8', () => {
    expect(umbralTarifa(C, B, p.H)).toBeCloseTo(2438.8, 1)
  })
  it('valida coherencia de vatios y topes', () => {
    expect(validarAlternativa(alts[1])).toEqual({})
    expect(validarAlternativa({ ...alts[1], wSusp: 30 }).wSusp).toBeDefined()
    expect(validarAlternativa({ ...alts[1], wOff: 2 }).wOff).toBeDefined()
    expect(validarAlternativa({ ...alts[1], precio: 1.5 }).precio).toBeDefined()
    expect(validarAlternativa({ ...alts[1], vida: 0 }).vida).toBeDefined()
  })
  it('sin alternativas que cumplan', () => {
    expect(decidir([A], 5).tipo).toBe('ninguna')
  })
})
