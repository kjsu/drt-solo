// src/features/map/mapEvents.ts
// (네이버 지도 이벤트: dragstart/drag/dragend/zoom_changed/idle 바인딩 전용)

import { createCapsuleMarker } from "@/utils/capsuleMarker"

export type Phase = "idle" | "routing" | "selected"

type GhostController = {
  show: (kind: "start" | "end") => void
  hide: (kind: "start" | "end") => void
}

type Ref<T> = { current: T }

export function bindMapEvents(params: {
  map: naver.maps.Map

  // phase & flags
  phaseRef: Ref<Phase>
  draggingRef: Ref<boolean>

  // ghost
  ghostRef: Ref<GhostController | null>

  // markers & dom
  startMarkerRef: Ref<naver.maps.Marker | null>
  endMarkerRef: Ref<naver.maps.Marker | null>
  startRootRef: Ref<HTMLElement | null>
  startLabelElRef: Ref<HTMLElement | null>
  endRootRef: Ref<HTMLElement | null>
  endLabelElRef: Ref<HTMLElement | null>

  // callbacks/utilities
  setLabelAndFix: (
    marker: naver.maps.Marker | null | undefined,
    root: HTMLElement | null | undefined,
    labelEl: HTMLElement | null | undefined,
    text: string
  ) => void
  setEndIfChangedLL: (ll: naver.maps.LatLng) => void
  setServiceArea: (name: string | null) => void
  isInsideServiceArea: (lat: number, lng: number) => string | null
  setStart: (pos: { lat: number; lng: number }) => void

  // for creating end marker when needed
  COLOR_RED_500: string
}) {
  const {
    map,
    phaseRef,
    draggingRef,
    ghostRef,
    startMarkerRef,
    endMarkerRef,
    startRootRef,
    startLabelElRef,
    endRootRef,
    endLabelElRef,
    setLabelAndFix,
    setEndIfChangedLL,
    setServiceArea,
    isInsideServiceArea,
    setStart,
    COLOR_RED_500,
  } = params

  // ───────── 드래그: 실제 마커 숨기고 고스트만 표시 ─────────
  const onDragStart = window.naver.maps.Event.addListener(map, "dragstart", () => {
    if (phaseRef.current === "selected") return
    draggingRef.current = true
    if (phaseRef.current === "routing") {
      endMarkerRef.current?.setMap(null) // 실제 마커 숨김
      ghostRef.current?.show("end")
    } else {
      startMarkerRef.current?.setMap(null)
      ghostRef.current?.show("start")
    }
  })

  const onDrag = window.naver.maps.Event.addListener(map, "drag", () => {
    // 고스트는 rAF 루프가 mapDiv 중앙을 계속 추적 → 여기선 아무것도 안 함
  })

  const onDragEnd = window.naver.maps.Event.addListener(map, "dragend", () => {
    if (phaseRef.current === "selected") return
    draggingRef.current = false
    const center = map.getCenter()

    if (phaseRef.current === "routing") {
      ghostRef.current?.hide("end")

      if (!endMarkerRef.current) {
        const endCap = createCapsuleMarker("도착", COLOR_RED_500)
        endRootRef.current = endCap.root
        endLabelElRef.current = endCap.labelEl
        const em = new window.naver.maps.Marker({
          position: center,
          map,
          icon: { content: endCap.root, anchor: new window.naver.maps.Point(50, 34) },
          zIndex: 11,
        })
        endMarkerRef.current = em
        // 고정(앵커 보정)
        // fixAnchor는 MapContainer 쪽에서 이미 사용중인 헬퍼이므로,
        // 라벨 재설정만 수행하고 보정은 setLabelAndFix에서 처리되도록 유지.
        setLabelAndFix(endMarkerRef.current, endRootRef.current!, endLabelElRef.current!, "도착")
      } else {
        endMarkerRef.current.setMap(map)
        endMarkerRef.current.setPosition(center)
        setLabelAndFix(endMarkerRef.current, endRootRef.current!, endLabelElRef.current!, "도착")
      }
      setEndIfChangedLL(center)
    } else {
      ghostRef.current?.hide("start")
      // startMarker 복귀 + 스토어 반영
      const sm = startMarkerRef.current
      if (sm) {
        sm.setMap(map)
        sm.setPosition(center)
      }
      setLabelAndFix(startMarkerRef.current, startRootRef.current!, startLabelElRef.current!, "여기서 출발")
      const lat = center.lat(), lng = center.lng()
      setServiceArea(isInsideServiceArea(lat, lng))
      setStart({ lat, lng })
    }
  })

  // 줌 변경: 드래그 아닐 때만 보정
  const onZoom = window.naver.maps.Event.addListener(map, "zoom_changed", () => {
    if (phaseRef.current === "selected") return
    if (draggingRef.current) return
    const center = map.getCenter()
    if (phaseRef.current === "routing") {
      endMarkerRef.current?.setPosition(center)
    } else {
      startMarkerRef.current?.setPosition(center)
    }
  })

  // idle: 드래그 아닐 때만 라벨 복구
  const onIdle = window.naver.maps.Event.addListener(map, "idle", () => {
    if (phaseRef.current === "selected") return
    if (draggingRef.current) return
    if (phaseRef.current === "routing") {
      setLabelAndFix(endMarkerRef.current, endRootRef.current, endLabelElRef.current, "도착")
    } else {
      setLabelAndFix(startMarkerRef.current, startRootRef.current, startLabelElRef.current, "여기서 출발")
    }
  })

  // 해제 함수 반환
  return () => {
    window.naver.maps.Event.removeListener(onDragStart)
    window.naver.maps.Event.removeListener(onDrag)
    window.naver.maps.Event.removeListener(onDragEnd)
    window.naver.maps.Event.removeListener(onZoom)
    window.naver.maps.Event.removeListener(onIdle)
  }
}
