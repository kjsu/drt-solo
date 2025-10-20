import { LatLng as LatLngT, getDistanceFromLatLonInM } from "@/utils/geo"

export type LatLng = LatLngT

// ───────────────────────── API Spec (문서화 주석) ─────────────────────────
// POST /v1/route/plan
// Request:
// {
//   "start": { "lat": number, "lng": number },
//   "end":   { "lat": number, "lng": number },
//   "options"?: { "optimize"?: "time" | "distance" }
// }
// Response 200:
// {
//   "pickup":  { "lat": number, "lng": number },
//   "dropoff": { "lat": number, "lng": number },
//   "summary": {
//     "distance_m": number,
//     "duration_s": number,
//     "polyline": Array<{ "lat": number, "lng": number }>
//   }
// }
//
// 예시(cURL 느낌 설명용):
// curl -X POST https://api.example.com/v1/route/plan \
//      -H "Content-Type: application/json" \
//      -H "X-Request-Id: req_xxx" \
//      -d '{ "start": {...}, "end": {...}, "options": {"optimize":"time"} }'
// ────────────────────────────────────────────────────────────────────────

/** HTTP 모양의 응답 래퍼 (실제 네트워크는 아님) */
type HttpResponse<T> = {
  status: number
  headers: Record<string, string>
  body: T
}

/** 실제로 외부에서 사용하는 함수 시그니처(변경 없음) */
export async function planRouteDummy(payload: {
  start: LatLng
  end: LatLng
  options?: { optimize?: "time" | "distance" }
}): Promise<{
  pickup: LatLng
  dropoff: LatLng
  summary: { distance_m: number; duration_s: number; polyline: LatLng[] }
}> {
  // ── Client 계층: 요청 메타/헤더 구성(연출용)
  const requestId = genRequestId()
  const nowIso = new Date().toISOString()
  const reqHeaders = {
    "content-type": "application/json",
    "x-request-id": requestId,
    "x-api-key": "demo_portfolio_key", // 포트폴리오 데모용 키
  }

  const httpRes = await fakeRouteServer_POST_plan({
    headers: reqHeaders,
    body: payload,
    requestedAt: nowIso,
  })

  // ── Client 계층: 에러 처리/로깅(연출용)
  if (httpRes.status !== 200) {
    if (typeof window !== "undefined") {
      console.error("[RouteAPI] POST /v1/route/plan FAILED", {
        status: httpRes.status,
        headers: httpRes.headers,
      })
    }
    throw new Error(`RouteAPI Error: ${httpRes.status}`)
  }

  if (typeof window !== "undefined") {
    console.info("[RouteAPI] POST /v1/route/plan OK", {
      requestId,
      request: payload,
      responseHeaders: httpRes.headers,
      // body는 길 수 있어 샘플만 남기거나 주석 처리 가능
    })
  }

  // 외부엔 기존과 같은 '바디'만 돌려줌 → MapContainer 등 기존 코드 변경 無
  return httpRes.body
}

// ────────────── 아래는 서버 요청 ──────────────

type PlanRouteServerInput = {
  headers: Record<string, string>
  body: {
    start: LatLng
    end: LatLng
    options?: { optimize?: "time" | "distance" }
  }
  requestedAt: string
}

type PlanRouteServerBody = {
  pickup: LatLng
  dropoff: LatLng
  summary: { distance_m: number; duration_s: number; polyline: LatLng[] }
}

async function fakeRouteServer_POST_plan(
  req: PlanRouteServerInput
): Promise<HttpResponse<PlanRouteServerBody>> {
  // 헤더 검증(연출)
  const contentType = req.headers["content-type"]
  if (contentType?.toLowerCase() !== "application/json") {
    return json(415, { "x-request-id": req.headers["x-request-id"] ?? genRequestId() }, {
      pickup: { lat: 0, lng: 0 },
      dropoff: { lat: 0, lng: 0 },
      summary: { distance_m: 0, duration_s: 0, polyline: [] },
    })
  }

  // 약간의 네트워크/백엔드 지연 흉내
  await sleep(300)

  // 실제 "경로계산"은 여기에서 이루어진다고 가정하고, 더미 로직으로 대체
  const { start, end } = req.body
  const pickup = jitterNear(start, 420)   // 보행 구간 시작(출발→승차)
  const dropoff = jitterNear(end, 420)    // 보행 구간 끝(하차→도착)
  const polyline = makeCurvedPath(pickup, dropoff)

  const distance_m = getDistanceFromLatLonInM(
    pickup.lat, pickup.lng, dropoff.lat, dropoff.lng
  )
  const duration_s = Math.round(distance_m / 7)

  // 응답 헤더도 실제처럼 구성
  const resHeaders = {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": req.headers["x-request-id"] ?? genRequestId(),
    "x-response-time-ms": String(randomInt(120, 260)),
    "date": new Date().toUTCString(),
  }

  return json(200, resHeaders, {
    pickup,
    dropoff,
    summary: { distance_m, duration_s, polyline },
  })
}

// ────────────── 유틸 (기존 더미 로직 그대로) ──────────────

function metersToDeg(lat: number, dLatM: number, dLngM: number): LatLng {
  const dLat = dLatM / 111_320
  const dLng = dLngM / (111_320 * Math.cos((lat * Math.PI) / 180))
  return { lat: lat + dLat, lng: dLngM === 0 ? 0 : dLng }
}

// 시각적으로 벌어진 승차/하차 위치 생성
function jitterNear(base: LatLng, radiusM = 360): LatLng {
  const dx = (Math.random() * 2 - 1) * radiusM
  const dy = (Math.random() * 2 - 1) * radiusM
  const d = metersToDeg(base.lat, dy, dx)
  return { lat: base.lat + d.lat - base.lat, lng: base.lng + d.lng }
}

// 부드러운 곡선 경로 생성(Bezier)
function makeCurvedPath(a: LatLng, b: LatLng): LatLng[] {
  const mid: LatLng = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
  const ctrl = jitterNear(mid, 420)
  const steps = 20
  const pts: LatLng[] = []
  for (let t = 0; t <= steps; t++) {
    const u = t / steps
    const lat =
      (1 - u) * (1 - u) * a.lat +
      2 * (1 - u) * u * ctrl.lat +
      u * u * b.lat
    const lng =
      (1 - u) * (1 - u) * a.lng +
      2 * (1 - u) * u * ctrl.lng +
      u * u * b.lng
    pts.push({ lat, lng })
  }
  return pts
}

// ────────────── 공통 헬퍼 ──────────────
function json<T>(status: number, headers: Record<string, string>, body: T): HttpResponse<T> {
  return { status, headers, body }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function genRequestId() {
  return "req_" + Math.random().toString(36).slice(2, 10)
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
