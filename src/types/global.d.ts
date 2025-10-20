export { }

declare global {
  // 런타임에 window.naver가 붙으므로 any로 두는 것이 안전
  interface Window {
    naver: any
  }

  // 전역 네임스페이스 셈: 코드에서 naver.maps.* 타입 표기를 허용
  namespace naver {
    namespace maps {
      // 최소 셈 (필요해지면 점진 확장)
      type Map = any
      type Marker = any
      type Polyline = any
      type LatLng = any

      class Point {
        constructor(x: number, y: number)
      }

      class LatLngBounds {
        extend(latlng: LatLng): void
      }

      const Event: {
        addListener: (target: any, name: string, fn: (...args: any[]) => void) => any
        removeListener: (handle: any) => void
      }
    }
  }
}