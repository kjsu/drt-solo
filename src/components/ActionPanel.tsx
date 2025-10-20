import { useEffect, useMemo, useRef, useState } from "react"
import { useDRTStore } from "@/store/drtStore"
import { isInsideServiceArea } from "@/utils/geo"

const VanIcon = () => (
  <img src="/icons/van.png" alt="" className="w-[50px] h-[50px] object-contain" draggable={false} />
)

/* ───────── Reverse Geocoding: 좌표→주소 라벨 ───────── */

type LatLng = { lat: number; lng: number } | null
type AddressLabels = { shortLabel: string; fullLabel: string }

const LOADING: AddressLabels = { shortLabel: "주소 불러오는 중…", fullLabel: "주소 불러오는 중…" }
const EMPTY: AddressLabels = { shortLabel: "주소 정보 없음", fullLabel: "주소 정보 없음" }

function pickLabelsFromResponse(resp: any): AddressLabels | null {
  const v2 = resp?.v2
  if (!v2) return null
  const results = Array.isArray(v2.results) ? v2.results : []
  const r0 = results[0] || null

  const region = r0?.region
  const a1 = region?.area1?.name || ""
  const a2 = region?.area2?.name || ""
  const a3 = region?.area3?.name || ""

  const addr = v2.address || {}
  const full = addr.roadAddress || addr.jibunAddress || ""

  const buildingName =
    r0?.land?.addition0?.value ||
    r0?.land?.addition1?.value ||
    r0?.land?.addition2?.value ||
    r0?.land?.addition3?.value ||
    ""

  const landName = r0?.land?.name || ""
  const n1 = r0?.land?.number1 || ""
  const n2 = r0?.land?.number2 ? `-${r0.land.number2}` : ""

  const removePrefix = (s: string) => {
    let rest = s
      ;[a1, a2, a3].filter(Boolean).forEach(p => {
        const re = new RegExp(`^${p}\\s*`)
        rest = rest.replace(re, "")
      })
    return rest.trim()
  }

  let short = ""
  if (buildingName) short = buildingName
  else if (addr.roadAddress) short = removePrefix(addr.roadAddress)
  else if (addr.jibunAddress) short = removePrefix(addr.jibunAddress)
  else if (landName && (n1 || n2)) short = `${landName} ${n1}${n2}`
  else if (a3) short = a3

  short = (short || full).trim()
  const fullLabel = (full || short).trim()
  if (!short) return null
  return { shortLabel: short, fullLabel }
}

async function reverseGeocodeLabels(ll: LatLng): Promise<AddressLabels | null> {
  const svc = (window as any)?.naver?.maps?.Service
  if (!ll || !svc) return null
  const { lat, lng } = ll
  return new Promise(resolve => {
    svc.reverseGeocode(
      { coords: new window.naver.maps.LatLng(lat, lng) },
      (status: any, response: any) => {
        if (status !== window.naver.maps.Service.Status.OK) return resolve(null)
        resolve(pickLabelsFromResponse(response))
      }
    )
  })
}

function useAddressLabels(ll: LatLng) {
  const [labels, setLabels] = useState<AddressLabels>(LOADING)
  const key = useMemo(() => (ll ? `${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}` : "null"), [ll])

  useEffect(() => {
    let alive = true
    if (!ll) {
      setLabels(LOADING)
      return
    }
    ; (async () => {
      const res = await reverseGeocodeLabels(ll)
      if (!alive) return
      setLabels(res || EMPTY)
    })()
    return () => { alive = false }
  }, [key, ll])

  return labels
}

/* ───────── 헤더 ───────── */

function formatServiceLabel(raw: string) {
  const MAP: Record<string, string> = {
    금천구: "서울시 금천",
    안양: "안양시 안양",
    안양시: "안양시 안양",
    만안구: "안양시 만안",
    동안구: "안양시 동안",
  }
  if (MAP[raw]) return MAP[raw]

  const cityGu = raw.match(/^(.+?)시\s?(.+?)구$/)
  if (cityGu) return `${cityGu[1]}시 ${cityGu[2]}`
  const seoulGu = raw.match(/^서울시\s?(.+?)구$/)
  if (seoulGu) return `서울시 ${seoulGu[1]}`
  const onlyGu = raw.match(/^(.+?)구$/)
  if (onlyGu) return `서울시 ${onlyGu[1]}`
  const onlyCity = raw.match(/^(.+?)시$/)
  if (onlyCity) return `${onlyCity[0]} ${onlyCity[1]}`
  return raw
}

