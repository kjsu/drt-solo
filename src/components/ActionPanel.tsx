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
  // 명시 매핑(원하면 여기만 추가)
  const MAP: Record<string, string> = {
    금천구: "서울시 금천",
    안양: "안양시 안양",
    안양시: "안양시 안양",
    만안구: "안양시 만안",
    동안구: "안양시 동안",
  }
  if (MAP[raw]) return MAP[raw]

  // 패턴 매핑
  // "안양시 동안구" → "안양시 동안"
  const cityGu = raw.match(/^(.+?)시\s?(.+?)구$/)
  if (cityGu) return `${cityGu[1]}시 ${cityGu[2]}`

  // "서울시 금천구" → "서울시 금천"
  const seoulGu = raw.match(/^서울시\s?(.+?)구$/)
  if (seoulGu) return `서울시 ${seoulGu[1]}`

  // "금천구" → "서울시 금천" (도시 정보 없는 '구'면 서울시로 보정)
  const onlyGu = raw.match(/^(.+?)구$/)
  if (onlyGu) return `서울시 ${onlyGu[1]}`

  // "군포시" → "군포시 군포" (스샷과 같은 스타일)
  const onlyCity = raw.match(/^(.+?)시$/)
  if (onlyCity) return `${onlyCity[0]} ${onlyCity[1]}`

  return raw
}

const HeaderNotice = ({
  serviceArea,
  phase,
}: {
  serviceArea: string | null
  phase: string
}) => {
  // routing 단계는 기존 문구 유지
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
    // 서비스 지역
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

  // 비서비스 지역
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

// ── 좌표 → 표시 문자열 헬퍼 (추후 리버스지오코딩 교체 지점)
function formatCoords(lat: number, lng: number, d = 6) {
  return `${lat.toFixed(d)}, ${lng.toFixed(d)}`
}
function getEndDisplay(end: { lat: number; lng: number } | null) {
  if (!end) return { primary: "좌표 계산 중…", secondary: "좌표 계산 중…" }
  return {
    primary: formatCoords(end.lat, end.lng, 5),   // 굵은 1줄
    secondary: formatCoords(end.lat, end.lng, 6), // 보조 1줄
  }
}

const ActionPanel = () => {
  const serviceArea = useDRTStore((s) => s.serviceArea)
  const start = useDRTStore((s) => s.start)
  const end = useDRTStore((s) => s.end)
  const phase = useDRTStore((s) => s.phase)
  const setEnd = useDRTStore((s) => s.setEnd)
  const setPhase = useDRTStore((s) => s.setPhase)

  // ── ActionPanel 내 routing 분기만 교체
  if (phase === "routing") {
    const { primary, secondary } = getEndDisplay(end)

    return (
      <div className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col">
        {/* 상단 회색띠(handle) 제거, 제목만 표시 */}
        <h3 className="text-[16px] font-semibold tracking-[-0.2px] text-gray-900 mb-4">
          도착지를 확인해 주세요
        </h3>

        {/* 선택된 후보 카드 */}
        <div className="rounded-2xl bg-gray-100/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="w-3 h-3 rounded-full border-2 border-red-500"
            />
            <div className="flex-1">
              <p className="text-[15px] text-gray-900 leading-[1.1]">
                {primary}
              </p>
              <p className="mt-1 text-[12px] text-gray-500">
                {secondary}
              </p>
            </div>
          </div>
        </div>

        {/* 확인 버튼: 패널 하단에 붙도록 mt-auto */}
        <button
          type="button"
          onClick={() => setPhase("selected")}
          className="mt-auto h-12 w-full rounded-xl bg-blue-600 text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(37,99,235,0.35)] active:scale-[0.99]"
        >
          확인
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col">
      {/* 아이콘 + 2줄 헤더 */}
      <HeaderNotice serviceArea={serviceArea} phase={phase} />

      {/* 출발지 / 도착지 입력창 */}
      <div className="border border-blue-700 rounded-xl overflow-hidden">
        {/* 출발지 */}
        <div className="flex items-center px-4 py-3">
          {/* 네이비 도넛 */}
          <div className="w-3 h-3 rounded-full border-2 border-blue-900 mr-3" />
          <div className="flex-1">
            <p className="text-sm text-gray-700 font-medium">
              출발지: {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : "지도에서 출발지 선택"}
            </p>
          </div>
        </div>

        {/* 가운데 구분선 */}
        <div aria-hidden className="h-px bg-gray-300/30 mx-4 rounded-full scale-y-50" />

        {/* 도착지 */}
        <div className="flex items-center px-4 py-3">
          {/* 빨강 도넛(도착 검색) */}
          <div className="w-3 h-3 rounded-full border-2 border-red-500 mr-3" />
          <input
            id="end"
            type="text"
            placeholder="도착지 검색"
            value={end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : ""}
            onFocus={() => setPhase("routing")} // 라우팅 모드 진입
            onChange={(e) => {
              const [latStr, lngStr] = e.target.value.split(",").map((s) => s.trim())
              const lat = parseFloat(latStr)
              const lng = parseFloat(lngStr)
              if (!isNaN(lat) && !isNaN(lng)) setEnd({ lat, lng })
            }}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

export default ActionPanel