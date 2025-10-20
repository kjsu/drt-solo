// src/features/map/MapContainer.tsx
import { useEffect, useRef } from "react"
import { useDRTStore } from "@/store/drtStore"
import { drawServiceAreas, clearServiceAreas, ServiceAreaOverlay } from "@/features/map/serviceAreaOverlay"

// utils
import { isInsideServiceArea, EPS, isSameLL } from "@/utils/geo"
import {
  COLOR_BLUE,
  COLOR_RED_500,
  createCapsuleMarker,
  fixAnchor,
  setLabelAndFix,
} from "@/utils/capsuleMarker"
import { planRouteDummy } from "@/features/routing/planRouteDummy"

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

  const serviceAreaOverlaysRef = useRef<ServiceAreaOverlay[]>([])

  // ───────── “무조건 보이는” 고스트 마커 (전역 fixed + all:initial) ─────────
  function ensureDotsStyle() {
    if (document.getElementById("drt-dots-style")) return
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
  }

  const ghostStartRef = useRef<HTMLDivElement | null>(null)
  const ghostEndRef = useRef<HTMLDivElement | null>(null)
  const ghostLoopRef = useRef<number | null>(null)
  const draggingRef = useRef(false)

  function createHardVisibleGhost(text: string, bg: string) {
    ensureDotsStyle();

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
    if (!ghostStartRef.current) ghostStartRef.current = createHardVisibleGhost("여기서 출발", COLOR_BLUE)
    if (!ghostEndRef.current) ghostEndRef.current = createHardVisibleGhost("도착", COLOR_RED_500)
  }
  function placeGhostOverMapCenter(el: HTMLElement | null) {
    if (!el || !mapDivRef.current) return
    const r = mapDivRef.current.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    el.style.left = `${Math.round(cx)}px`
    el.style.top = `${Math.round(cy)}px`
  }
  function showGhost(kind: "start" | "end") {
    ensureGhosts()
    const el = kind === "start" ? ghostStartRef.current : ghostEndRef.current
    if (!el) return
    el.style.display = "block"
    placeGhostOverMapCenter(el)
    if (ghostLoopRef.current == null) {
      const tick = () => {
        ghostLoopRef.current = null
        if (!draggingRef.current) return
        placeGhostOverMapCenter(el)
        ghostLoopRef.current = requestAnimationFrame(tick)
      }
      ghostLoopRef.current = requestAnimationFrame(tick)
    }
  }
  function hideGhost(kind: "start" | "end") {
    const el = kind === "start" ? ghostStartRef.current : ghostEndRef.current
    if (el) el.style.display = "none"
    if (ghostLoopRef.current != null) {
      cancelAnimationFrame(ghostLoopRef.current)
      ghostLoopRef.current = null
    }
  }

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

  function setEndIfChangedLL(ll: naver.maps.LatLng) {
    const next = { lat: ll.lat(), lng: ll.lng() }
    const curr = endRef.current
    if (isSameLL(curr, next)) return
    setEnd(next)
  }

  function ensureStartMarker(map: naver.maps.Map) {
    if (!startMarkerRef.current) {
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
      startMarkerRef.current.setMap(map)
    }
  }

  // 지도 초기화
  useEffect(() => {
    if (!window.naver || !mapDivRef.current) return

    const defaultLocation = new window.naver.maps.LatLng(37.4563, 126.8951)
    const map = new window.naver.maps.Map(mapDivRef.current, {
      center: defaultLocation,
      zoom: 14,
      tileSpare: 4,
    })
    mapRef.current = map
    initialCenterRef.current = defaultLocation
    initialZoomRef.current = 14

    // 서비스 영역 오버레이
    serviceAreaOverlaysRef.current = drawServiceAreas(map, {
      strokeColor: "#2563eb",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.10,
      zIndex: 1,
    })

    // 시작 마커
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

    // 초기 스토어 커밋
    const commitCenterAsStart = () => {
      const c = map.getCenter()
      startMarker.setPosition(c)
      const lat = c.lat(), lng = c.lng()
      setServiceArea(isInsideServiceArea(lat, lng))
      setStart({ lat, lng })
    }
    commitCenterAsStart()
    initialStartLLRef.current = startMarker.getPosition()!

    // ───────── 드래그: 실제 마커 숨기고 고스트만 표시 ─────────
    const onDragStart = window.naver.maps.Event.addListener(map, "dragstart", () => {
      if (phaseRef.current === "selected") return
      draggingRef.current = true
      if (phaseRef.current === "routing") {
        endMarkerRef.current?.setMap(null)     // 실제 마커 숨김
        showGhost("end")                       // 고스트 표시(전역 fixed)
      } else {
        startMarker.setMap(null)
        showGhost("start")
      }
    })
    const onDrag = window.naver.maps.Event.addListener(map, "drag", () => {
      // 고스트는 rAF 루프가 mapDiv 중앙을 계속 추적 → 여기선 아무것도 안 함
    })
    const onDragEnd = window.naver.maps.Event.addListener(map, "dragend", () => {
      if (phaseRef.current === "selected") return
      draggingRef.current = false
      const center = map.getCenter()
      if (phaseRef.current === "routing") {
        hideGhost("end")
        if (!endMarkerRef.current) {
          const endCap = createCapsuleMarker("도착", COLOR_RED_500)
          endRootRef.current = endCap.root
          endLabelElRef.current = endCap.labelEl
          const em = new window.naver.maps.Marker({
            position: center,
            map,
            icon: { content: endCap.root, anchor: new window.naver.maps.Point(50, 34) },
            zIndex: 11,
          })
          endMarkerRef.current = em
          fixAnchor(em, endCap.root)
        } else {
          endMarkerRef.current.setMap(map)
          endMarkerRef.current.setPosition(center)
          setLabelAndFix(endMarkerRef.current, endRootRef.current!, endLabelElRef.current!, "도착")
        }
        setEndIfChangedLL(center)
      } else {
        hideGhost("start")
        startMarker.setMap(map)
        startMarker.setPosition(center)
        setLabelAndFix(startMarker, startRootRef.current!, startLabelElRef.current!, "여기서 출발")
        const lat = center.lat(), lng = center.lng()
        setServiceArea(isInsideServiceArea(lat, lng))
        setStart({ lat, lng })
      }
    })

    // 줌 변경: 드래그 아닐 때만 보정
    const onZoom = window.naver.maps.Event.addListener(map, "zoom_changed", () => {
      if (phaseRef.current === "selected") return
      if (draggingRef.current) return
      const center = map.getCenter()
      if (phaseRef.current === "routing") {
        endMarkerRef.current?.setPosition(center)
      } else {
        startMarker.setPosition(center)
      }
    })

    // idle: 드래그 아닐 때만 라벨 복구
    const onIdle = window.naver.maps.Event.addListener(map, "idle", () => {
      if (phaseRef.current === "selected") return
      if (draggingRef.current) return
      if (phaseRef.current === "routing") {
        setLabelAndFix(endMarkerRef.current, endRootRef.current, endLabelElRef.current, "도착")
      } else {
        setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "여기서 출발")
      }
    })

    return () => {
      window.naver.maps.Event.removeListener(onDragStart)
      window.naver.maps.Event.removeListener(onDrag)
      window.naver.maps.Event.removeListener(onDragEnd)
      window.naver.maps.Event.removeListener(onZoom)
      window.naver.maps.Event.removeListener(onIdle)
      startMarkerRef.current?.setMap(null)
      endMarkerRef.current?.setMap(null)
      clearServiceAreas(serviceAreaOverlaysRef.current)
      // 고스트 정리
      ghostStartRef.current?.remove()
      ghostEndRef.current?.remove()
      if (ghostLoopRef.current != null) cancelAnimationFrame(ghostLoopRef.current)
      ghostLoopRef.current = null
      draggingRef.current = false
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

      setEndIfChangedLL(centerLL)
    } else if (phase === "selected") {
      if (end && endMarkerRef.current) {
        const endLL = new window.naver.maps.LatLng(end.lat, end.lng)
        endMarkerRef.current.setMap(map)
        endMarkerRef.current.setPosition(endLL)
        setLabelAndFix(endMarkerRef.current, endRootRef.current!, endLabelElRef.current!, "도착")
      }
      if (startMarkerRef.current && startRootRef.current && startLabelElRef.current) {
        setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "출발")
      }
    } else {
      // idle
      if (endMarkerRef.current) endMarkerRef.current.setMap(null)
      if (endLabelElRef.current) endLabelElRef.current.textContent = "도착"
      if (startMarkerRef.current && startRootRef.current && startLabelElRef.current) {
        setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "여기서 출발")
      }
      clearRouteLayers()
    }

    prevPhaseRef.current = phase
  }, [phase, start])

  // routing 중 end 이동
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (phase !== "routing" || !end) return
    const center = map.getCenter()
    const same = Math.abs(center.lat() - end.lat) < EPS && Math.abs(center.lng() - end.lng) < EPS
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
    if (!start || !end) return clearRouteLayers()

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

  // ⬇️ 공용 리셋
  const handleResetToInitial = () => {
    const map = mapRef.current
    if (!map) return
    clearRouteLayers()
    if (endMarkerRef.current) endMarkerRef.current.setMap(null)
    setEnd(null)
    setPhase("idle")

    const initStart = initialStartLLRef.current ?? initialCenterRef.current ?? map.getCenter()
    const backZoom = preRoutingZoomRef.current ?? initialZoomRef.current ?? map.getZoom()

    ensureStartMarker(map)
    startMarkerRef.current!.setPosition(initStart)
    setLabelAndFix(startMarkerRef.current!, startRootRef.current!, startLabelElRef.current!, "여기서 출발")

    const sLat = initStart.lat()
    const sLng = initStart.lng()
    setServiceArea(isInsideServiceArea(sLat, sLng))
    setStart({ lat: sLat, lng: sLng })

    map.setCenter(initStart)
    map.setZoom(backZoom, true)
  }

  useEffect(() => {
    if (resetKey > 0) handleResetToInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      <div ref={mapDivRef} className="w-full h-full" />

      {phase === "routing" && (
        <button
          type="button"
          onClick={handleResetToInitial}
          className=" absolute top-3 left-3 z-[1100] h-10 w-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)] flex items-center justify-center active:scale-[0.98]"
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
          className=" absolute top-3 left-3 z-[1100] h-10 w-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)] flex items-center justify-center active:scale-[0.98]"
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
