import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, Calculator, Cloud, CircleAlert, ShieldCheck, SlidersHorizontal, Trash2, X, Zap } from 'lucide-react'
import { AnimatedNumber, Pill } from '../components/common'
import { diferenciaPct, validarPerfil } from '../domain/calc'
import { fmt0, fmtCOP, fmtN, fmtPct } from '../domain/format'
import type { ResultadoAlt } from '../domain/types'
import { useApp, useEvaluacion } from '../store'
import { explicacionGanadora, textosSensibilidad } from './explain'

const cop = (n: number) => fmtCOP(n)
const kg = (n: number) => fmt0(n) + ' kg'

function etiqueta(r: ResultadoAlt, ganadoraId: string | null, empatadas: ResultadoAlt[]) {
  if (r.alt.id === ganadoraId) return { txt: 'Recomendada', tone: 'ok' as const }
  if (r.completa && r.cumple && empatadas.includes(r)) return { txt: 'Empate técnico', tone: 'co2' as const }
  if (r.completa && r.cumple) return { txt: 'Cumple', tone: 'neutral' as const }
  return { txt: 'No cumple', tone: 'bad' as const }
}

export default function Resultados() {
  const { state, dispatch } = useApp()
  if (Object.keys(validarPerfil(state.perfil)).length > 0) {
    return (
      <div className="stack">
        <h1>Resultados</h1>
        <div className="empty" role="status">
          <CircleAlert size={28} aria-hidden />
          <h2>Falta completar el perfil de la compra</h2>
          <p>Diligencie cantidad, horizonte y perfil de uso para calcular los resultados.</p>
          <button className="btn primary" onClick={() => dispatch({ type: 'ir', vista: 'perfil' })}>Ir al perfil</button>
        </div>
      </div>
    )
  }
  return <ResultadosCalculados />
}

