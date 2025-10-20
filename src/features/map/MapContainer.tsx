import { useEffect, useRef } from "react"
import { useDRTStore } from "@/store/drtStore"

// ───────────────── utils ─────────────────
const SERVICE_AREAS = [
  { name: "금천구", center: { lat: 37.4563, lng: 126.8951 }, radius: 2500 },
]
function isInsideServiceArea(lat: number, lng: number): string | null {
  for (const a of SERVICE_AREAS) {
    const d = getDistanceFromLatLonInM(lat, lng, a.center.lat, a.center.lng)
    if (d <= a.radius) return a.name
  }
  return null
}
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
function deg2rad(deg: number) { return deg * (Math.PI / 180) }

// ────────────── capsule marker DOM ──────────────
const COLOR_BLUE = "var(--color-blue-900, #0A1F47)"
const COLOR_RED_500 = "#ef4444"

function applyNoWrap(el: HTMLElement) {
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

function createCapsuleMarker(text: string, color: string) {
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

/** 아이콘 DOM 크기에 맞춰 앵커를 정확히 보정 */
function fixAnchor(marker: naver.maps.Marker, root: HTMLElement) {
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

/** 라벨 텍스트를 바꾸고, 즉시 앵커 재보정 */
function setLabelAndFix(marker: naver.maps.Marker | null, root: HTMLElement | null, labelEl: HTMLElement | null, text: string) {
  if (!marker || !root || !labelEl) return
  labelEl.textContent = text
  fixAnchor(marker, root)
}

const MapContainer = () => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<naver.maps.Map | null>(null)

  const startMarkerRef = useRef<naver.maps.Marker | null>(null)
  const endMarkerRef = useRef<naver.maps.Marker | null>(null)

  const startRootRef = useRef<HTMLElement | null>(null)
  const startLabelElRef = useRef<HTMLElement | null>(null)
  const endRootRef = useRef<HTMLElement | null>(null)
  const endLabelElRef = useRef<HTMLElement | null>(null)

  const phase = useDRTStore((s) => s.phase)
  const start = useDRTStore((s) => s.start)
  const setStart = useDRTStore((s) => s.setStart)
  const setEnd = useDRTStore((s) => s.setEnd)
  const setPhase = useDRTStore((s) => s.setPhase)
  const setServiceArea = useDRTStore((s) => s.setServiceArea)

  // 이벤트 핸들러에서 최신 phase 참조용
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ✅ 초기 위치/뷰 & routing 진입 직전 뷰 저장용
  const initialCenterRef = useRef<naver.maps.LatLng | null>(null)
  const initialZoomRef = useRef<number | null>(null)
  const preRoutingZoomRef = useRef<number | null>(null)

  // ✅ 앱 최초 "여기서 출발" 좌표 보관
  const initialStartLLRef = useRef<naver.maps.LatLng | null>(null)

  // ✅ 출발 커밋 헬퍼: 마커/라벨/스토어 동시 반영
  function commitStartAt(latlng: naver.maps.LatLng) {
    if (!startMarkerRef.current || !startRootRef.current || !startLabelElRef.current) return
    startMarkerRef.current.setPosition(latlng)
    setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "여기서 출발")
    const lat = latlng.lat(), lng = latlng.lng()
    setServiceArea(isInsideServiceArea(lat, lng))
    setStart({ lat, lng })
  }

  // ── 지도 & 출발 마커 초기화 (1회) ──
  useEffect(() => {
    if (!window.naver || !mapDivRef.current) return
    const defaultLocation = new window.naver.maps.LatLng(37.4563, 126.8951)
    const map = new window.naver.maps.Map(mapDivRef.current, { center: defaultLocation, zoom: 14 })
    mapRef.current = map

    // 초기 뷰 기록
    initialCenterRef.current = defaultLocation
    initialZoomRef.current = 14

    // 출발 마커
    const startCapsule = createCapsuleMarker("여기서 출발", COLOR_BLUE)
    startRootRef.current = startCapsule.root
    startLabelElRef.current = startCapsule.labelEl
    const startMarker = new window.naver.maps.Marker({
      position: defaultLocation,
      map,
      icon: { content: startCapsule.root, anchor: new window.naver.maps.Point(50, 34) },
      zIndex: 10,
    })
    startMarkerRef.current = startMarker
    fixAnchor(startMarker, startCapsule.root)

    const commitCenterAsStart = () => {
      const c = map.getCenter()
      startMarker.setPosition(c)
      const lat = c.lat(), lng = c.lng()
      setServiceArea(isInsideServiceArea(lat, lng))
      setStart({ lat, lng })
    }
    // 최초 1회 커밋
    commitCenterAsStart()
    // ✅ 앱 최초 출발 좌표 저장
    initialStartLLRef.current = startMarker.getPosition()!

    // 상호작용 이벤트
    const onDrag = window.naver.maps.Event.addListener(map, "drag", () => {
      const center = map.getCenter()
      if (phaseRef.current === "routing") {
        endMarkerRef.current?.setPosition(center)
        setLabelAndFix(endMarkerRef.current, endRootRef.current, endLabelElRef.current, "· · ·")
      } else {
        startMarker.setPosition(center)
        setLabelAndFix(startMarker, startRootRef.current, startLabelElRef.current, "· · ·")
      }
    })
    const onDragEnd = window.naver.maps.Event.addListener(map, "dragend", () => {
      const center = map.getCenter()
      if (phaseRef.current === "routing") {
        endMarkerRef.current?.setPosition(center)
        setLabelAndFix(endMarkerRef.current, endRootRef.current, endLabelElRef.current, "도착")
        setEnd({ lat: center.lat(), lng: center.lng() })
      } else {
        startMarker.setPosition(center)
        setLabelAndFix(startMarker, startRootRef.current, startLabelElRef.current, "여기서 출발")
        const lat = center.lat(), lng = center.lng()
        setServiceArea(isInsideServiceArea(lat, lng))
        setStart({ lat, lng })
      }
    })
    const onZoom = window.naver.maps.Event.addListener(map, "zoom_changed", () => {
      const center = map.getCenter()
      if (phaseRef.current === "routing") {
        endMarkerRef.current?.setPosition(center)
        setLabelAndFix(endMarkerRef.current, endRootRef.current, endLabelElRef.current, "· · ·")
      } else {
        startMarker.setPosition(center)
        setLabelAndFix(startMarker, startRootRef.current, startLabelElRef.current, "· · ·")
      }
    })
    const onIdle = window.naver.maps.Event.addListener(map, "idle", () => {
      if (phaseRef.current === "routing") {
        setLabelAndFix(endMarkerRef.current, endRootRef.current, endLabelElRef.current, "도착")
      } else {
        setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "여기서 출발")
      }
    })

    return () => {
      window.naver.maps.Event.removeListener(onDrag)
      window.naver.maps.Event.removeListener(onDragEnd)
      window.naver.maps.Event.removeListener(onZoom)
      window.naver.maps.Event.removeListener(onIdle)
      startMarkerRef.current?.setMap(null)
      endMarkerRef.current?.setMap(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── phase 변화 처리 (routing 진입/종료) ──
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (phase === "routing") {
      // 진입 직전 줌 저장(원복용)
      preRoutingZoomRef.current = map.getZoom()

      const st = start ?? (() => {
        const c = map.getCenter()
        const cur = { lat: c.lat(), lng: c.lng() }
        setStart(cur)
        return cur
      })()

      // 출발 기준으로 살짝 줌인
      const startLL = new window.naver.maps.LatLng(st.lat, st.lng)
      map.setCenter(startLL)
      map.setZoom(15, true)

      const centerLL = map.getCenter()

      // 도착 마커 생성/표시
      if (!endMarkerRef.current) {
        const endCapsule = createCapsuleMarker("도착", COLOR_RED_500)
        endRootRef.current = endCapsule.root
        endLabelElRef.current = endCapsule.labelEl
        const endMarker = new window.naver.maps.Marker({
          position: centerLL,
          map,
          icon: { content: endCapsule.root, anchor: new window.naver.maps.Point(50, 34) },
          zIndex: 11,
        })
        endMarkerRef.current = endMarker
        fixAnchor(endMarker, endCapsule.root)
      } else {
        endMarkerRef.current.setMap(map)
        endMarkerRef.current.setPosition(centerLL)
        setLabelAndFix(endMarkerRef.current, endRootRef.current, endLabelElRef.current, "도착")
      }

      // 현재 중앙을 도착 후보로 커밋
      setEnd({ lat: centerLL.lat(), lng: centerLL.lng() })
    } else {
      // routing 종료 시: 도착 마커 숨김 + 라벨 리셋
      if (endMarkerRef.current) endMarkerRef.current.setMap(null)
      if (endLabelElRef.current) endLabelElRef.current.textContent = "도착"
    }
  }, [phase, start, setStart, setEnd])

  // ✅ 뒤로가기(원복) 핸들러 — 출발 마커까지 초기화
  const handleBackFromRouting = () => {
    const map = mapRef.current
    if (!map) return

    // 기준: 앱 최초 출발 좌표(없으면 초기 맵 중심)
    const initStart = initialStartLLRef.current
      ?? initialCenterRef.current
      ?? map.getCenter()

    // 1) 도착 후보 초기화/숨김
    setEnd(null)
    if (endMarkerRef.current) endMarkerRef.current.setMap(null)

    // 2) phase를 먼저 idle로 돌려 이벤트 분기 안전화
    setPhase("idle")

    // 3) 줌/센터 원복
    const backZoom = preRoutingZoomRef.current ?? initialZoomRef.current ?? map.getZoom()
    map.setZoom(backZoom, true)
    map.setCenter(initStart)

    // 4) 이동/줌 애니메이션 종료(idle) 후 출발 커밋(덮어쓰기 방지)
    const onceIdle = window.naver.maps.Event.addListener(map, "idle", () => {
      window.naver.maps.Event.removeListener(onceIdle)
      commitStartAt(initStart)
    })
  }

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      {/* 맵 */}
      <div ref={mapDivRef} className="w-full h-full" />

      {/* ⬅️ 동그라미 뒤로가기: routing일 때만 표시 */}
      {phase === "routing" && (
        <button
          type="button"
          onClick={handleBackFromRouting}
          className="
            absolute top-3 left-3 z-[1000]
            h-10 w-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]
            flex items-center justify-center active:scale-[0.98]
          "
          aria-label="뒤로가기"
        >
          {/* ← 아이콘 */}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default MapContainer
