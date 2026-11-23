import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, CircleAlert, Info, Plus, Trash2, Zap } from 'lucide-react'
import { NumField } from '../components/common'
import { faltantesRequisitos, validarAlternativa } from '../domain/calc'
import type { Alternativa } from '../domain/types'
import { MAX_ALT, MIN_ALT, useApp } from '../store'

function TarjetaAlt({ a, index }: { a: Alternativa; index: number }) {
  const { state, dispatch } = useApp()
  const reduce = useReducedMotion()
  const set = (patch: Partial<Alternativa>) => dispatch({ type: 'alt', id: a.id, patch })
  const err = validarAlternativa(a)
  // El aviso «No cumple» solo aparece cuando la persona ya empezó a diligenciar la alternativa.
  const iniciada =
    a.proveedor.trim() !== '' ||
    [a.precio, a.vida, a.wOn, a.wSusp, a.wOff, a.peso].some((v) => v != null) ||
    a.rohs ||
    a.retoma
  const faltaReq = iniciada ? faltantesRequisitos(a) : []
  const puedeQuitar = state.alts.length > MIN_ALT

  return (
    <motion.article
      layout={!reduce}
      className="card alt-card"
      aria-label={`Alternativa ${a.letra}`}
      initial={{ opacity: 0, scale: reduce ? 1 : 0.95, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
      transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(index, 4) * 0.06 }}
    >
      <div className="alt-head">
        <span className="alt-letter" aria-hidden>{a.letra}</span>
        <h2>Alternativa {a.letra}</h2>
        <button
          className="icon-btn danger"
          onClick={() => dispatch({ type: 'quitar', id: a.id })}
          disabled={!puedeQuitar}
          aria-label={puedeQuitar ? `Quitar alternativa ${a.letra}` : `No se puede quitar la alternativa ${a.letra}: el mínimo es ${MIN_ALT}`}
          title={puedeQuitar ? 'Quitar alternativa' : `Mínimo ${MIN_ALT} alternativas`}
        >
          <Trash2 size={18} aria-hidden />
        </button>
      </div>

      <div className="field">
        <div className="field-label"><label htmlFor={`prov-${a.id}`}>Proveedor</label></div>
        <div className="input-wrap">
          <input id={`prov-${a.id}`} type="text" value={a.proveedor} onChange={(e) => set({ proveedor: e.target.value })} placeholder="Nombre del proveedor" />
        </div>
      </div>

      <div className="two">
        <NumField label="Precio unitario" unit="$" value={a.precio} onChange={(v) => set({ precio: v })} error={err.precio} inputMode="numeric" miles />
        <NumField label="Vida útil estimada" unit="años" value={a.vida} onChange={(v) => set({ vida: v })} error={err.vida} inputMode="numeric" />
      </div>

      <fieldset className="group">
        <legend><Zap size={15} aria-hidden /> Consumo por modo (W)</legend>
        <div className="three">
          <NumField label="Encendido" unit="W" value={a.wOn} onChange={(v) => set({ wOn: v })} error={err.wOn} />
          <NumField label="Suspensión" unit="W" value={a.wSusp} onChange={(v) => set({ wSusp: v })} error={err.wSusp} />
          <NumField label="Apagado" unit="W" value={a.wOff} onChange={(v) => set({ wOff: v })} error={err.wOff} />
        </div>
      </fieldset>

      <NumField label="Peso neto del equipo" unit="kg" value={a.peso} onChange={(v) => set({ peso: v })} error={err.peso} />

      <fieldset className="group">
        <legend>Requisitos mínimos</legend>
        <label className="check">
          <input type="checkbox" checked={a.rohs} onChange={(e) => set({ rohs: e.target.checked })} />
          <span>Cumple RoHS</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={a.retoma} onChange={(e) => set({ retoma: e.target.checked })} />
          <span>Evidencia de retoma (gestor autorizado)</span>
        </label>
      </fieldset>

      <AnimatePresence>
        {faltaReq.length > 0 && (
          <motion.p
            key="nc"
            className="note bad"
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CircleAlert size={16} aria-hidden /> No cumple: falta {faltaReq.join(' y ')}.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

export default function Alternativas() {
  const { state, dispatch } = useApp()
  const reduce = useReducedMotion()
  const lleno = state.alts.length >= MAX_ALT
  return (
    <div className="stack">
      <div>
        <h1>Alternativas</h1>
        <p className="lead">Cargue las cotizaciones que quiere comparar. Los datos vienen de la ficha técnica que el proveedor ya entrega.</p>
      </div>

      <div className="note info" role="note">
        <Info size={18} aria-hidden />
        <div>
          <p><strong>Cómo diligenciar cada alternativa</strong></p>
          <ul>
            <li>Todas las alternativas deben ser del <strong>mismo tipo de equipo</strong>: portátiles con portátiles, o computadores de escritorio con computadores de escritorio.</li>
            <li>Tome de la ficha técnica del equipo los vatios <strong>por modo</strong> (encendido, suspensión y apagado) y el <strong>peso neto</strong>.</li>
            <li>Si la ficha solo trae la potencia de la fuente de poder, escríbala como consumo encendido; es un máximo, así que el costo de energía de esa alternativa puede salir sobrestimado.</li>
            <li>El precio va en pesos por unidad, sin puntos ni decimales. Los vatios admiten decimales (por ejemplo 1,5).</li>
            <li>Una alternativa solo entra en la comparación cuando tiene precio, vida útil, los tres vatios y el peso. Hasta entonces se muestra como «faltan datos».</li>
          </ul>
        </div>
      </div>

      <motion.div layout={!reduce} className="alt-grid">
        <AnimatePresence mode="popLayout">
          {state.alts.map((a, i) => <TarjetaAlt key={a.id} a={a} index={i} />)}
        </AnimatePresence>
      </motion.div>

      <div className="actions">
        <button className="btn ghost" onClick={() => dispatch({ type: 'ir', vista: 'perfil' })}>
          <ArrowLeft size={18} aria-hidden /> Atrás
        </button>
        <button className="btn outline" onClick={() => dispatch({ type: 'agregar' })} disabled={lleno}>
          <Plus size={18} aria-hidden /> {lleno ? 'Máximo 5 alternativas' : 'Agregar alternativa'}
        </button>
        <span className="spacer" />
        <button className="btn primary" onClick={() => dispatch({ type: 'ir', vista: 'resultados' })}>
          Siguiente: Resultados <ArrowRight size={18} aria-hidden />
        </button>
      </div>
      <p className="hint" aria-hidden={false}>
        Una alternativa nueva queda incompleta hasta tener precio, vida útil, los tres vatios y el peso; mientras tanto, Resultados la ignora.
      </p>
    </div>
  )
}