const HeaderNotice = ({ serviceArea, phase }: { serviceArea: string | null; phase: string }) => {
  if (phase === "routing") {
    return (
      <div className="flex items-center gap-3 mb-4">
        <VanIcon />
        <div className="leading-[20px]">
          <span className="block text-[15px] font-semibold text-gray-900"> 도착지를 확인해주세요 </span>
        </div>
      </div>
    )
  }

  const isInService = !!serviceArea
  if (isInService) {
    const label = formatServiceLabel(serviceArea!)
    return (
      <div className="flex items-center gap-3 mb-4">
        <VanIcon />
        <div>
          <span className="block text-[13px] font-medium text-sky-600 leading-[18px]">{label}</span>
          <span className="block text-[16px] font-semibold text-gray-900"> DRT를 호출하세요 </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      <VanIcon />
      <div className="leading-[20px]">
        <span className="block text-[16px] font-semibold text-gray-900">가까운 서비스 지역에서</span>
        <span className="block text-[16px] font-semibold text-gray-900">DRT를 호출해 보세요</span>
      </div>
    </div>
  )
}

/* ───────── Edge Toast (지도 위, 패널 위쪽, 콘텐츠 너비) ───────── */

function ensureToastStyle() {
  if (document.getElementById("drt-toast-style")) return
  const style = document.createElement("style")
  style.id = "drt-toast-style"
  style.textContent = `
    @keyframes drtToastIn { 0% { transform: translateY(8px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
    @keyframes drtToastOut { 0% { transform: translateY(0); opacity: 1 } 100% { transform: translateY(8px); opacity: 0 } }
    .drt-toast-enter { animation: drtToastIn 180ms ease-out forwards; }
    .drt-toast-exit  { animation: drtToastOut 200ms ease-in forwards; }
  `
  document.head.appendChild(style)
}

const MapEdgeToast = ({
  text,
  phase,
  bottomOffset,
}: {
  text: string
  phase: "enter" | "exit"
  bottomOffset: number
}) => {
  ensureToastStyle()
  return (
    <div
      className={`fixed left-1/2 transform -translate-x-1/2 z-[1200] pointer-events-none drt-toast-${phase}`}
      style={{
        bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))`,
      }}
    >
      <div className="inline-flex items-center rounded-full px-3 py-1.5 bg-gray-900/60 text-white text-[13px] leading-[18px] shadow-[0_6px_16px_rgba(0,0,0,0.22)] backdrop-blur-sm whitespace-nowrap">
        서비스 지역이 아닙니다
      </div>
    </div>
  )
}

/* ───────── 본문 ───────── */

const ActionPanel = () => {
  const serviceArea = useDRTStore((s) => s.serviceArea)
  const start = useDRTStore((s) => s.start)
  const end = useDRTStore((s) => s.end)
  const phase = useDRTStore((s) => s.phase)
  const setPhase = useDRTStore((s) => s.setPhase)
  const bumpResetKey = useDRTStore((s) => s.bumpResetKey)

  // 좌표→주소
  const startAddr = useAddressLabels(start)
  const endAddr = useAddressLabels(end)

  // ───────── 토스트 상태(문구 고정) + 패널 높이 측정 ─────────
  const [showTip, setShowTip] = useState(false)
  const [tipPhase, setTipPhase] = useState<"enter" | "exit">("enter")
  const [panelH, setPanelH] = useState(0)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const enterRef = useRef<number | null>(null)
  const exitRef = useRef<number | null>(null)

  useEffect(() => {
    if (!panelRef.current) return
    const ro = new ResizeObserver(() => {
      setPanelH(panelRef.current?.offsetHeight ?? 0)
    })
    ro.observe(panelRef.current)
    setPanelH(panelRef.current.offsetHeight)
    return () => ro.disconnect()
  }, [phase])

  const triggerTip = () => {
    // 지도 위, 패널 바로 위에 표시
    setShowTip(true)
    setTipPhase("enter")
    if (enterRef.current) window.clearTimeout(enterRef.current)
    if (exitRef.current) window.clearTimeout(exitRef.current)
    enterRef.current = window.setTimeout(() => {
      setTipPhase("exit")
      exitRef.current = window.setTimeout(() => setShowTip(false), 220)
    }, 1400)
  }

  useEffect(() => () => {
    if (enterRef.current) window.clearTimeout(enterRef.current)
    if (exitRef.current) window.clearTimeout(exitRef.current)
  }, [])

  // routing 단계
  if (phase === "routing") {
    const canConfirm = !!end
    const handleConfirm = () => {
      if (!canConfirm) return
      if (end && !isInsideServiceArea(end.lat, end.lng)) {
        triggerTip()
        return
      }
      setPhase("selected")
    }

    return (
      <>
        {/* 지도 위 토스트 (패널 위쪽에 위치) */}
        {showTip && <MapEdgeToast text="가까운 서비스 지역에서 호출해 보세요." phase={tipPhase} bottomOffset={panelH + 12} />}

        <div
          ref={panelRef}
          className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col relative"
        >
          <h3 className="text-[16px] font-semibold tracking-[-0.2px] text-gray-900 mb-4">
            도착지를 확인해 주세요
          </h3>

          <div className="rounded-2xl bg-gray-100/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <span aria-hidden className="w-3 h-3 rounded-full border-2 border-red-500" />
              <div className="flex-1">
                <p className="text-[15px] text-gray-900 leading-[1.1]">
                  {end ? endAddr.shortLabel : "주소 불러오는 중…"}
                </p>
                <p className="mt-1 text-[12px] text-gray-500">
                  {end ? endAddr.fullLabel : "주소 불러오는 중…"}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className={`mt-4 h-12 w-full rounded-xl text-[15px] font-semibold active:scale-[0.99] ${canConfirm
              ? "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            확인
          </button>
        </div>
      </>
    )
  }

  // selected 단계
  if (phase === "selected") {
    return (
      <div
        ref={panelRef}
        className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col"
      >
        <div className="mb-3">
          <span className="block text-[15px] font-semibold text-gray-900"> 경로 안내를 시작합니다 </span>
        </div>

        <div className="space-y-2 rounded-2xl bg-gray-50 px-4 py-3">
          <div className="text-sm text-gray-700">
            <span className="inline-block w-13 text-gray-500">출발지: </span>
            <span className="font-medium">{start ? startAddr.shortLabel : "주소 불러오는 중…"}</span>
          </div>
          <div className="text-sm text-gray-700">
            <span className="inline-block w-13 text-gray-500">도착지: </span>
            <span className="font-medium">{end ? endAddr.shortLabel : "주소 불러오는 중…"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => bumpResetKey()}
          className="mt-4 h-11 w-full rounded-xl border border-gray-300 text-[14px] font-medium text-gray-700 active:scale-[0.99]"
        >
          다시 경로 선택하기
        </button>
      </div>
    )
  }

  // 기본 단계
  return (
    <>
      {/* 지도 위 토스트 (도착지 입력 방지 케이스에 사용) */}
      {showTip && <MapEdgeToast text="가까운 서비스 지역에서 호출해 보세요." phase={tipPhase} bottomOffset={panelH + 12} />}

      <div
        ref={panelRef}
        className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col relative"
      >
        <HeaderNotice serviceArea={serviceArea} phase={phase} />

        <div className="border border-blue-700 rounded-xl overflow-hidden">
          {/* 출발지 */}
          <div className="flex items-center px-4 py-3">
            <div className="w-3 h-3 rounded-full border-2 border-blue-900 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium">
                출발지: {start ? startAddr.shortLabel : "지도에서 출발지 선택"}
              </p>
            </div>
          </div>

          <div aria-hidden className="h-px bg-gray-300/30 mx-4 rounded-full scale-y-50" />

          {/* 도착지 */}
          <div className="flex items-center px-4 py-3">
            <div className="w-3 h-3 rounded-full border-2 border-red-500 mr-3" />
            <input
              id="end"
              type="text"
              placeholder="도착지 검색"
              value={end ? endAddr.shortLabel : ""}
              onFocus={(e) => {
                const isStartInService = !!serviceArea
                if (!isStartInService) {
                  e.currentTarget.blur()
                  triggerTip()
                  return
                }
                setPhase("routing")
              }}
              onChange={(e) => {
                const [latStr, lngStr] = e.target.value.split(",").map((s) => s.trim())
                const lat = parseFloat(latStr)
                const lng = parseFloat(lngStr)
                if (!isNaN(lat) && !isNaN(lng)) useDRTStore.getState().setEnd({ lat, lng })
              }}
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default ActionPanel