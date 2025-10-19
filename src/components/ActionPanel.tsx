import { useDRTStore } from "@/store/drtStore"

const ActionPanel = () => {
  const serviceArea = useDRTStore((s) => s.serviceArea)
  const start = useDRTStore((s) => s.start)
  const end = useDRTStore((s) => s.end)
  const phase = useDRTStore((s) => s.phase)
  const setEnd = useDRTStore((s) => s.setEnd)
  const setPhase = useDRTStore((s) => s.setPhase)

  const renderMessage = () => {
    if (phase === "routing") return "도착지를 확인해주세요"
    if (serviceArea === null) return "가까운 서비스 지역에서 DRT를 호출해 보세요"
    return `${serviceArea} 지역에서 DRT를 호출해 보세요`
  }

  if (phase === "routing") {
    return (
      <div className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col">
        <p className="text-center text-[15px] font-medium text-gray-800 mb-4">
          {renderMessage()}
        </p>

        {/* 도착 좌표 블럭 */}
        <div className="border border-red-500/60 rounded-xl p-4 bg-red-50/40">
          <div className="text-xs text-gray-500 mb-1">도착 좌표</div>
          <div className="text-sm font-medium text-gray-800">
            {end ? `${end.lat.toFixed(6)}, ${end.lng.toFixed(6)}` : "계산 중..."}
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={() => setPhase("selected")} // 필요 시 moving 등 다음 단계로
              className="px-4 py-2 text-white bg-blue-700 rounded-lg text-sm font-semibold"
            >
              확인
            </button>
          </div>
        </div>

        <p className="mt-2 text-[12px] text-gray-500">
          지도를 움직이거나 확대/축소하면 도착 후보가 업데이트됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-col">
      {/* 안내 문구 */}
      <p className="text-center text-[15px] font-medium text-gray-800 mb-5">
        {renderMessage()}
      </p>

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
            onFocus={() => {
              // 라우팅 모드 진입 → MapContainer가 도착 마커 생성/줌인 수행
              setPhase("routing")
            }}
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