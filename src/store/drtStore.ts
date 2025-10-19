import { create } from 'zustand'

type Location = {
  lat: number
  lng: number
}

type DRTPhase = 'idle' | 'selected' | 'routing' | 'moving' | 'arrived'

type DRTState = {
  start: Location | null
  end: Location | null
  phase: DRTPhase
  serviceArea: string | null
  setStart: (loc: Location) => void
  setEnd: (loc: Location) => void
  setPhase: (phase: DRTPhase) => void
  setServiceArea: (area: string | null) => void
  reset: () => void
}

export const useDRTStore = create<DRTState>((set) => ({
  start: null,
  end: null,
  phase: 'idle',
  serviceArea: null,

  setStart: (loc) => set({ start: loc, phase: 'selected' }),
  setEnd: (loc) => set({ end: loc }),
  setPhase: (phase) => set({ phase }),
  setServiceArea: (area) => set({ serviceArea: area }),
  reset: () =>
    set({
      start: null,
      end: null,
      phase: 'idle',
      serviceArea: null,
    }),
}))
