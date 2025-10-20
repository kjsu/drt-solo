import { create } from "zustand"

export type Phase = "idle" | "routing" | "selected"
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

  // ⬇️ 초기화 트리거 (X 버튼 / 다시 선택하기)
  resetKey: number
  bumpResetKey: () => void
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

  resetKey: 0,
  bumpResetKey: () => set((s) => ({ resetKey: s.resetKey + 1 })),
}))
