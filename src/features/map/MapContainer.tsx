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
// ★ 변경: 고스트 마커 컨트롤러 임포트
import { createGhostController } from "@/features/map/ghostMarker"
// ★ 변경: 초기 지도 세팅 유틸 임포트
import { initMap } from "@/features/map/initMap"

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

  // ───────── “무조건 보이는” 고스트 마커 (ref → 컨트롤러로 대체) ─────────
  // ★ 변경: draggingRef는 기존 로직 보존 (MapContainer의 다른 분기에서 사용함)
  const draggingRef = useRef(false)
  // ★ 변경: 고스트 컨트롤러 ref
  const ghostRef = useRef<ReturnType<typeof createGhostController> | null>(null)

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

    // ★ 변경: initMap으로 초기 지도/오버레이/시작마커 생성
    const { map, startMarker, startCapsule, overlays } = initMap({
      mapDiv: mapDivRef.current,
      defaultCenter: defaultLocation,
      startLabel: "여기서 출발",
      startBg: COLOR_BLUE,
      drawAreaOpts: {
        strokeColor: "#2563eb",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.10,
        zIndex: 1,
      },
    })
    mapRef.current = map
    initialCenterRef.current = defaultLocation
    initialZoomRef.current = 14
    serviceAreaOverlaysRef.current = overlays
    // 시작 마커/캡슐 ref 설정 및 앵커 픽스
    startRootRef.current = startCapsule.root
    startLabelElRef.current = startCapsule.labelEl
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

    // ★ 변경: 고스트 컨트롤러 생성
    ghostRef.current = createGhostController(
      () => mapDivRef.current,
      () => draggingRef.current,
      { startLabel: "여기서 출발", endLabel: "도착", startBg: COLOR_BLUE, endBg: COLOR_RED_500 }
    )

    // ───────── 드래그: 실제 마커 숨기고 고스트만 표시 ─────────
    const onDragStart = window.naver.maps.Event.addListener(map, "dragstart", () => {
      if (phaseRef.current === "selected") return
      draggingRef.current = true
      if (phaseRef.current === "routing") {
        endMarkerRef.current?.setMap(null)     // 실제 마커 숨김
        ghostRef.current?.show("end")          // ★ 변경
      } else {
        startMarker.setMap(null)
        ghostRef.current?.show("start")        // ★ 변경
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
        ghostRef.current?.hide("end")          // ★ 변경
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
        ghostRef.current?.hide("start")        // ★ 변경
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
      // ★ 변경: 고스트 정리
      ghostRef.current?.cleanup()
      ghostRef.current = null
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
      map.setZoom(17, true)

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
    if (map.getZoom() < 15) map.setZoom(17, true)
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

        const pickupCapsule = createCapsuleMarker("탑승", "#374151")
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
