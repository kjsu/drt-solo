import { useEffect, useRef } from "react"
import { useDRTStore } from "@/store/drtStore"

const MapContainer = () => {
  const mapRef = useRef<HTMLDivElement>(null)
  const setStart = useDRTStore((state) => state.setStart)

  useEffect(() => {
    if (!window.naver || !mapRef.current) return

    const defaultLocation = new window.naver.maps.LatLng(37.5665, 126.978) // 서울 시청

    const map = new window.naver.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 14,
    })

    const centerMarker = new window.naver.maps.Marker({
      position: defaultLocation,
      map,
    })

    // 지도 이동 후 중심 위치 추적
    window.naver.maps.Event.addListener(map, "dragend", () => {
      const center = map.getCenter()
      centerMarker.setPosition(center)
      setStart({ lat: center.lat(), lng: center.lng() })
    })

    // 최초 중심 위치 설정
    setStart({ lat: defaultLocation.lat(), lng: defaultLocation.lng() })
  }, [setStart])

  return <div ref={mapRef} className="w-full h-[400px]" />
}

export default MapContainer
