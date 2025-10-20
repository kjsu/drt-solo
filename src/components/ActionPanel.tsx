import { useDRTStore } from "@/store/drtStore"

const VanIcon = () => (
  <img
    src="/icons/van.png"
    alt=""
    className="w-[50px] h-[50px] object-contain"
    draggable={false}
  />
)

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
          <span className="block text-[15px] font-semibold text-gray-900">
            도착지를 확인해주세요
          </span>
        </div>
      </div>
    )
  }

  const isInService = !!serviceArea
  if (isInService) {
    const label = formatServiceLabel(serviceArea!)
    return (
      <div className="flex items-center gap-3 mb-3">
        <VanIcon />
        <div>
          <span className="block text-[13px] font-medium text-sky-600 leading-[18px]">
            {label}
          </span>
          <span className="block text-[16px] font-semibold text-gray-900">
            DRT를 호출하세요
          </span>
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

// 표시 문자열
function formatCoords(lat: number, lng: number, d = 6) {
  return `${lat.toFixed(d)}, ${lng.toFixed(d)}`
}
function getEndDisplay(end: { lat: number; lng: number } | null) {
  if (!end) return { primary: "좌표 계산 중…", secondary: "좌표 계산 중…" }
  return {
    primary: formatCoords(end.lat, end.lng, 5),
    secondary: formatCoords(end.lat, end.lng, 6),
  }
}
function getStartDisplay(start: { lat: number; lng: number } | null) {
  if (!start) return "좌표 계산 중…"
  return formatCoords(start.lat, start.lng, 5)
}

const ActionPanel = () => {
  const serviceArea = useDRTStore((s) => s.serviceArea)
  const start = useDRTStore((s) => s.start)
  const end = useDRTStore((s) => s.end)
  const phase = useDRTStore((s) => s.phase)
  const setEnd = useDRTStore((s) => s.setEnd)
  const setPhase = useDRTStore((s) => s.setPhase)
  const bumpResetKey = useDRTStore((s) => s.bumpResetKey)

  // routing 단계
  if (phase === "routing") {
    const { primary, secondary } = getEndDisplay(end)
    const canConfirm = !!end

    return (
      <div className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col">
        <h3 className="text-[16px] font-semibold tracking-[-0.2px] text-gray-900 mb-4">
          도착지를 확인해 주세요
        </h3>

        <div className="rounded-2xl bg-gray-100/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="w-3 h-3 rounded-full border-2 border-red-500" />
            <div className="flex-1">
              <p className="text-[15px] text-gray-900 leading-[1.1]">{primary}</p>
              <p className="mt-1 text-[12px] text-gray-500">{secondary}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => canConfirm && setPhase("selected")}
          className={`mt-auto h-12 w-full rounded-xl text-[15px] font-semibold active:scale-[0.99] ${canConfirm
            ? "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          확인
        </button>
      </div>
    )
  }

  // selected 단계 (경로 화면)
  if (phase === "selected") {
    return (
      <div className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col">
        <div className="mb-3">
          <span className="block text-[15px] font-semibold text-gray-900">
            경로가 표시되었습니다
          </span>
          <span className="mt-1 block text-[12px] text-gray-500">
            지도를 이동해도 경로와 마커는 고정됩니다.
          </span>
        </div>

        <div className="space-y-2 rounded-2xl bg-gray-50 px-4 py-3">
          <div className="text-sm text-gray-700">
            <span className="inline-block w-10 text-gray-500">출발</span>
            <span className="font-medium">{getStartDisplay(start)}</span>
          </div>
          <div className="text-sm text-gray-700">
            <span className="inline-block w-10 text-gray-500">도착</span>
            <span className="font-medium">
              {end ? formatCoords(end.lat, end.lng, 5) : "좌표 계산 중…"}
            </span>
          </div>
        </div>

        {/* ⬇️ X 버튼과 완전히 동일한 초기화 실행 */}
        <button
          type="button"
          onClick={() => bumpResetKey()}
          className="mt-auto h-11 w-full rounded-xl border border-gray-300 text-[14px] font-medium text-gray-700 active:scale-[0.99]"
        >
          다시 선택하기
        </button>
      </div>
    )
  }

  // 기본 단계
  return (
    <div className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col">
      <HeaderNotice serviceArea={serviceArea} phase={phase} />

      <div className="border border-blue-700 rounded-xl overflow-hidden">
        {/* 출발지 */}
        <div className="flex items-center px-4 py-3">
          <div className="w-3 h-3 rounded-full border-2 border-blue-900 mr-3" />
          <div className="flex-1">
            <p className="text-sm text-gray-700 font-medium">
              출발지: {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : "지도에서 출발지 선택"}
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
            value={end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : ""}
            onFocus={() => { setPhase("routing") }}
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
  )
}

export default ActionPanel