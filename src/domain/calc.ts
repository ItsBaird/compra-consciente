import type { Alternativa, Perfil, ResultadoAlt } from './types'

export const PERFIL_DEFECTO: Perfil = {
  N: 50,
  H: 6,
  hOn: 8,
  hSusp: 2,
  dias: 240,
  tarifa: 1000,
  factor: 0.22,
  banda: 5,
}

/** kWh/año de un equipo según el perfil de la entidad (días no laborales: apagado). */
export function energiaAnualEquipo(
  wOn: number,
  wSusp: number,
  wOff: number,
  p: Pick<Perfil, 'hOn' | 'hSusp' | 'dias'>,
): number {
  const hOff = 24 - p.hOn - p.hSusp
  return (
    ((wOn * p.hOn + wSusp * p.hSusp + wOff * hOff) * p.dias) / 1000 +
    (wOff * 24 * (365 - p.dias)) / 1000
  )
}

export function faltantesDatos(a: Alternativa): string[] {
  const f: string[] = []
  if (!(a.precio && a.precio > 0)) f.push('precio')
  if (!(a.vida && a.vida > 0)) f.push('vida útil')
  if (a.wOn == null || !(a.wOn > 0)) f.push('vatios encendido')
  if (a.wSusp == null) f.push('vatios suspensión')
  if (a.wOff == null) f.push('vatios apagado')
  if (!(a.peso && a.peso > 0)) f.push('peso')
  return f
}

export function faltantesRequisitos(a: Alternativa): string[] {
  const f: string[] = []
  if (!a.rohs) f.push('RoHS')
  if (!a.retoma) f.push('evidencia de retoma')
  return f
}

export function calcularAlternativa(a: Alternativa, p: Perfil): ResultadoAlt {
  const faltan = faltantesDatos(a)
  if (faltan.length === 0 && Object.keys(validarAlternativa(a)).length > 0) faltan.push('corregir valores inválidos')
  const completa = faltan.length === 0
  const falta = faltantesRequisitos(a)
  const base: ResultadoAlt = {
    alt: a,
    completa,
    faltan,
    cumple: falta.length === 0,
    falta,
    kwhEquipoAnio: 0,
    kwhAnio: 0,
    kwhH: 0,
    factorRepos: 0,
    compraH: 0,
    energiaCosto: 0,
    lcc: 0,
    co2: 0,
    raee: 0,
  }
  if (!completa) return base
  const kwhEq = energiaAnualEquipo(a.wOn!, a.wSusp!, a.wOff!, p)
  const kwhAnio = kwhEq * p.N
  const kwhH = kwhAnio * p.H
  const factorRepos = p.H / a.vida!
  const compraH = a.precio! * p.N * factorRepos
  const energiaCosto = kwhH * p.tarifa
  return {
    ...base,
    kwhEquipoAnio: kwhEq,
    kwhAnio,
    kwhH,
    factorRepos,
    compraH,
    energiaCosto,
    lcc: compraH + energiaCosto,
    co2: kwhH * p.factor,
    raee: a.peso! * p.N * factorRepos,
  }
}

export type Decision =
  | { tipo: 'ninguna' }
  | {
      tipo: 'ok'
      ganadora: ResultadoAlt
      motivo: 'costo' | 'desempate'
      elegibles: ResultadoAlt[] // ordenadas por LCC
      empatadas: ResultadoAlt[] // dentro de la banda (incluye la de menor LCC)
      menorLcc: ResultadoAlt
      /** Criterio que resolvió el desempate. */
      criterio?: 'co2' | 'raee'
    }

export function decidir(resultados: ResultadoAlt[], bandaPct: number): Decision {
  const elegibles = resultados
    .filter((r) => r.completa && r.cumple)
    .sort((a, b) => a.lcc - b.lcc)
  if (elegibles.length === 0) return { tipo: 'ninguna' }
  const menor = elegibles[0]
  const limite = menor.lcc * (1 + bandaPct / 100)
  const empatadas = elegibles.filter((r) => r.lcc <= limite + 1e-9)
  if (empatadas.length === 1) {
    return { tipo: 'ok', ganadora: menor, motivo: 'costo', elegibles, empatadas, menorLcc: menor }
  }
  const sorted = [...empatadas].sort((a, b) => a.co2 - b.co2 || a.raee - b.raee || a.lcc - b.lcc)
  const g = sorted[0]
  const criterio: 'co2' | 'raee' = Math.abs(sorted[0].co2 - sorted[1].co2) > 1e-9 ? 'co2' : 'raee'
  return {
    tipo: 'ok',
    ganadora: g,
    motivo: g === menor ? 'costo' : 'desempate',
    elegibles,
    empatadas,
    menorLcc: menor,
    criterio,
  }
}

/** Tarifa a partir de la cual la 2.ª por costo supera a la 1.ª. null = nunca. */
export function umbralTarifa(r1: ResultadoAlt, r2: ResultadoAlt, H: number): number | null {
  const dk = r1.kwhAnio - r2.kwhAnio
  if (!(dk > 0)) return null
  return (r2.compraH - r1.compraH) / (dk * H)
}

