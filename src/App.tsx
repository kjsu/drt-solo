import MapContainer from "@/features/map/MapContainer"
import ActionPanel from "@/components/ActionPanel"

const App = () => {
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* 지도: 70% 영역 */}
      <div className="flex-[0.6] relative">
        <MapContainer />
      </div>

      {/* 바텀시트: 30% 영역 */}
      <div className="flex-[0.4]">
        <ActionPanel />
      </div>
    </div>
  )
}

export default App
