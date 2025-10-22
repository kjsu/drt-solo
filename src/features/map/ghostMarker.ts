// src/features/map/ghostMarker.ts
// (드래그 중 지도 중앙 위에 항상 보이는 고스트 마커 전용 유틸리티)

export type GhostKind = "start" | "end"

type Opts = {
  // 라벨 옵션은 유지하되, 고스트에서는 표시하지 않습니다(호환성 목적).
  startLabel?: string
  endLabel?: string
  startBg?: string
  endBg?: string
}

export function createGhostController(
  getMapDiv: () => HTMLDivElement | null,
  getDragging: () => boolean,
  opts: Opts = {}
) {
  const {
    startBg = "#2563eb",
    endBg = "#ef4444",
  } = opts

  let styleInjected = false
  let ghostStartEl: HTMLDivElement | null = null
  let ghostEndEl: HTMLDivElement | null = null
  let rafId: number | null = null

  function ensureDotsStyle() {
    if (styleInjected) return
    if (document.getElementById("drt-dots-style")) {
      styleInjected = true
      return
    }
    const style = document.createElement("style")
    style.id = "drt-dots-style"
    style.textContent = `
      .drt-dots { display: inline-flex; gap: 6px; align-items: center; }
      .drt-dots span { opacity: .25; animation: drtDot 900ms infinite ease-in-out; }
      .drt-dots span:nth-child(2) { animation-delay: .12s; }
      .drt-dots span:nth-child(3) { animation-delay: .24s; }
      @keyframes drtDot {
        0%   { opacity: .25; transform: translateY(0); }
        35%  { opacity: 1;   transform: translateY(-1px); }
        100% { opacity: .25; transform: translateY(0); }
      }
    `
    document.head.appendChild(style)
    styleInjected = true
  }

  function createHardVisibleGhost(bg: string) {
    ensureDotsStyle()

    const root = document.createElement("div")
      ; (root.style as any).all = "initial"
    root.style.position = "fixed"
    root.style.left = "50%"
    root.style.top = "50%"
    root.style.transform = "translate(-50%, -100%) translateZ(0)"
    root.style.zIndex = "2147483647"
    root.style.pointerEvents = "none"
    root.style.display = "none"
    root.style.filter = "drop-shadow(0 12px 22px rgba(0,0,0,0.22))"

    const capsule = document.createElement("div")
      ; (capsule.style as any).all = "initial"
    // ✅ 텍스트 제거: 점 애니메이션만 표시
    capsule.innerHTML = `<span class="drt-dots"><span>·</span><span>·</span><span>·</span></span>`
    capsule.style.display = "inline-flex"
    capsule.style.alignItems = "center"
    capsule.style.justifyContent = "center"
    capsule.style.padding = "8px 14px"
    capsule.style.fontSize = "12px"
    capsule.style.fontWeight = "700"
    capsule.style.lineHeight = "1"
    capsule.style.color = "#fff"
    capsule.style.background = bg
    capsule.style.borderRadius = "9999px"
    capsule.style.boxShadow = "0 6px 14px rgba(0,0,0,0.16)"
    capsule.style.fontFamily =
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic","Helvetica Neue",Arial,sans-serif'

    const tail = document.createElement("div")
      ; (tail.style as any).all = "initial"
    tail.style.width = "2px"
    tail.style.height = "16px"
    tail.style.marginTop = "-1px"
    tail.style.borderRadius = "1px"
    tail.style.background = bg
    tail.style.display = "block"

    const dot = document.createElement("div")
      ; (dot.style as any).all = "initial"
    dot.style.width = "14px"
    dot.style.height = "14px"
    dot.style.borderRadius = "9999px"
    dot.style.background = "rgba(0,0,0,0.35)"
    dot.style.margin = "6px auto 0"
    dot.style.filter = "blur(1px)"

    const col = document.createElement("div")
      ; (col.style as any).all = "initial"
    col.style.display = "inline-flex"
    col.style.flexDirection = "column"
    col.style.alignItems = "center"
    col.appendChild(capsule)
    col.appendChild(tail)
    col.appendChild(dot)

    root.appendChild(col)
    document.documentElement.appendChild(root)
    return root
  }

  function ensureGhosts() {
    if (!ghostStartEl) ghostStartEl = createHardVisibleGhost(startBg)
    if (!ghostEndEl) ghostEndEl = createHardVisibleGhost(endBg)
  }

  function placeGhostOverMapCenter(el: HTMLElement | null) {
    if (!el) return
    const mapDiv = getMapDiv()
    if (!mapDiv) return
    const r = mapDiv.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    el.style.left = `${Math.round(cx)}px`
    el.style.top = `${Math.round(cy)}px`
  }

  function startLoop(el: HTMLElement) {
    if (rafId != null) return
    const tick = () => {
      rafId = null
      if (!getDragging()) return
      placeGhostOverMapCenter(el)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  function cancelLoop() {
    if (rafId != null) cancelAnimationFrame(rafId)
    rafId = null
  }

  function show(kind: GhostKind) {
    ensureGhosts()
    const el = kind === "start" ? ghostStartEl : ghostEndEl
    if (!el) return
    el.style.display = "block"
    placeGhostOverMapCenter(el)
    startLoop(el)
  }

  function hide(kind: GhostKind) {
    const el = kind === "start" ? ghostStartEl : ghostEndEl
    if (el) el.style.display = "none"
    cancelLoop()
  }

  function cleanup() {
    cancelLoop()
    ghostStartEl?.remove()
    ghostEndEl?.remove()
    ghostStartEl = null
    ghostEndEl = null
  }

  return {
    show,
    hide,
    cleanup,
  }
}
