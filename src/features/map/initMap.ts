// src/features/map/initMap.ts
// (초기 네이버 지도 세팅 전용 유틸리티)

import { drawServiceAreas, ServiceAreaOverlay } from "@/features/map/serviceAreaOverlay"
import { createCapsuleMarker } from "@/utils/capsuleMarker"

type DrawAreaOpts = {
  strokeColor: string
  strokeOpacity: number
  strokeWeight: number
  fillColor: string
  fillOpacity: number
  zIndex?: number
}

export type InitMapResult = {
  map: naver.maps.Map
  startMarker: naver.maps.Marker
  startCapsule: { root: HTMLElement; labelEl: HTMLElement }
  overlays: ServiceAreaOverlay[]
}

/**
 * 초기 지도 생성 + 서비스 영역 렌더 + 시작 마커 생성까지 한 번에 수행
 * - zoom: 14, tileSpare: 4 (기존 MapContainer 설정과 동일)
 * - startCapsule: createCapsuleMarker(label, bg) 결과 반환
 */
export function initMap(params: {
  mapDiv: HTMLDivElement
  defaultCenter: naver.maps.LatLng
  startLabel: string
  startBg: string
  drawAreaOpts: DrawAreaOpts
}): InitMapResult {
  const { mapDiv, defaultCenter, startLabel, startBg, drawAreaOpts } = params

  const map = new window.naver.maps.Map(mapDiv, {
    center: defaultCenter,
    zoom: 14,
    tileSpare: 4,
  })

  const overlays = drawServiceAreas(map, drawAreaOpts)

  const startCapsule = createCapsuleMarker(startLabel, startBg)
  const startMarker = new window.naver.maps.Marker({
    position: defaultCenter,
    map,
    icon: { content: startCapsule.root, anchor: new window.naver.maps.Point(50, 34) },
    zIndex: 10,
  })

  return { map, startMarker, startCapsule, overlays }
}
