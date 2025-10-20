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

function setLabelAndFix(marker: naver.maps.Marker | null, root: HTMLElement | null, labelEl: HTMLElement | null, text: string) {
  if (!marker || !root || !labelEl) return
  labelEl.textContent = text
  fixAnchor(marker, root)
}

// ────────────── 더미 라우팅 API ──────────────
type LatLng = { lat: number; lng: number }
function metersToDeg(lat: number, dLatM: number, dLngM: number): LatLng {
  const dLat = dLatM / 111_320
  const dLng = dLngM / (111_320 * Math.cos((lat * Math.PI) / 180))
  return { lat: lat + dLat, lng: dLngM === 0 ? 0 : dLng }
}
// ⬆️ 시각적으로 더 벌어지도록 기본 반경을 키움(기존 60 → 180)
function jitterNear(base: LatLng, radiusM = 360): LatLng {
  const dx = (Math.random() * 2 - 1) * radiusM
  const dy = (Math.random() * 2 - 1) * radiusM
  const d = metersToDeg(base.lat, dy, dx)
  return { lat: base.lat + d.lat - base.lat, lng: base.lng + d.lng }
}
function makeCurvedPath(a: LatLng, b: LatLng): LatLng[] {
  const mid: LatLng = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
  const ctrl = jitterNear(mid, 420) // 더 과감하게 벌어지도록
  const steps = 20
  const pts: LatLng[] = []
  for (let t = 0; t <= steps; t++) {
    const u = t / steps
    const lat =
      (1 - u) * (1 - u) * a.lat + 2 * (1 - u) * u * ctrl.lat + u * u * b.lat
    const lng =
      (1 - u) * (1 - u) * a.lng + 2 * (1 - u) * u * ctrl.lng + u * u * b.lng
    pts.push({ lat, lng })
  }
  return pts
}
async function planRouteDummy(payload: {
  start: LatLng
  end: LatLng
  options?: { optimize?: "time" | "distance" }
}): Promise<{
  pickup: LatLng
  dropoff: LatLng
  summary: { distance_m: number; duration_s: number; polyline: LatLng[] }
}> {
  const { start, end } = payload
  // ⬇️ 승차/하차를 더 떨어뜨림(220m)
  const pickup = jitterNear(start, 420)
  const dropoff = jitterNear(end, 420)
  const polyline = makeCurvedPath(pickup, dropoff)
  const distance_m = getDistanceFromLatLonInM(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
  const duration_s = Math.round(distance_m / 7)
  await new Promise(r => setTimeout(r, 300))
  return { pickup, dropoff, summary: { distance_m, duration_s, polyline } }
}

const EPS = 1e-7
function isSameLL(a?: { lat: number; lng: number } | null, b?: { lat: number; lng: number } | null) {
  if (!a || !b) return false
  return Math.abs(a.lat - b.lat) < EPS && Math.abs(a.lng - b.lng) < EPS
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
  const end = useDRTStore((s) => s.end)
  const setStart = useDRTStore((s) => s.setStart)
  const setEnd = useDRTStore((s) => s.setEnd)
  const setPhase = useDRTStore((s) => s.setPhase)
  const setServiceArea = useDRTStore((s) => s.setServiceArea)
  const resetKey = useDRTStore((s) => s.resetKey)

  // 최신 phase
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // prev phase
  const prevPhaseRef = useRef(phase)
  useEffect(() => { prevPhaseRef.current = phase }, [phase])

  // end 최신값 ref
  const endRef = useRef<typeof end>(end)
  useEffect(() => { endRef.current = end }, [end])

  // 초기 뷰
  const initialCenterRef = useRef<naver.maps.LatLng | null>(null)
  const initialZoomRef = useRef<number | null>(null)
  const preRoutingZoomRef = useRef<number | null>(null)
  const initialStartLLRef = useRef<naver.maps.LatLng | null>(null)

  // 경로/마커 레이어
  const legStartToPickupRef = useRef<naver.maps.Polyline | null>(null)
  const legMainRef = useRef<naver.maps.Polyline | null>(null)
  const legDropoffToEndRef = useRef<naver.maps.Polyline | null>(null)
  const pickupMarkerRef = useRef<naver.maps.Marker | null>(null)
  const dropoffMarkerRef = useRef<naver.maps.Marker | null>(null)

  // routing 초기 setEnd 1회 가드
  const routingInitCommittedRef = useRef(false)

  function clearRouteLayers() {
    legStartToPickupRef.current?.setMap(null)
    legMainRef.current?.setMap(null)
    legDropoffToEndRef.current?.setMap(null)
    pickupMarkerRef.current?.setMap(null)
    dropoffMarkerRef.current?.setMap(null)
    legStartToPickupRef.current = null
    legMainRef.current = null
    legDropoffToEndRef.current = null
    pickupMarkerRef.current = null
    dropoffMarkerRef.current = null
  }

  function commitStartAt(latlng: naver.maps.LatLng) {
    if (!startMarkerRef.current || !startRootRef.current || !startLabelElRef.current) return
    startMarkerRef.current.setPosition(latlng)
    setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "여기서 출발")
    const lat = latlng.lat(), lng = latlng.lng()
    setServiceArea(isInsideServiceArea(lat, lng))
    setStart({ lat, lng })
  }

  function setEndIfChangedLL(ll: naver.maps.LatLng) {
    const next = { lat: ll.lat(), lng: ll.lng() }
    const curr = endRef.current
    if (isSameLL(curr, next)) return
    setEnd(next)
  }

  function ensureStartMarker(map: naver.maps.Map) {
    if (!startMarkerRef.current) {
      // 마커가 없다면 새로 만들어 붙임
      const cap = createCapsuleMarker("여기서 출발", COLOR_BLUE)
      startRootRef.current = cap.root
      startLabelElRef.current = cap.labelEl
      const m = new window.naver.maps.Marker({
        position: map.getCenter(),
        map,
        icon: { content: cap.root, anchor: new window.naver.maps.Point(50, 34) },
        zIndex: 10,
      })
      startMarkerRef.current = m
      fixAnchor(m, cap.root)
    } else {
      // 마커가 있다면 맵에 다시 붙임(혹시 null로 떨어져 있었을 대비)
      startMarkerRef.current.setMap(map)
    }
  }

  // 지도 초기화
  useEffect(() => {
    if (!window.naver || !mapDivRef.current) return
    const defaultLocation = new window.naver.maps.LatLng(37.4563, 126.8951)
    const map = new window.naver.maps.Map(mapDivRef.current, { center: defaultLocation, zoom: 14 })
    mapRef.current = map

    initialCenterRef.current = defaultLocation
    initialZoomRef.current = 14

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
    commitCenterAsStart()
    initialStartLLRef.current = startMarker.getPosition()!

    // 인터랙션(초기/라우팅만 반응, selected에서는 무시)
    const onDrag = window.naver.maps.Event.addListener(map, "drag", () => {
      if (phaseRef.current === "selected") return
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
      if (phaseRef.current === "selected") return
      const center = map.getCenter()
      if (phaseRef.current === "routing") {
        endMarkerRef.current?.setPosition(center)
        setLabelAndFix(endMarkerRef.current, endRootRef.current, endLabelElRef.current, "도착")
        setEndIfChangedLL(center)
      } else {
        startMarker.setPosition(center)
        setLabelAndFix(startMarker, startRootRef.current, startLabelElRef.current, "여기서 출발")
        const lat = center.lat(), lng = center.lng()
        setServiceArea(isInsideServiceArea(lat, lng))
        setStart({ lat, lng })
      }
    })
    const onZoom = window.naver.maps.Event.addListener(map, "zoom_changed", () => {
      if (phaseRef.current === "selected") return
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
      if (phaseRef.current === "selected") return
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

  // selected 전환 시 start/end 없으면 복귀
  useEffect(() => {
    if (phase === "selected" && (!start || !end)) {
      setPhase("idle")
    }
  }, [phase, start, end, setPhase])

  // phase 변화
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (phase === "routing") {
      if (prevPhaseRef.current !== "routing") {
        routingInitCommittedRef.current = false
      }

      const st = start ?? (() => {
        const c = map.getCenter()
        const cur = { lat: c.lat(), lng: c.lng() }
        setStart(cur)
        return cur
      })()

      const startLL = new window.naver.maps.LatLng(st.lat, st.lng)
      preRoutingZoomRef.current = map.getZoom()
      map.setCenter(startLL)
      map.setZoom(15, true)

      const centerLL = map.getCenter()

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
        setLabelAndFix(endMarkerRef.current, endRootRef.current!, endLabelElRef.current!, "도착")
      }

      if (!routingInitCommittedRef.current) {
        routingInitCommittedRef.current = true
        setEndIfChangedLL(centerLL)
      }
    } else if (phase === "selected") {
      // 도착 마커 보장 + 시작 마커 라벨을 "출발"로 변경
      if (end && endMarkerRef.current) {
        const endLL = new window.naver.maps.LatLng(end.lat, end.lng)
        endMarkerRef.current.setMap(map)
        endMarkerRef.current.setPosition(endLL)
        setLabelAndFix(endMarkerRef.current, endRootRef.current!, endLabelElRef.current!, "도착")
      }
      if (startMarkerRef.current && startRootRef.current && startLabelElRef.current) {
        setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "출발")
      }
    } else { // idle
      if (endMarkerRef.current) endMarkerRef.current.setMap(null)
      if (endLabelElRef.current) endLabelElRef.current.textContent = "도착"
      // 초기 화면 텍스트 복구
      if (startMarkerRef.current && startRootRef.current && startLabelElRef.current) {
        setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "여기서 출발")
      }
      clearRouteLayers()
    }
  }, [phase, start])

  // routing 중 end 이동
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (phase !== "routing" || !end) return

    const center = map.getCenter()
    const same =
      Math.abs(center.lat() - end.lat) < EPS &&
      Math.abs(center.lng() - end.lng) < EPS
    if (same) return

    const endLL = new window.naver.maps.LatLng(end.lat, end.lng)
    map.setCenter(endLL)
    if (map.getZoom() < 15) map.setZoom(15, true)
  }, [end, phase])

  // selected에서 경로/마커 렌더
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (phase !== "selected") {
      clearRouteLayers()
      return
    }
    if (!start || !end) return

    clearRouteLayers()

      ; (async () => {
        const { pickup, dropoff, summary } = await planRouteDummy({
          start, end, options: { optimize: "time" }
        })

        legStartToPickupRef.current = new window.naver.maps.Polyline({
          map,
          path: [
            new window.naver.maps.LatLng(start.lat, start.lng),
            new window.naver.maps.LatLng(pickup.lat, pickup.lng),
          ],
          strokeColor: "#9ca3af",
          strokeOpacity: 1,
          strokeWeight: 4,
          strokeStyle: "shortdash",
        })

        legMainRef.current = new window.naver.maps.Polyline({
          map,
          path: summary.polyline.map(p => new window.naver.maps.LatLng(p.lat, p.lng)),
          strokeColor: "#2563eb",
          strokeOpacity: 1,
          strokeWeight: 5,
          strokeStyle: "solid",
        })

        legDropoffToEndRef.current = new window.naver.maps.Polyline({
          map,
          path: [
            new window.naver.maps.LatLng(dropoff.lat, dropoff.lng),
            new window.naver.maps.LatLng(end.lat, end.lng),
          ],
          strokeColor: "#9ca3af",
          strokeOpacity: 1,
          strokeWeight: 4,
          strokeStyle: "shortdash",
        })

        const pickupCapsule = createCapsuleMarker("승차", "#374151")
        const dropoffCapsule = createCapsuleMarker("하차", "#374151")

        pickupMarkerRef.current = new window.naver.maps.Marker({
          map,
          position: new window.naver.maps.LatLng(pickup.lat, pickup.lng),
          icon: { content: pickupCapsule.root, anchor: new window.naver.maps.Point(50, 34) },
          zIndex: 20,
        })
        dropoffMarkerRef.current = new window.naver.maps.Marker({
          map,
          position: new window.naver.maps.LatLng(dropoff.lat, dropoff.lng),
          icon: { content: dropoffCapsule.root, anchor: new window.naver.maps.Point(50, 34) },
          zIndex: 20,
        })
        fixAnchor(pickupMarkerRef.current, pickupCapsule.root)
        fixAnchor(dropoffMarkerRef.current, dropoffCapsule.root)

        // 도착 마커 보장
        if (endMarkerRef.current) {
          const endLL = new window.naver.maps.LatLng(end.lat, end.lng)
          endMarkerRef.current.setMap(map)
          endMarkerRef.current.setPosition(endLL)
          setLabelAndFix(endMarkerRef.current, endRootRef.current!, endLabelElRef.current!, "도착")
        }

        const bounds = new window.naver.maps.LatLngBounds()
          ;[
            { lat: start.lat, lng: start.lng },
            pickup,
            dropoff,
            { lat: end.lat, lng: end.lng },
          ].forEach(p => bounds.extend(new window.naver.maps.LatLng(p.lat, p.lng)))
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
      })()
  }, [phase, start, end])

  // ⬇️ 공용 리셋 함수 (X/다시선택 모두 사용)
  const handleResetToInitial = () => {
    const map = mapRef.current
    if (!map) return

    // 1) 레이어/도착 마커 정리
    clearRouteLayers()
    if (endMarkerRef.current) endMarkerRef.current.setMap(null)

    // 2) 상태 초기화
    setEnd(null)
    setPhase("idle")

    // 3) 기준 좌표/줌 계산
    const initStart =
      initialStartLLRef.current ??
      initialCenterRef.current ??
      map.getCenter()

    const backZoom =
      preRoutingZoomRef.current ??
      initialZoomRef.current ??
      map.getZoom()

    // 4) 시작 마커를 즉시 맵에 붙이고, 위치/라벨/스토어 갱신
    ensureStartMarker(map)
    startMarkerRef.current!.setPosition(initStart)
    setLabelAndFix(
      startMarkerRef.current!,
      startRootRef.current!,
      startLabelElRef.current!,
      "여기서 출발"
    )
    const sLat = initStart.lat()
    const sLng = initStart.lng()
    setServiceArea(isInsideServiceArea(sLat, sLng))
    setStart({ lat: sLat, lng: sLng })

    // 5) 뷰 원복 (idle 의존 X)
    map.setCenter(initStart)
    map.setZoom(backZoom, true)
  }

  // 🔔 resetKey가 바뀌면 X 버튼과 동일 동작 수행
  useEffect(() => {
    if (resetKey > 0) {
      handleResetToInitial()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      <div ref={mapDivRef} className="w-full h-full" />

      {phase === "routing" && (
        <button
          type="button"
          onClick={handleResetToInitial}
          className="
            absolute top-3 left-3 z-[1000]
            h-10 w-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]
            flex items-center justify-center active:scale-[0.98]
          "
          aria-label="뒤로가기"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {phase === "selected" && (
        <button
          type="button"
          onClick={handleResetToInitial}
          className="
            absolute top-3 left-3 z-[1000]
            h-10 w-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]
            flex items-center justify-center active:scale-[0.98]
          "
          aria-label="닫기"
          title="초기 화면으로"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default MapContainer
