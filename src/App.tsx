import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Leaf } from 'lucide-react'
import { PASOS, useApp, type Vista } from './store'
import Perfil from './views/Perfil'
import Alternativas from './views/Alternativas'
import Resultados from './views/Resultados'
import Metodologia from './views/Metodologia'

const NOMBRES: Record<string, string> = { perfil: 'Perfil', alternativas: 'Alternativas', resultados: 'Resultados' }

export default function App() {
  const { state, dispatch } = useApp()
  const reduce = useReducedMotion()
  const { vista, dir } = state
  const ir = (v: Vista) => dispatch({ type: 'ir', vista: v })

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [vista])

  const idx = PASOS.indexOf(vista)
  return (
    <>
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <header className="app-header">
        <div className="wrap header-row">
          <button className="brand" onClick={() => ir('perfil')} aria-label="Compra Consciente, ir al inicio">
            <span className="logo" aria-hidden><Leaf size={22} /></span>
            <span>
              <span className="brand-name">Compra Consciente</span>
              <span className="brand-sub">Apoyo a la estructuración de compras públicas de TI</span>
            </span>
          </button>
          <nav aria-label="Pasos" className="steps">
            <ol>
              {PASOS.map((p, i) => {
                const actual = i === idx
                return (
                  <li key={p}>
                    <button
                      className={'step' + (actual ? ' active' : '')}
                      aria-current={actual ? 'step' : undefined}
                      onClick={() => ir(p)}
                    >
                      {NOMBRES[p]}
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
          <div className="header-links">
            <button className="link-btn" onClick={() => dispatch({ type: 'limpiar' })}>Limpiar todo</button>
            <button className="link-btn" onClick={() => ir('metodologia')} aria-current={vista === 'metodologia' ? 'page' : undefined}>
              Metodología y fuentes
            </button>
          </div>
        </div>
      </header>

      <main id="contenido" className="wrap main">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={vista}
            custom={dir}
            variants={{
              in: (d: number) => ({ opacity: 0, x: reduce ? 0 : 24 * d }),
              show: { opacity: 1, x: 0 },
              out: (d: number) => ({ opacity: 0, x: reduce ? 0 : -24 * d }),
            }}
            initial="in"
            animate="show"
            exit="out"
            transition={{ duration: 0.25 }}
          >
            {vista === 'perfil' && <Perfil />}
            {vista === 'alternativas' && <Alternativas />}
            {vista === 'resultados' && <Resultados />}
            {vista === 'metodologia' && <Metodologia />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="app-footer">
        <div className="wrap">
          <p>
            Proyecto del curso de Ecología · Ingeniería de Software · Universidad Surcolombiana, Neiva (Huila). Prototipo académico:
            no evalúa ofertas reales; sirve para probar criterios antes de publicar el pliego.{' '}
            <button className="link-btn inline" onClick={() => ir('metodologia')}>Metodología y fuentes</button>
          </p>
        </div>
      </footer>
    </>
  )
}
