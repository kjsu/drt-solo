import { useEffect, useRef } from "react"

const MapContainer = () => {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.naver || !mapRef.current) return

    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(37.5665, 126.978),
      zoom: 14,
    })

    new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(37.5665, 126.978),
      map,
    })
  }, [])

  return <div ref={mapRef} className="w-full h-[500px]" />
}

export default MapContainer
