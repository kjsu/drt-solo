import { create } from "zustand"

export type Phase = "idle" | "routing" | "selected" // ← 사용 중인 단계 전부 포함

type LatLng = { lat: number; lng: number } | null

interface DRTState {
  phase: Phase
  setPhase: (p: Phase) => void

  start: LatLng
  setStart: (v: LatLng) => void

  end: LatLng
  setEnd: (v: LatLng) => void

  serviceArea: string | null
  setServiceArea: (name: string | null) => void
}

export const useDRTStore = create<DRTState>((set) => ({
  phase: "idle",
  setPhase: (p) => set({ phase: p }),

  start: null,
  setStart: (v) => set({ start: v }),

  end: null,
  setEnd: (v) => set({ end: v }),

  serviceArea: null,
  setServiceArea: (name) => set({ serviceArea: name }),
}))
