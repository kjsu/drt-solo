import { useDRTStore } from "@/store/drtStore"

const ActionPanel = () => {
  const serviceArea = useDRTStore((state) => state.serviceArea)
  const start = useDRTStore((state) => state.start)
  const end = useDRTStore((state) => state.end)
  const setEnd = useDRTStore((state) => state.setEnd)

  const renderMessage = () => {
    if (serviceArea === null) return "서비스 지역이 아닙니다."
    return `${serviceArea} 지역 내에서 서비스를 이용할 수 있습니다.`
  }

  return (
    <div className="w-full h-full bg-white shadow-lg p-4 overflow-y-auto">
      <p className="text-sm text-gray-600 mb-4 text-center">{renderMessage()}</p>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1" htmlFor="start">출발지</label>
          <input
            id="start"
            type="text"
            readOnly
            value={start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : "지도 중앙을 이동해 설정"}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100 text-gray-700 cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1" htmlFor="end">도착지</label>
          <input
            id="end"
            type="text"
            placeholder="도착지를 입력해주세요"
            value={end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : ""}
            onChange={(e) => {
              const [latStr, lngStr] = e.target.value.split(',').map(s => s.trim())
              const lat = parseFloat(latStr)
              const lng = parseFloat(lngStr)
              if (!isNaN(lat) && !isNaN(lng)) setEnd({ lat, lng })
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  )
}

export default ActionPanel