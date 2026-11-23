export interface Perfil {
  N: number
  H: number
  hOn: number
  hSusp: number
  dias: number
  tarifa: number
  factor: number
  banda: number // porcentaje, p. ej. 5
}

/** Campos numéricos nulos = sin diligenciar (alternativa incompleta). */
export interface Alternativa {
  id: string
  letra: string
  proveedor: string
  precio: number | null
  vida: number | null
  wOn: number | null
  wSusp: number | null
  wOff: number | null
  peso: number | null
  rohs: boolean
  retoma: boolean
}

export interface ResultadoAlt {
  alt: Alternativa
  completa: boolean
  faltan: string[]
  cumple: boolean
  falta: string[] // requisitos mínimos que faltan
  kwhEquipoAnio: number
  kwhAnio: number
  kwhH: number
  factorRepos: number
  compraH: number
  energiaCosto: number
  lcc: number
  co2: number
  raee: number
}