/** Diferencia relativa de costo (%) de `otra` respecto a la de menor LCC. */
export function diferenciaPct(menor: ResultadoAlt, otra: ResultadoAlt): number {
  return ((otra.lcc - menor.lcc) / menor.lcc) * 100
}

export function evaluar(alts: Alternativa[], p: Perfil) {
  const resultados = alts.map((a) => calcularAlternativa(a, p))
  return { resultados, decision: decidir(resultados, p.banda) }
}

/** ---- Validaciones (sección 8) ---- */
export type Errores = Record<string, string>

const esEntero = (n: number) => Number.isInteger(n)

export function validarPerfil(p: Perfil): Errores {
  const e: Errores = {}
  if (Number.isNaN(p.N)) e.N = 'Campo obligatorio.'
  else if (!(p.N >= 1) || !esEntero(p.N)) e.N = 'Ingrese un entero mayor o igual a 1.'
  else if (p.N > 100000) e.N = 'Máximo 100.000 equipos.'

  if (Number.isNaN(p.H)) e.H = 'Campo obligatorio.'
  else if (!(p.H >= 1) || !esEntero(p.H)) e.H = 'Ingrese un entero mayor o igual a 1.'
  else if (p.H > 20) e.H = 'Máximo 20 años.'

  if (Number.isNaN(p.hOn)) e.hOn = 'Campo obligatorio.'
  else if (!(p.hOn > 0)) e.hOn = 'Debe ser mayor que 0.'
  else if (p.hOn > 24) e.hOn = 'No puede superar 24 h.'

  if (Number.isNaN(p.hSusp)) e.hSusp = 'Campo obligatorio (use 0 si no aplica).'
  else if (p.hSusp < 0) e.hSusp = 'No puede ser negativo.'
  else if (p.hSusp > 24) e.hSusp = 'No puede superar 24 h.'

  if (!e.hOn && !e.hSusp && p.hOn + p.hSusp > 24) {
    e.hOn = 'Encendido + suspensión no puede superar 24 h.'
    e.hSusp = 'Encendido + suspensión no puede superar 24 h.'
  }

  if (Number.isNaN(p.dias)) e.dias = 'Campo obligatorio.'
  else if (!(p.dias >= 1) || !esEntero(p.dias)) e.dias = 'Ingrese un entero mayor o igual a 1.'
  else if (p.dias > 365) e.dias = 'No puede superar 365 días.'

  if (Number.isNaN(p.tarifa)) e.tarifa = 'Campo obligatorio.'
  else if (!(p.tarifa > 0)) e.tarifa = 'Debe ser mayor que 0.'
  else if (p.tarifa > 10000) e.tarifa = 'Valor demasiado alto para una tarifa en $/kWh.'

  if (Number.isNaN(p.factor)) e.factor = 'Campo obligatorio.'
  else if (!(p.factor > 0)) e.factor = 'Debe ser mayor que 0.'
  else if (p.factor > 2) e.factor = 'Valor demasiado alto; se espera en kg CO₂/kWh (p. ej. 0,22).'

  if (Number.isNaN(p.banda)) e.banda = 'Campo obligatorio (use 0 si no quiere banda).'
  else if (p.banda < 0) e.banda = 'No puede ser negativa.'
  else if (p.banda > 10) e.banda = 'Máximo 10 %.'
  return e
}

/** Valida solo lo que ya se escribió; los vacíos se reportan como «faltan datos», no como error. */
export function validarAlternativa(a: Alternativa): Errores {
  const e: Errores = {}
  const { precio, vida, wOn, wSusp, wOff, peso } = a
  if (precio != null) {
    if (!(precio > 0)) e.precio = 'Debe ser mayor que 0.'
    else if (!esEntero(precio)) e.precio = 'Ingrese pesos enteros, sin decimales.'
    else if (precio > 100_000_000) e.precio = 'Parece demasiado alto para un precio unitario.'
  }
  if (vida != null) {
    if (!(vida >= 1) || !esEntero(vida)) e.vida = 'Ingrese un entero mayor o igual a 1.'
    else if (vida > 15) e.vida = 'Máximo 15 años.'
  }
  if (wOn != null) {
    if (!(wOn > 0)) e.wOn = 'Debe ser mayor que 0.'
    else if (wOn > 1000) e.wOn = 'Máximo 1.000 W.'
  }
  if (wSusp != null) {
    if (wSusp < 0) e.wSusp = 'No puede ser negativo.'
    else if (wOn != null && wOn > 0 && wSusp > wOn) e.wSusp = 'No puede superar el consumo encendido.'
  }
  if (wOff != null) {
    if (wOff < 0) e.wOff = 'No puede ser negativo.'
    else if (wOn != null && wOn > 0 && wOff > wOn) e.wOff = 'No puede superar el consumo encendido.'
    else if (wSusp != null && wOff > wSusp) e.wOff = 'No puede superar el consumo en suspensión.'
  }
  if (peso != null) {
    if (!(peso > 0)) e.peso = 'Debe ser mayor que 0.'
    else if (peso > 50) e.peso = 'Máximo 50 kg.'
  }
  return e
}