function ResultadosCalculados() {
  const { state, dispatch } = useApp()
  const { resultados, decision } = useEvaluacion()
  const reduce = useReducedMotion()
  const p = state.perfil
  const ganadoraId = decision.tipo === 'ok' ? decision.ganadora.alt.id : null
  const empatadas = decision.tipo === 'ok' && decision.empatadas.length > 1 ? decision.empatadas : []
  const completas = resultados.filter((r) => r.completa)
  const incompletas = resultados.filter((r) => !r.completa)
  const maxLcc = Math.max(1, ...completas.map((r) => r.lcc))
  const sens = textosSensibilidad(decision, p)
  const soloUna = decision.tipo === 'ok' && decision.elegibles.length === 1

  return (
    <div className="stack">
      <div>
        <h1>Resultados</h1>
        <p className="lead">{p.N} equipos · horizonte de {p.H} años · {resultados.length} alternativas</p>
      </div>

      {incompletas.length > 0 && (
        <div className="note warn" role="status">
          <CircleAlert size={18} aria-hidden />
          <p>{incompletas.map((r) => `${r.alt.letra}: faltan datos (${r.faltan.join(', ')})`).join(' · ')}. No se incluye en la comparación.</p>
        </div>
      )}

      {decision.tipo === 'ninguna' ? (
        <div className="empty" role="status">
          <CircleAlert size={28} aria-hidden />
          <h2>Ninguna alternativa cumple los requisitos mínimos</h2>
          <p>Revise que cada alternativa esté completa y tenga RoHS y evidencia de retoma con gestor autorizado.</p>
        </div>
      ) : (
        <section className="banner" aria-live="polite">
          <span className="banner-icon" aria-hidden><ShieldCheck size={28} /></span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={decision.ganadora.alt.id + decision.motivo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="eyebrow">{decision.motivo === 'costo' ? 'Recomendada por menor costo' : 'Recomendada por desempate ambiental'}</span>
              <h2>Alternativa {decision.ganadora.alt.letra}{decision.ganadora.alt.proveedor ? ` · ${decision.ganadora.alt.proveedor}` : ''}</h2>
              <p>{explicacionGanadora(decision, p)}</p>
            </motion.div>
          </AnimatePresence>
        </section>
      )}

      <div className="res-grid">
        {resultados.map((r) => {
          const et = etiqueta(r, ganadoraId, empatadas)
          const gan = r.alt.id === ganadoraId
          const atenuada = !r.cumple || !r.completa
          return (
            <article key={r.alt.id} className={'card res-card' + (atenuada ? ' dim' : '')} aria-label={`Alternativa ${r.alt.letra}`}>
              {gan && (
                <motion.span layoutId="ganadora-borde" className="win-ring" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 32 }} />
              )}
              <div className="res-head">
                <span className="alt-letter" aria-hidden>{r.alt.letra}</span>
                <div>
                  <h3>Alternativa {r.alt.letra}</h3>
                  <small>{r.alt.proveedor || 'Sin proveedor'}</small>
                </div>
                <Pill tone={et.tone}>{et.txt}</Pill>
              </div>
              {!r.completa ? (
                <p className="note warn"><CircleAlert size={16} aria-hidden /> {r.alt.letra}: faltan datos ({r.faltan.join(', ')}).</p>
              ) : (
                <>
                  <p className="metric"><span className="metric-label">Costo de ciclo de vida</span><strong><AnimatedNumber value={r.lcc} format={cop} /></strong></p>
                  <div className="chips">
                    <Pill tone="co2"><Cloud size={14} aria-hidden /> CO₂ <AnimatedNumber value={r.co2} format={kg} /></Pill>
                    <Pill tone="raee"><Trash2 size={14} aria-hidden /> RAEE <AnimatedNumber value={r.raee} format={kg} /></Pill>
                  </div>
                  {!r.cumple && <p className="note bad"><CircleAlert size={16} aria-hidden /> No cumple: falta {r.falta.join(' y ')}.</p>}
                </>
              )}
            </article>
          )
        })}
      </div>

      {completas.length > 0 && (
        <section className="card" aria-labelledby="h-bars">
          <h2 id="h-bars">Costo de ciclo de vida</h2>
          <div className="legend" aria-hidden>
            <span><i className="sw compra" /> Compra</span>
            <span><i className="sw energia" /> Energía</span>
          </div>
          <ul className="bars">
            {completas.map((r) => (
              <li key={r.alt.id} className={!r.cumple ? 'dim' : ''}>
                <span className="bar-name">{r.alt.letra}</span>
                <div className="bar-track">
                  <motion.div
                    className="bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.lcc / maxLcc) * 100}%` }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
                  >
                    <span className="seg compra" style={{ flexGrow: r.compraH }} />
                    <span className="seg energia" style={{ flexGrow: r.energiaCosto }} />
                  </motion.div>
                </div>
                <span className="bar-val">{cop(r.lcc)}<small>compra {cop(r.compraH)} + energía {cop(r.energiaCosto)}</small></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="h-sens">
        <h2 id="h-sens"><SlidersHorizontal size={20} aria-hidden /> Sensibilidad</h2>
        <div className="two">
          <div className="slider">
            <label htmlFor="s-tarifa">Tarifa: <strong>{fmtCOP(p.tarifa)}/kWh</strong></label>
            <input id="s-tarifa" type="range" min={600} max={3000} step={10} value={Math.min(3000, Math.max(600, p.tarifa))} onChange={(e) => dispatch({ type: 'perfil', patch: { tarifa: Number(e.target.value) } })} />
            <div className="range-ends"><span>600</span><span>3.000</span></div>
          </div>
          <div className="slider">
            <label htmlFor="s-banda">Banda de empate: <strong>{fmtN(p.banda, 1)} %</strong></label>
            <input id="s-banda" type="range" min={0} max={10} step={0.1} value={Math.min(10, Math.max(0, p.banda))} onChange={(e) => dispatch({ type: 'perfil', patch: { banda: Number(e.target.value) } })} />
            <div className="range-ends"><span>0 %</span><span>10 %</span></div>
          </div>
        </div>
        {soloUna ? (
          <p className="sens-text">Solo una alternativa cumple: no hay sensibilidad entre alternativas.</p>
        ) : (
          <ul className="sens-list" aria-live="polite">
            {sens.map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
        <p className="why">Con reposición proporcional, cambiar el horizonte no cambia la ganadora: todos los costos escalan igual.</p>
      </section>

      <section className="card" aria-labelledby="h-det">
        <h2 id="h-det">Detalle por alternativa</h2>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabla de detalle, desplazable">
          <table>
            <thead>
              <tr>
                <th scope="col">Concepto</th>
                {resultados.map((r) => <th scope="col" key={r.alt.id}>{r.alt.letra}</th>)}
              </tr>
            </thead>
            <tbody>
              <Fila label="Requisitos mínimos" celdas={resultados.map((r) => (r.cumple ? 'Cumple' : `No cumple: falta ${r.falta.join(' y ')}`))} />
              <Fila label="Compra en el horizonte" celdas={resultados.map((r) => (r.completa ? `${cop(r.compraH)} (×${fmtN(r.factorRepos, 2)} = H ÷ vida útil)` : '—'))} />
              <Fila label="Energía (kWh en el horizonte)" celdas={resultados.map((r) => (r.completa ? fmt0(r.kwhH) : '—'))} />
              <Fila label="Costo de energía" celdas={resultados.map((r) => (r.completa ? cop(r.energiaCosto) : '—'))} />
              <Fila label="Costo de ciclo de vida" strong celdas={resultados.map((r) => (r.completa ? cop(r.lcc) : `${r.alt.letra}: faltan datos`))} />
              <Fila label="CO₂" celdas={resultados.map((r) => (r.completa ? kg(r.co2) : '—'))} />
              <Fila label="RAEE" celdas={resultados.map((r) => (r.completa ? kg(r.raee) : '—'))} />
            </tbody>
          </table>
        </div>
      </section>

      <div className="actions">
        <button className="btn ghost" onClick={() => dispatch({ type: 'ir', vista: 'alternativas' })}>
          <ArrowLeft size={18} aria-hidden /> Atrás
        </button>
        <span className="spacer" />
        <button className="btn outline" onClick={() => dispatch({ type: 'panel', abierto: true })}>
          <Calculator size={18} aria-hidden /> ¿Cómo se calculó?
        </button>
      </div>

      <PanelCalculo />
    </div>
  )
}

function Fila({ label, celdas, strong }: { label: string; celdas: string[]; strong?: boolean }) {
  return (
    <tr className={strong ? 'strong' : ''}>
      <th scope="row">{label}</th>
      {celdas.map((c, i) => <td key={i}>{c}</td>)}
    </tr>
  )
}

function PanelCalculo() {
  const { state, dispatch } = useApp()
  const { decision } = useEvaluacion()
  const reduce = useReducedMotion()
  const p = state.perfil
  const cerrar = () => dispatch({ type: 'panel', abierto: false })
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!state.panel) return
    btn.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.panel])

  return (
    <AnimatePresence>
      {state.panel && (
        <>
          <motion.div className="backdrop" onClick={cerrar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="h-drawer"
            initial={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
          >
            <div className="drawer-head">
              <h2 id="h-drawer">¿Cómo se calculó?</h2>
              <button ref={btn} className="icon-btn" onClick={cerrar} aria-label="Cerrar panel"><X size={20} aria-hidden /></button>
            </div>
            <h3>Costo de ciclo de vida (LCC)</h3>
            <pre className="formula">{`LCC = compra_H + kWh_H × tarifa
compra_H = precio × N × (H ÷ vida útil)
kWh_H = kWh/año × N × H`}</pre>
            <p>Con sus valores: N = {p.N}, H = {p.H} años, tarifa = {fmtCOP(p.tarifa)}/kWh.</p>
            <h3>Regla de decisión</h3>
            <ol>
              <li>Descartar las que no cumplen los requisitos mínimos (RoHS y retoma).</li>
              <li>Entre las que cumplen, gana la de menor LCC.</li>
              <li>Si otra queda a {p.banda} % o menos del menor LCC (empate técnico), gana la de menos CO₂; si persiste, la de menos RAEE.</li>
            </ol>
            <h3>Por qué ganó esta alternativa</h3>
            {decision.tipo === 'ninguna' ? (
              <p>Ninguna alternativa cumple los requisitos mínimos.</p>
            ) : (
              <>
                <p>{explicacionGanadora(decision, p)}</p>
                <ul>
                  {decision.elegibles.map((r) => (
                    <li key={r.alt.id}>
                      <strong>{r.alt.letra}</strong>: LCC {fmtCOP(r.lcc)} ({r === decision.menorLcc ? 'menor costo' : `+${fmtPct(diferenciaPct(decision.menorLcc, r))}`}), CO₂ {fmt0(r.co2)} kg, RAEE {fmt0(r.raee)} kg
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="why"><Zap size={14} aria-hidden /> El consumo usa los vatios por modo y el perfil de la entidad.</p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
