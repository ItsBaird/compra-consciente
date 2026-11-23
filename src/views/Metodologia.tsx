import { ArrowDown, ArrowLeft, Ban, Check, ExternalLink, Leaf, Recycle, ShoppingCart, Zap } from 'lucide-react'
import { PERFIL_DEFECTO, evaluar, umbralTarifa } from '../domain/calc'
import { FUENTES } from '../domain/data'
import type { Alternativa } from '../domain/types'
import { useApp } from '../store'

/** Datos ilustrativos fijos (caso de prueba); no cambian con lo que la persona diligencia. */
const EJEMPLO: Alternativa[] = [
  { id: 'A', letra: 'A', proveedor: 'Importador mayorista', precio: 1_900_000, vida: 3, wOn: 45, wSusp: 3, wOff: 1, peso: 7.5, rohs: true, retoma: false },
  { id: 'B', letra: 'B', proveedor: 'Marca internacional', precio: 2_250_000, vida: 5, wOn: 22, wSusp: 1.5, wOff: 0.5, peso: 6, rohs: true, retoma: true },
  { id: 'C', letra: 'C', proveedor: 'Proveedor local (Huila)', precio: 2_500_000, vida: 6, wOn: 28, wSusp: 2, wOff: 0.8, peso: 6.8, rohs: true, retoma: true },
]

const fmt = (n: number, d = 0) => n.toLocaleString('es-CO', { maximumFractionDigits: d })
const millones = (n: number) => `$${fmt(n / 1_000_000, 1)} M`

const ETAPAS = [
  { icon: ShoppingCart, t: 'Compra', d: 'Precio unitario × equipos, repuesto según la vida útil.' },
  { icon: Zap, t: 'Uso', d: 'Energía que consumen en el horizonte, a la tarifa del contrato.' },
  { icon: Recycle, t: 'Fin de vida', d: 'Residuos (RAEE) que genera cada alternativa.' },
  { icon: Leaf, t: 'Retoma', d: 'Se exige evidencia de un gestor autorizado.' },
]

const DATOS = [
  { grupo: 'Perfil · compra y uso', filas: [
    ['Cantidad y horizonte', 'Su necesidad de compra (N y H).'],
    ['Horas y días de uso', 'Cómo usa la entidad los equipos: encendido, suspensión y días laborales.'],
  ] },
  { grupo: 'Perfil · parámetros', filas: [
    ['Tarifa ($/kWh)', 'Contrato o tarifario vigente de la entidad con su operador de red.'],
    ['Factor de emisión (kg CO₂/kWh)', 'UPME, Res. 085 de 2026. Editable.'],
    ['Banda de empate (%)', 'Decisión de la entidad; define cuándo dos costos se consideran equivalentes (0 = sin banda).'],
  ] },
  { grupo: 'Alternativas', filas: [
    ['Precio, vida útil', 'Cotización del proveedor.'],
    ['Vatios por modo y peso neto', 'Ficha técnica del equipo.'],
    ['RoHS y retoma', 'Documentos del proveedor.'],
  ] },
]

const FORMULAS = [
  { n: 'Energía', f: 'kWh/año = [W_on·h_on + W_susp·h_susp + W_off·h_off] · días / 1000 + W_off · 24 · (365 − días) / 1000', nota: 'h_off = 24 − h_on − h_susp. Los días no laborales cuentan como apagado.' },
  { n: 'Compra en el horizonte', f: 'compra_H = precio · N · (H / vida útil)', nota: 'Reposición proporcional a la vida útil.' },
  { n: 'Costo de ciclo de vida', f: 'LCC = compra_H + kWh_H · tarifa', nota: 'kWh_H = kWh/año por equipo · N · H.' },
  { n: 'CO₂ y RAEE', f: 'CO₂ = kWh_H · F        RAEE = peso · N · (H / vida útil)', nota: 'Informativos y de desempate.' },
]

function Ejemplo() {
  const { resultados, decision } = evaluar(EJEMPLO, PERFIL_DEFECTO)
  const [, B, C] = resultados
  const max = Math.max(...resultados.map((r) => r.lcc))
  const dif = ((B.lcc - C.lcc) / C.lcc) * 100
  const dco2 = ((B.co2 - C.co2) / C.co2) * 100
  const t = umbralTarifa(C, B, PERFIL_DEFECTO.H)
  const ganadora = decision.tipo === 'ok' ? decision.ganadora.alt.letra : null
  return (
    <section className="card" aria-labelledby="m-ejemplo">
      <h2 id="m-ejemplo">6. Ejemplo resuelto</h2>
      <p className="why">Datos ilustrativos: {PERFIL_DEFECTO.N} equipos, {PERFIL_DEFECTO.H} años, {PERFIL_DEFECTO.dias} días, tarifa {fmt(PERFIL_DEFECTO.tarifa)} $/kWh, banda {PERFIL_DEFECTO.banda} %. No cambian con lo que usted diligencie.</p>
      <div className="meto-bars">
        {resultados.map((r) => (
          <div key={r.alt.id} className={`meto-bar${r.cumple ? '' : ' off'}`}>
            <span className="meto-bar-l">{r.alt.letra}</span>
            <div className="meto-bar-track"><div style={{ width: `${(r.lcc / max) * 100}%` }} /></div>
            <span className="meto-bar-v">{millones(r.lcc)}{!r.cumple && ' · descartada'}{r.alt.letra === ganadora && ' · gana'}</span>
          </div>
        ))}
      </div>
      <ol className="meto-steps-list">
        <li><strong>A</strong> se descarta: no tiene evidencia de retoma.</li>
        <li><strong>C</strong> tiene el menor costo ({millones(C.lcc)}).</li>
        <li><strong>B</strong> queda a {fmt(dif, 2)} % de C, dentro de la banda de {PERFIL_DEFECTO.banda} %: empate técnico.</li>
        <li>Desempata el CO₂: <strong>B</strong> emite {fmt(Math.abs(dco2), 1)} % menos que C, así que gana <strong>{ganadora}</strong>.</li>
      </ol>
      {t != null && <p className="why">Si la tarifa superara unos {fmt(t)} $/kWh, B pasaría a ser también la de menor costo.</p>}
    </section>
  )
}

