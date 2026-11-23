import { diferenciaPct, umbralTarifa, type Decision } from '../domain/calc'
import { fmtCOP, fmtN, fmtPct } from '../domain/format'
import type { Perfil, ResultadoAlt } from '../domain/types'

export const nombre = (r: ResultadoAlt) => r.alt.letra

/** Explicación del banner de la recomendada. */
export function explicacionGanadora(d: Decision, p: Perfil): string {
  if (d.tipo === 'ninguna') return ''
  const g = d.ganadora
  if (d.elegibles.length === 1) return `Es la única alternativa completa que cumple los requisitos mínimos, por eso se recomienda sin comparar entre alternativas.`
  if (d.motivo === 'costo') {
    const otra = d.elegibles[1]
    return `${nombre(g)} tiene el menor costo de ciclo de vida. La siguiente, ${nombre(otra)}, queda ${fmtPct(diferenciaPct(g, otra))} por encima, fuera de la banda de ${fmtN(p.banda, 1)} %.`
  }
  const menor = d.menorLcc
  const dif = diferenciaPct(menor, g)
  const co2 = (1 - g.co2 / menor.co2) * 100
  if (d.criterio === 'raee') {
    return `Empate técnico con ${nombre(menor)}: la diferencia de costo es de ${fmtPct(dif)}, dentro de la banda de ${fmtN(p.banda, 1)} %. El CO₂ es igual, y ${nombre(g)} genera menos RAEE.`
  }
  return `Empate técnico con ${nombre(menor)}: la diferencia de costo es de ${fmtPct(dif)}, dentro de la banda de ${fmtN(p.banda, 1)} %. ${nombre(g)} emite ${fmtPct(co2)} menos CO₂ en el horizonte.`
}

export function textosSensibilidad(d: Decision, p: Perfil): string[] {
  if (d.tipo !== 'ok' || d.elegibles.length < 2) return []
  const [r1, r2] = d.elegibles
  const out: string[] = []
  const t = umbralTarifa(r1, r2, p.H)
  out.push(
    t == null
      ? `${nombre(r1)} sigue siendo la más barata con cualquier tarifa.`
      : `${nombre(r2)} sería la más barata si la tarifa superara ${fmtCOP(t)}/kWh.`,
  )
  const dif = diferenciaPct(r1, r2)
  out.push(
    p.banda >= dif
      ? `Con una banda menor a ${fmtPct(dif)} no hay empate y gana ${nombre(r1)} por costo.`
      : `Con una banda de ${fmtPct(dif)} o más habría empate técnico entre ${nombre(r1)} y ${nombre(r2)}.`,
  )
  return out
}
