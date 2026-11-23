const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
export const fmt0 = (n: number) => nf0.format(Math.round(n))
export const fmtN = (n: number, max = 2) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: max, minimumFractionDigits: 0 }).format(n)
export const fmtCOP = (n: number) => '$' + fmt0(n)
export const fmtPct = (n: number, d = 1) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n) + ' %'
