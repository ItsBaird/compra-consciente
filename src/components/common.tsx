import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { Info } from 'lucide-react'

/** Parseo tolerante: acepta coma o punto decimal. Vacío → null. */
function parse(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isNaN(n) ? NaN : n
}

const show = (v: number | null, miles = false) => {
  if (v == null || Number.isNaN(v)) return ''
  return miles ? agrupar(String(v)) : String(v).replace('.', ',')
}

/** Separa los miles con punto (formato es-CO): 3000000 → 3.000.000. */
const agrupar = (digitos: string) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

interface NumFieldProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  error?: string
  unit?: string
  hint?: string
  labelExtra?: ReactNode
  inputMode?: 'numeric' | 'decimal'
  /** Solo con inputMode numeric: muestra los miles separados con punto mientras se escribe. */
  miles?: boolean
  /** Texto gris de ejemplo cuando el campo está vacío. */
  placeholder?: string
}

export function NumField({ label, value, onChange, error, unit, hint, labelExtra, inputMode = 'decimal', miles = false, placeholder }: NumFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState(show(value, miles))
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (caret.current != null && ref.current) {
      ref.current.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [draft])
  const last = useRef(value)
  useEffect(() => {
    if (value !== last.current) {
      last.current = value
      setDraft(show(value, miles))
    }
  }, [value, miles])
  const descr = [error ? `${id}-e` : '', hint ? `${id}-h` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <div className="field-label">
        <label htmlFor={id}>{label}</label>
        {labelExtra}
      </div>
      <div className={'input-wrap' + (error ? ' invalid' : '')}>
        <input
          id={id}
          ref={ref}
          type="text"
          inputMode={inputMode}
          value={draft}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={descr}
          maxLength={14}
          onChange={(e) => {
            // Solo números: enteros (inputMode numeric) o decimales con un único separador.
            let txt = e.target.value
            if (inputMode === 'numeric' && miles) {
              const pos = e.target.selectionStart ?? txt.length
              const antes = txt.slice(0, pos).replace(/\D/g, '').length
              const dig = txt.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
              txt = agrupar(dig)
              // Conserva la posición del cursor contando dígitos, no puntos.
              let n = 0
              let c = 0
              while (c < txt.length && n < antes) {
                if (/\d/.test(txt[c])) n++
                c++
              }
              caret.current = c
              setDraft(txt)
              const num = dig === '' ? null : Number(dig)
              last.current = num
              onChange(num)
              return
            }
            if (inputMode === 'numeric') txt = txt.replace(/\D/g, '')
            else {
              txt = txt.replace(/[^\d.,]/g, '')
              const i = txt.search(/[.,]/)
              if (i >= 0) txt = txt.slice(0, i + 1) + txt.slice(i + 1).replace(/[.,]/g, '')
            }
            setDraft(txt)
            const p = parse(txt)
            const n = p != null && Number.isNaN(p) ? null : p
            last.current = n
            onChange(n)
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {hint && !error && <p id={`${id}-h`} className="hint">{hint}</p>}
      {error && <p id={`${id}-e`} className="err" role="alert">{error}</p>}
    </div>
  )
}

export function Pill({ tone, children }: { tone: 'ver' | 'dec' | 'def' | 'design' | 'co2' | 'raee' | 'ok' | 'warn' | 'bad' | 'neutral'; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

/** Ícono Info que abre un popover con la fuente del parámetro. */
export function InfoPop({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <span className="infopop" ref={ref}>
      <button type="button" className="icon-btn" aria-label={`Ver fuente: ${title}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <Info size={16} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            role="dialog"
            aria-label={title}
            className="popover"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <strong>{title}</strong>
            <div>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

/** Cifra que cuenta hacia su nuevo valor. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce) {
      el.textContent = format(value)
      prev.current = value
      return
    }
    const c = animate(prev.current, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        el.textContent = format(v)
      },
    })
    prev.current = value
    return () => c.stop()
  }, [value, reduce, format])
  return <span ref={ref}>{format(value)}</span>
}
