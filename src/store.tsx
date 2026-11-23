import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { PERFIL_DEFECTO, evaluar } from './domain/calc'
import type { Alternativa, Perfil } from './domain/types'

export type Vista = 'perfil' | 'alternativas' | 'resultados' | 'metodologia'
export const PASOS: Vista[] = ['perfil', 'alternativas', 'resultados']
export const MAX_ALT = 5
export const MIN_ALT = 2

interface State {
  vista: Vista
  dir: 1 | -1
  perfil: Perfil
  alts: Alternativa[]
  panel: boolean
  previa: Vista // desde dónde se abrió Metodología
}

type Action =
  | { type: 'ir'; vista: Vista }
  | { type: 'perfil'; patch: Partial<Perfil> }
  | { type: 'alt'; id: string; patch: Partial<Alternativa> }
  | { type: 'agregar' }
  | { type: 'quitar'; id: string }
  | { type: 'panel'; abierto: boolean }
  | { type: 'limpiar' }

const orden = (v: Vista) => PASOS.indexOf(v)

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'ir': {
      const previa = a.vista === 'metodologia' ? (s.vista === 'metodologia' ? s.previa : s.vista) : s.previa
      const dir = a.vista === 'metodologia' ? 1 : s.vista === 'metodologia' ? -1 : orden(a.vista) >= orden(s.vista) ? 1 : -1
      return { ...s, vista: a.vista, dir, previa, panel: false }
    }
    case 'perfil':
      return { ...s, perfil: { ...s.perfil, ...a.patch } }
    case 'alt':
      return { ...s, alts: s.alts.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) }
    case 'agregar': {
      if (s.alts.length >= MAX_ALT) return s
      const usadas = new Set(s.alts.map((x) => x.letra))
      const letra = 'ABCDEFGH'.split('').find((l) => !usadas.has(l))!
      const nueva: Alternativa = {
        id: letra, letra, proveedor: '', precio: null, vida: null, wOn: null, wSusp: null, wOff: null,
        peso: null, rohs: false, retoma: false,
      }
      return { ...s, alts: [...s.alts, nueva] }
    }
    case 'quitar':
      if (s.alts.length <= MIN_ALT) return s
      return { ...s, alts: s.alts.filter((x) => x.id !== a.id) }
    case 'panel':
      return { ...s, panel: a.abierto }
    case 'limpiar':
      return { ...inicial, vista: 'perfil', dir: -1 }
  }
}

/** Perfil limpio: solo el factor de emisión (fuente oficial UPME) viene cargado; tarifa y banda las define la entidad. */
export const PERFIL_LIMPIO: Perfil = {
  N: NaN,
  H: NaN,
  hOn: NaN,
  hSusp: NaN,
  dias: NaN,
  tarifa: NaN,
  factor: PERFIL_DEFECTO.factor,
  banda: NaN,
}

const vacia = (letra: string): Alternativa => ({
  id: letra, letra, proveedor: '', precio: null, vida: null, wOn: null, wSusp: null, wOff: null,
  peso: null, rohs: false, retoma: false,
})

const inicial: State = {
  vista: 'perfil',
  dir: 1,
  perfil: PERFIL_LIMPIO,
  alts: [vacia('A'), vacia('B')],
  panel: false,
  previa: 'perfil',
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null)

export function Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, inicial)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const c = useContext(Ctx)
  if (!c) throw new Error('Falta Provider')
  return c
}

export function useEvaluacion() {
  const { state } = useApp()
  return useMemo(() => evaluar(state.alts, state.perfil), [state.alts, state.perfil])
}
