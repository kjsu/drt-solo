import { useEffect, useRef, useState } from "react"
import { useDRTStore } from "@/store/drtStore"

const SERVICE_AREAS = [
  { name: "금천구", center: { lat: 37.4563, lng: 126.8951 }, radius: 2500 },
]

// -------- utils --------
function isInsideServiceArea(lat: number, lng: number): string | null {
  for (const area of SERVICE_AREAS) {
    const dist = getDistanceFromLatLonInM(lat, lng, area.center.lat, area.center.lng)
    if (dist <= area.radius) return area.name
  }
  return null
}
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

// -------- capsule label (using CSS var) --------
// 전역에 :root { --color-blue-900: #0A1F47; } 처럼 지정되어 있어야 합니다.
const COLOR_VAR = "var(--color-blue-900, #0A1F47)"

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

/** 캡슐 + 하단 세로 라인(마커 꼬리, 캡슐과 밀착) DOM 생성 */
function createCapsuleMarker(text: string): HTMLElement {
  const wrap = document.createElement("div")
  wrap.style.pointerEvents = "none"
  wrap.style.display = "inline-flex"
  wrap.style.flexDirection = "column"
  wrap.style.alignItems = "center"

  // 캡슐
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
  capsule.style.background = COLOR_VAR
  capsule.style.borderRadius = "9999px" // 캡슐
  capsule.style.boxShadow = "0 6px 14px rgba(0,0,0,0.16)"
  // 캡슐-꼬리 사이 틈 제거를 위해 translateY 제거
  capsule.style.fontFamily =
    `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Helvetica Neue", Arial, sans-serif`
  applyNoWrap(capsule)

  // 꼬리(세로 직선) — 캡슐과 밀착
  const tail = document.createElement("div")
  tail.style.width = "2px"
  tail.style.height = "16px" // 필요 시 길이 조절
  tail.style.background = COLOR_VAR
  tail.style.marginTop = "0"  // ← 캡슐과 바로 붙도록
  tail.style.borderRadius = "1px"

  wrap.appendChild(capsule)
  wrap.appendChild(tail)
  return wrap
}

const MapContainer = () => {
  const mapRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<naver.maps.Marker | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const rafQueuedRef = useRef(false)

  const [isDragging, setIsDragging] = useState(false)

  const setStart = useDRTStore((state) => state.setStart)
  const setServiceArea = useDRTStore((state) => state.setServiceArea)

  useEffect(() => {
    if (!window.naver || !mapRef.current) return

    const defaultLocation = new window.naver.maps.LatLng(37.4563, 126.8951)

    const map = new window.naver.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 14,
    })

    // 마커 아이콘 설정 (DOM + anchor 보정)
    const setMarkerIcon = (text: string) => {
      const el = createCapsuleMarker(text)
      markerRef.current?.setIcon({
        content: el,
        anchor: new window.naver.maps.Point(50, 34), // 초기값
      })
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const w = rect.width || 100
        const h = rect.height || 40
        markerRef.current?.setIcon({
          content: el,
          anchor: new window.naver.maps.Point(w / 2, h), // 전체 DOM의 중앙 하단(꼬리 끝이 기준점)
        })
      })
    }

    // 초기 마커(캡슐 + 직선 꼬리)
    const marker = new window.naver.maps.Marker({
      position: defaultLocation,
      map,
      icon: {
        content: createCapsuleMarker("여기서 출발"),
        anchor: new window.naver.maps.Point(50, 34),
      },
      zIndex: 10,
    })
    markerRef.current = marker
    // 실제 크기에 맞춰 anchor 1프레임 후 보정
    requestAnimationFrame(() => setMarkerIcon("여기서 출발"))

    const syncMarkerToCenter = () => {
      if (rafQueuedRef.current) return
      rafQueuedRef.current = true
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafQueuedRef.current = false
        const center = map.getCenter()
        marker.setPosition(center)
      })
    }

    const commitCenterState = () => {
      const center = map.getCenter()
      const lat = center.lat()
      const lng = center.lng()
      marker.setPosition(center)

      const areaName = isInsideServiceArea(lat, lng)
      setServiceArea(areaName)
      setStart({ lat, lng })
    }

    // 최초 반영
    commitCenterState()

    // 드래그 시작
    const dragStartListener = window.naver.maps.Event.addListener(map, "dragstart", () => {
      setIsDragging(true)
      setMarkerIcon("· · ·") // 색은 항상 --color-blue-900, 텍스트만 변경
      syncMarkerToCenter()
    })

    // 드래그 중
    const dragListener = window.naver.maps.Event.addListener(map, "drag", () => {
      syncMarkerToCenter()
    })

    // 줌 변경 시에도 중앙 유지
    const zoomListener = window.naver.maps.Event.addListener(map, "zoom_changed", () => {
      syncMarkerToCenter()
    })

    // 드래그 종료
    const dragEndListener = window.naver.maps.Event.addListener(map, "dragend", () => {
      setIsDragging(false)
      setMarkerIcon("여기서 출발")
      commitCenterState()
    })

    return () => {
      window.naver.maps.Event.removeListener(dragStartListener)
      window.naver.maps.Event.removeListener(dragListener)
      window.naver.maps.Event.removeListener(zoomListener)
      window.naver.maps.Event.removeListener(dragEndListener)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [setStart, setServiceArea])

  return <div ref={mapRef} className="w-full h-full" />
}

export default MapContainer
