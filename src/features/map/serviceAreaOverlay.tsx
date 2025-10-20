import { SERVICE_AREAS } from "@/utils/geo"

export type ServiceAreaOverlay = any

/** 서비스 지역 원형 오버레이를 그립니다. (중심+반경 기반) */
export function drawServiceAreas(
  map: naver.maps.Map,
  style?: {
    strokeColor?: string
    strokeOpacity?: number
    strokeWeight?: number
    fillColor?: string
    fillOpacity?: number
    zIndex?: number
  }
): ServiceAreaOverlay[] {
  const overlays: ServiceAreaOverlay[] = []

  for (const a of SERVICE_AREAS) {
    const circle = new window.naver.maps.Circle({
      map,
      center: new window.naver.maps.LatLng(a.center.lat, a.center.lng),
      radius: a.radius, // meters
      strokeColor: style?.strokeColor ?? "#2563eb",   // blue-600
      strokeOpacity: style?.strokeOpacity ?? 0.85,
      strokeWeight: style?.strokeWeight ?? 2,
      strokeStyle: "solid",
      fillColor: style?.fillColor ?? "#3b82f6",      // blue-500
      fillOpacity: style?.fillOpacity ?? 0.10,       // 살짝 파란 반투명
      zIndex: style?.zIndex ?? 1,                     // 경로/마커보다 뒤
      clickable: false,                               // 드래그/줌 방해 X
    })
    overlays.push(circle)
  }

  return overlays
}

/** 서비스 지역 오버레이 제거 */
export function clearServiceAreas(overlays: ServiceAreaOverlay[]) {
  overlays.forEach((o) => o.setMap(null))
}
