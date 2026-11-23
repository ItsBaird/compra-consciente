import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Info } from 'lucide-react'
import { InfoPop, NumField } from '../components/common'
import { validarPerfil } from '../domain/calc'
import { useApp } from '../store'

export default function Perfil() {
  const { state, dispatch } = useApp()
  const reduce = useReducedMotion()
  const p = state.perfil
  const set = (patch: Partial<typeof p>) => dispatch({ type: 'perfil', patch })
  const num = (v: number | null) => (v == null ? NaN : v)
  const [intento, setIntento] = useState(false)
  const todos = validarPerfil(p)
  const hayError = Object.keys(todos).length > 0
  // Con el formulario limpio no se muestran errores hasta que el usuario escribe o intenta avanzar.
  const err = Object.fromEntries(
    Object.entries(todos).filter(([k, m]) => intento || !Number.isNaN((p as unknown as Record<string, number>)[k]) || m.includes('24')),
  )
  const hOff = 24 - p.hOn - p.hSusp

  const lista = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.06 } },
  }
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 12 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="page-grid">
      <motion.div variants={lista} initial="hidden" animate="show" className="stack">
        <motion.div variants={item}>
          <h1>Perfil de la compra</h1>
          <p className="lead">Defina qué va a comprar y cómo usa sus equipos la entidad. Todas las alternativas se compararán con este mismo perfil.</p>
        </motion.div>

        <motion.div variants={item} className="note info" role="note">
          <Info size={18} aria-hidden />
          <p>
            <strong>Qué se puede comparar:</strong> computadores de escritorio (torre o todo en uno) y portátiles. Compare siempre el mismo tipo de equipo:
            portátiles con portátiles y computadores de escritorio con computadores de escritorio. Si necesita comprar de ambos tipos, haga una comparación por separado para cada uno.
          </p>
        </motion.div>

        <motion.section variants={item} className="card" aria-labelledby="h-compra">
          <h2 id="h-compra">Compra y horizonte</h2>
          <div className="two">
            <NumField label="Cantidad de equipos (N)" value={Number.isNaN(p.N) ? null : p.N} onChange={(v) => set({ N: num(v) })} error={err.N} unit="equipos" inputMode="numeric" />
            <NumField label="Horizonte de análisis (H)" value={Number.isNaN(p.H) ? null : p.H} onChange={(v) => set({ H: num(v) })} error={err.H} unit="años" inputMode="numeric" />
          </div>
          <p className="why">Todas las alternativas se comparan en el mismo horizonte, sin importar su vida útil.</p>
        </motion.section>

        <motion.section variants={item} className="card" aria-labelledby="h-uso">
          <h2 id="h-uso">Perfil de uso de la entidad</h2>
          <div className="three">
            <NumField label="Horas encendido al día" value={Number.isNaN(p.hOn) ? null : p.hOn} onChange={(v) => set({ hOn: num(v) })} error={err.hOn} unit="h" />
            <NumField label="Horas en suspensión al día" value={Number.isNaN(p.hSusp) ? null : p.hSusp} onChange={(v) => set({ hSusp: num(v) })} error={err.hSusp} unit="h" />
            <NumField label="Días laborales al año" value={Number.isNaN(p.dias) ? null : p.dias} onChange={(v) => set({ dias: num(v) })} error={err.dias} unit="días" inputMode="numeric" />
          </div>
          <p className="why">
            El resto del día se cuenta como apagado{!todos.hOn && !todos.hSusp ? ` (${hOff.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h)` : ''}. Un mismo perfil para todas las alternativas hace comparable el consumo.
          </p>
        </motion.section>

        <motion.section variants={item} className="card" aria-labelledby="h-par">
          <h2 id="h-par">Parámetros</h2>
          <div className="params">
            <NumField
              label="Tarifa de energía"
              unit="$/kWh"
              value={Number.isNaN(p.tarifa) ? null : p.tarifa}
              onChange={(v) => set({ tarifa: num(v) })}
              error={err.tarifa}
              placeholder="ej. 1000"
              labelExtra={<InfoPop title="Tarifa de energía">
                Costo de cada kWh que paga la entidad, según su contrato o el tarifario vigente de su operador de red. El 1000 que se ve en gris es solo un ejemplo del formato.
              </InfoPop>}
            />
            <NumField
              label="Factor de emisión"
              unit="kg CO₂/kWh"
              value={Number.isNaN(p.factor) ? null : p.factor}
              onChange={(v) => set({ factor: num(v) })}
              error={err.factor}
              labelExtra={<InfoPop title="Factor de emisión (UPME)">
                UPME, Res. 085 de 2026 (SIN 2024): 0,220 tCO₂eq/MWh, equivalente a 0,22 kg CO₂/kWh; uso optativo para inventarios. <a href="https://docs.upme.gov.co/Normatividad/085_2026.pdf" target="_blank" rel="noreferrer">Ver resolución</a>
              </InfoPop>}
            />
            <NumField
              label="Banda de empate técnico"
              unit="%"
              value={Number.isNaN(p.banda) ? null : p.banda}
              onChange={(v) => set({ banda: num(v) })}
              error={err.banda}
              placeholder="ej. 5"
              labelExtra={<InfoPop title="Banda de empate técnico">
                Decisión de la entidad, no un valor legal. Si otra alternativa queda a esta diferencia porcentual o menos del menor costo de ciclo de vida, desempatan el CO₂ y luego los RAEE. Use 0 si quiere que gane siempre el menor costo.
              </InfoPop>}
            />
          </div>
        </motion.section>

        <motion.div variants={item} className="actions end">
          {intento && hayError && <p className="err" role="alert">Complete o corrija los campos marcados para continuar.</p>}
          <button
            className="btn primary"
            onClick={() => (hayError ? setIntento(true) : dispatch({ type: 'ir', vista: 'alternativas' }))}
          >
            Siguiente: Alternativas <ArrowRight size={18} aria-hidden />
          </button>
        </motion.div>
      </motion.div>

      <aside className="side" aria-label="Información de apoyo">
        <div className="side-card">
          <h3>Para qué sirve</h3>
          <p>Es un apoyo para quien <strong>estructura</strong> la compra: permite probar criterios con cotizaciones de mercado antes de publicar el pliego. No evalúa ofertas reales.</p>
        </div>
        <div className="side-card">
          <h3>Cómo decide</h3>
          <ol>
            <li><strong>Requisitos mínimos:</strong> RoHS y retoma con gestor autorizado. Quien no cumple se descarta.</li>
            <li><strong>Menor costo</strong> de ciclo de vida entre las que cumplen.</li>
            <li><strong>Empate técnico:</strong> si hay diferencias dentro de la banda, gana la de menos CO₂ y, si persiste, la de menos RAEE.</li>
          </ol>
        </div>
      </aside>
    </div>
  )
}
