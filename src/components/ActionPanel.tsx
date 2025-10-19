import { useDRTStore } from "@/store/drtStore"

const ActionPanel = () => {
  const serviceArea = useDRTStore((state) => state.serviceArea)
  const start = useDRTStore((state) => state.start)
  const end = useDRTStore((state) => state.end)
  const setEnd = useDRTStore((state) => state.setEnd)

  const renderMessage = () => {
    if (serviceArea === null) return "가까운 서비스 지역에서 DRT를 호출해 보세요"
    return `${serviceArea} 지역에서 DRT를 호출해 보세요`
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
          <div className="w-3 h-3 rounded-full border-3 border-blue-900 mr-3" />
          <div className="flex-1">
            <p className="text-sm text-gray-700 font-medium">
              출발지: {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : "지도에서 출발지 선택"}
            </p>
          </div>
        </div>

        {/* 가운데 구분선: 양 끝이 살짝 끊어진 형태 */}
        <div aria-hidden className="h-px bg-gray-300/30 mx-4 rounded-full scale-y-50" />

        {/* 도착지 */}
        <div className="flex items-center px-4 py-3">
          {/* 진한 빨간 도넛 */}
          <div className="w-3 h-3 rounded-full border-3 border-red-500 mr-3" />
          <input
            id="end"
            type="text"
            placeholder="도착지 검색"
            value={end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : ""}
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