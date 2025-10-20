export const COLOR_BLUE = "var(--color-blue-900, #0A1F47)"
export const COLOR_RED_500 = "#ef4444"

export function applyNoWrap(el: HTMLElement) {
  el.style.setProperty("writing-mode", "horizontal-tb", "important")
  el.style.setProperty("text-orientation", "mixed", "important")
  el.style.setProperty("white-space", "nowrap", "important")
  el.style.setProperty("word-break", "keep-all", "important")
  el.style.setProperty("overflow-wrap", "normal", "important")
    ; (el.style as any).textWrap && el.style.setProperty("text-wrap", "nowrap", "important")
  el.style.setProperty("hyphens", "none", "important")
  el.style.setProperty("line-break", "auto", "important")
  el.style.setProperty("letter-spacing", "0.2px", "important")
}

export function createCapsuleMarker(text: string, color: string) {
  const root = document.createElement("div")
  root.style.pointerEvents = "none"
  root.style.display = "inline-flex"
  root.style.flexDirection = "column"
  root.style.alignItems = "center"

  const capsule = document.createElement("div")
  capsule.textContent = text
  capsule.style.display = "inline-flex"
  capsule.style.alignItems = "center"
  capsule.style.justifyContent = "center"
  capsule.style.padding = "8px 14px"
  capsule.style.fontSize = "12px"
  capsule.style.lineHeight = "1"
  capsule.style.fontWeight = "700"
  capsule.style.color = "#ffffff"
  capsule.style.background = color
  capsule.style.borderRadius = "9999px"
  capsule.style.boxShadow = "0 6px 14px rgba(0,0,0,0.16)"
  capsule.style.fontFamily =
    `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Helvetica Neue", Arial, sans-serif`
  applyNoWrap(capsule)

  const tail = document.createElement("div")
  tail.style.width = "2px"
  tail.style.height = "16px"
  tail.style.background = color
  tail.style.marginTop = "-1px"
  tail.style.borderRadius = "1px"

  root.appendChild(capsule)
  root.appendChild(tail)

  return { root, labelEl: capsule }
}

export function fixAnchor(marker: naver.maps.Marker, root: HTMLElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const w = root.offsetWidth || 100
      const h = root.offsetHeight || 40
      marker.setIcon({
        content: root,
        anchor: new window.naver.maps.Point(w / 2, h),
      })
    })
  })
}

export function setLabelAndFix(
  marker: naver.maps.Marker | null,
  root: HTMLElement | null,
  labelEl: HTMLElement | null,
  text: string
) {
  if (!marker || !root || !labelEl) return
  labelEl.textContent = text
  fixAnchor(marker, root)
}
