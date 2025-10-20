export const SERVICE_AREAS = [
  { name: "금천구", center: { lat: 37.4563, lng: 126.8951 }, radius: 2500 },
]

export function isInsideServiceArea(lat: number, lng: number): string | null {
  for (const a of SERVICE_AREAS) {
    const d = getDistanceFromLatLonInM(lat, lng, a.center.lat, a.center.lng)
    if (d <= a.radius) return a.name
  }
  return null
}

export function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

export type LatLng = { lat: number; lng: number }
export const EPS = 1e-7

export function isSameLL(
  a?: { lat: number; lng: number } | null,
  b?: { lat: number; lng: number } | null
) {
  if (!a || !b) return false
  return Math.abs(a.lat - b.lat) < EPS && Math.abs(a.lng - b.lng) < EPS
}
