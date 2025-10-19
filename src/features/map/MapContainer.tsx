import { useEffect, useRef } from "react"
import { useDRTStore } from "@/store/drtStore"

const SERVICE_AREAS = [
  {
    name: "금천구",
    center: { lat: 37.4563, lng: 126.8951 },
    radius: 2500, // meters
  },
  // 필요한 경우 서비스 지역 추가 가능
]

function isInsideServiceArea(lat: number, lng: number): string | null {
  for (const area of SERVICE_AREAS) {
    const dist = getDistanceFromLatLonInM(lat, lng, area.center.lat, area.center.lng)
    if (dist <= area.radius) return area.name
  }
  return null
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000 // Radius of the earth in m
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

const MapContainer = () => {
  const mapRef = useRef<HTMLDivElement>(null)
  const setStart = useDRTStore((state) => state.setStart)
  const setServiceArea = useDRTStore((state) => state.setServiceArea)

  useEffect(() => {
    if (!window.naver || !mapRef.current) return

    const defaultLocation = new window.naver.maps.LatLng(37.4563, 126.8951) // 금천구 중심

    const map = new window.naver.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 14,
    })

    const centerMarker = new window.naver.maps.Marker({
      position: defaultLocation,
      map,
    })

    const updateStateFromCenter = () => {
      const center = map.getCenter()
      const lat = center.lat()
      const lng = center.lng()
      centerMarker.setPosition(center)

      const areaName = isInsideServiceArea(lat, lng)
      setServiceArea(areaName)
      setStart({ lat, lng })
    }

    // 최초 상태 반영
    updateStateFromCenter()

    // 지도 이동 후 상태 업데이트
    window.naver.maps.Event.addListener(map, "dragend", updateStateFromCenter)
  }, [setStart, setServiceArea])

  return <div ref={mapRef} className="w-full h-full" />
}

export default MapContainer
