import { useEffect, useRef, useState } from "react"
import { useDRTStore } from "@/store/drtStore"

const SERVICE_AREAS = [
  {
    name: "금천구",
    center: { lat: 37.4563, lng: 126.8951 },
    radius: 2500, // meters
  },
]

function isInsideServiceArea(lat: number, lng: number): string | null {
  for (const area of SERVICE_AREAS) {
    const dist = getDistanceFromLatLonInM(lat, lng, area.center.lat, area.center.lng)
    if (dist <= area.radius) return area.name
  }
  return null
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000 // m
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

/** 반원형(윗부분 둥근 캡) 라벨 마커 DOM 생성 */
function createSemiCircleLabel(text: string, intense = false): HTMLElement {
  const wrap = document.createElement("div")
  wrap.style.pointerEvents = "none"
  wrap.style.display = "inline-block"

  // 본체(반원 캡)
  const bubble = document.createElement("div")
  bubble.textContent = text
  bubble.style.display = "inline-block"
  bubble.style.padding = "6px 12px"
  bubble.style.fontSize = "12px"
  bubble.style.lineHeight = "1"
  bubble.style.fontWeight = "600"
  bubble.style.color = "#fff"
  // 파란색 농도: 드래그 중엔 더 진하게
  bubble.style.background = intense ? "#1d4ed8" /* blue-700 */ : "#2563eb" /* blue-600 */
  bubble.style.borderTopLeftRadius = "9999px"
  bubble.style.borderTopRightRadius = "9999px"
  bubble.style.borderBottomLeftRadius = "0"
  bubble.style.borderBottomRightRadius = "0"
  bubble.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)"
  bubble.style.transform = "translateY(1px)" // 살짝 내려 보정

  // 아래 살짝 평평한 밑변을 기준점으로 삼기 위해 spacer(투명 영역) 추가
  const spacer = document.createElement("div")
  spacer.style.height = "4px" // 앵커 하단 여백
  spacer.style.width = "100%"

  wrap.appendChild(bubble)
  wrap.appendChild(spacer)
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

    /** 현재 상태에 맞는 마커 아이콘(반원형 라벨)로 교체 */
    const setMarkerIcon = (text: string, intense = false) => {
      const el = createSemiCircleLabel(text, intense)
      // 대략적인 앵커: 중앙 하단(텍스트 길이 변동 고려하여 실제 DOM 크기로 재계산)
      // content가 DOM 요소이므로 한 번 붙인 뒤 크기를 읽어 anchor를 보정할 수 있음
      markerRef.current?.setIcon({
        content: el,
        anchor: new window.naver.maps.Point(40, 22), // 초기값(대부분의 짧은 텍스트에서 보기 좋게)
      })
      // 다음 프레임에 실제 크기로 앵커 보정
      requestAnimationFrame(() => {
        const w = el.getBoundingClientRect().width || 80
        const h = el.getBoundingClientRect().height || 26
        markerRef.current?.setIcon({
          content: el,
          anchor: new window.naver.maps.Point(w / 2, h), // 중앙하단 기준
        })
      })
    }

    // 초기 마커 생성
    const marker = new window.naver.maps.Marker({
      position: defaultLocation,
      map,
      icon: {
        content: createSemiCircleLabel("여기서 출발", false),
        anchor: new window.naver.maps.Point(40, 22),
      },
      zIndex: 10,
    })
    markerRef.current = marker
    // 한 프레임 뒤 실제 크기로 앵커 보정
    requestAnimationFrame(() => setMarkerIcon("여기서 출발", false))

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

    // 최초 1회 반영
    commitCenterState()

    // 드래그 시작 → 라벨: "· · ·", 더 진한 파란색, 중앙 동기화
    const dragStartListener = window.naver.maps.Event.addListener(map, "dragstart", () => {
      setIsDragging(true)
      setMarkerIcon("· · ·", true)
      syncMarkerToCenter()
    })

    // 드래그 중 → 매 프레임 중앙 동기화
    const dragListener = window.naver.maps.Event.addListener(map, "drag", () => {
      syncMarkerToCenter()
    })

    // 줌 변경 시에도 중앙 유지
    const zoomListener = window.naver.maps.Event.addListener(map, "zoom_changed", () => {
      syncMarkerToCenter()
    })

    // 드래그 종료 → 라벨 복구, 상태 커밋
    const dragEndListener = window.naver.maps.Event.addListener(map, "dragend", () => {
      setIsDragging(false)
      setMarkerIcon("여기서 출발", false)
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

  // isDragging 값은 나중에 UI와 더 연동할 때 사용 가능
  return <div ref={mapRef} className="w-full h-full" />
}

export default MapContainer