export default function Metodologia() {
  const { state, dispatch } = useApp()
  return (
    <div className="stack narrow">
      <div>
        <h1>Metodología y fuentes</h1>
        <p className="lead">Cómo se calcula cada cifra y de dónde sale cada dato.</p>
      </div>

      <div className="meto-scope">
        <div className="card"><h3><Check size={16} aria-hidden /> Qué hace</h3><p>Compara alternativas de computadores por costo de ciclo de vida, CO₂ y RAEE antes de publicar el pliego.</p></div>
        <div className="card"><h3><Ban size={16} aria-hidden /> Qué no hace</h3><p>No reemplaza la ficha técnica ni la evaluación jurídica. No usa pesos ni puntajes.</p></div>
        <div className="card"><h3><Leaf size={16} aria-hidden /> Qué compara</h3><p>Equipos del mismo tipo: portátiles con portátiles o escritorio con escritorio.</p></div>
      </div>

      <section className="card" aria-labelledby="m-ciclo">
        <h2 id="m-ciclo">1. Ciclo de vida</h2>
        <div className="meto-etapas">
          {ETAPAS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="meto-etapa"><Icon size={20} aria-hidden /><strong>{t}</strong><span>{d}</span></div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="m-datos">
        <h2 id="m-datos">2. Datos que usa y de dónde salen</h2>
        {DATOS.map((g) => (
          <div key={g.grupo} className="meto-grupo">
            <h3>{g.grupo}</h3>
            <dl>
              {g.filas.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
            </dl>
          </div>
        ))}
        <p className="why">Si una ficha solo trae la potencia de la fuente de poder, se escribe como consumo encendido: es un máximo y puede sobrestimar la energía.</p>
      </section>

      <section className="card" aria-labelledby="m-formulas">
        <h2 id="m-formulas">3. Fórmulas</h2>
        <p className="why">N = cantidad, H = horizonte (años), F = factor de emisión (kg CO₂/kWh).</p>
        <div className="meto-formulas">
          {FORMULAS.map((x) => (
            <div key={x.n} className="meto-formula">
              <strong>{x.n}</strong>
              <code>{x.f}</code>
              <small>{x.nota}</small>
            </div>
          ))}
        </div>
        <p className="why">Como todo escala con H, cambiar el horizonte no cambia la ganadora; la sensibilidad se hace sobre la tarifa y la banda.</p>
      </section>

      <section className="card" aria-labelledby="m-regla">
        <h2 id="m-regla">4. Regla de decisión</h2>
        <div className="meto-regla">
          <div className="meto-paso"><span>1</span><div><strong>Requisitos mínimos</strong><p>RoHS y evidencia de retoma con gestor autorizado. La retoma la define la entidad; no se presenta como obligación legal. Las que no cumplen se descartan, pero se muestran atenuadas.</p></div></div>
          <ArrowDown size={18} aria-hidden className="meto-flecha" />
          <div className="meto-paso"><span>2</span><div><strong>Menor costo de ciclo de vida</strong><p>Entre las completas que cumplen, gana la de menor LCC. Si solo una cumple, se recomienda esa. Una alternativa incompleta queda fuera.</p></div></div>
          <ArrowDown size={18} aria-hidden className="meto-flecha" />
          <div className="meto-paso"><span>3</span><div><strong>Empate técnico</strong><p>Si otra queda a {state.perfil.banda} % (su banda actual) o menos del menor costo, gana la de menos CO₂; si persiste, la de menos RAEE.</p></div></div>
        </div>
      </section>

      <section className="card" aria-labelledby="m-sens">
        <h2 id="m-sens">5. Sensibilidad</h2>
        <ul className="meto-lista">
          <li><strong>Tarifa de cruce (t*):</strong> la tarifa a partir de la cual la alternativa más eficiente supera en costo a la más barata de compra.</li>
          <li><strong>Banda de cruce:</strong> el porcentaje de banda a partir del cual cambia la ganadora.</li>
        </ul>
        <p className="why">Ambas se muestran en Resultados con deslizadores.</p>
      </section>

      <Ejemplo />

      <section className="card" aria-labelledby="m-fuentes">
        <h2 id="m-fuentes">7. Fuentes</h2>
        <ul className="sources">
          {FUENTES.map((f) => (
            <li key={f.uso}>
              <strong>{f.uso}</strong>
              <span>{f.fuente}</span>
              {f.nota && <small>{f.nota}</small>}
              <a href={f.url} target="_blank" rel="noreferrer">Abrir fuente <ExternalLink size={14} aria-hidden /></a>
            </li>
          ))}
        </ul>
      </section>

      <div className="actions">
        <button className="btn ghost" onClick={() => dispatch({ type: 'ir', vista: state.previa === 'metodologia' ? 'perfil' : state.previa })}>
          <ArrowLeft size={18} aria-hidden /> Volver
        </button>
      </div>
    </div>
  )
}
