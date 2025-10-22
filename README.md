# drt-solo

**지도 위에서 출발·도착을 직관적으로 지정하고, DRT(Demand Responsive Transport) 흐름을 “더미 경로”로 시뮬레이션**하는 프론트엔드 데모입니다.  
네이버 지도 JS v3를 기반으로, **Idle → Routing → Selected** 3단계 UX, **고스트 마커(ghost marker)**, **서비스 지역 오버레이**, **리버스지오코딩 주소 라벨** 등을 구현했습니다.

> 배포는 GitHub Pages를 활용했으며, Vite + React 19 + Tailwind v4 + Zustand 구성을 사용합니다.

---

## 주요 기능

- **단계형 UX**
  - `idle` : 초기 진입. 지도 중심이 곧 **출발지**이며 “여기서 출발” 캡슐 마커 노출
  - `routing` : 도착지 선택 단계. **지도 패닝 ≒ 도착지 후보 이동**, “도착” 마커 함께 표시
  - `selected` : 더미 경로를 계산해 **출발 → 탑승 → 하차 → 도착**을 선/마커로 시각화
- **고스트 마커(ghost marker)**
  - 지도 드래그 중에는 실제 캡슐 마커 대신 **“…”만 보이는 고스트 마커**로 피드백
  - 드래그가 끝나면 실제 마커/라벨을 복원하여 이중 표기가 나오지 않도록 처리
- **서비스 지역 표시/판정**
  - 반경 기반의 **서비스 가능 지역 오버레이**를 지도에 렌더
  - 중심 좌표가 서비스 영역 내/외인지 실시간 판정하여 안내/제한
- **리버스지오코딩 주소 라벨**
  - `naver.maps.Service.reverseGeocode` 로 **좌표 → 주소 문구**를 변환
  - 상단 패널과 입력창에 **짧은/전체 주소**를 각각 노출
- **더미 경로 시뮬레이션**
  - `planRouteDummy` 로 **픽업/드롭오프** 포인트와 메인 경로 폴리라인을 생성
  - 구간별 스타일: 메인(파란 실선), 연결(회색 점선), **탑승/하차** 캡슐 마커 표시
- **빠른 초기화**
  - “뒤로/닫기/다시 선택” 버튼으로 **초기 뷰/줌/마커/스토어 상태**를 깔끔히 복구

---

## 기술 스택

- **Runtime**: React 19, TypeScript 5, Vite 7
- **상태 관리**: Zustand 5
- **스타일**: Tailwind CSS v4, PostCSS, Autoprefixer
- **지도**: Naver Maps JavaScript v3 (Geocoder submodule 사용)
- **배포**: GitHub Pages (`gh-pages`)

---

## 동작 개요

1. **초기화**

   - `initMap` 유틸이 지도를 생성하고, 서비스 지역 오버레이와 **“여기서 출발”** 캡슐 마커를 배치합니다.
   - 중심 좌표를 스토어 `start` 로 커밋하고, 서비스 영역 여부를 판정합니다.

2. **도착지 선택 (`routing`)**

   - 입력 포커스 또는 액션으로 상태가 `routing` 으로 전환됩니다.
   - 지도 중심에 **“도착”** 캡슐 마커가 따라다니며, 드래그 중에는 **고스트 마커**만 노출됩니다.
   - 스토어의 `end` 가 변경되면 주소 라벨을 갱신합니다.

3. **경로 시각화 (`selected`)**

   - `planRouteDummy` 결과로 메인 경로 폴리라인과 **픽업/드롭오프** 마커를 그립니다.
   - 지도는 **모든 포인트가 보이도록 bounds fit** 합니다.

4. **리셋**
   - 버튼 클릭/스토어 `resetKey` 증가 시, 모든 레이어를 제거하고 초기 중심·줌·라벨을 복구합니다.

---

## 빠른 시작

### 1) 설치 & 로컬 실행

```bash
# Node.js 20+ 권장
npm i
npm run dev
```

### 2) 네이버 지도 스크립트 추가

`index.html`의 `<head>`에 **클라이언트 ID**와 **geocoder** 서브모듈을 포함한 스크립트를 추가

```html
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID&submodules=geocoder"></script>
```

> ⚠️ 리버스지오코딩(주소 변환)이 필요하므로 `submodules=geocoder` 를 포함

### 3) 타입 선언(권장)

네이버 지도 전역 객체를 안전하게 사용하려면 프로젝트에 전역 타입 선언을 추가하세요(예: `src/types/global.d.ts`).

```ts
export {};

declare global {
  interface Window {
    naver: typeof naver;
  }
}
```

> 공식 타입 패키지가 없는 환경을 고려해 **ambient** 선언으로 접근합니다.

### 4) Tailwind v4 설정 팁

Tailwind v4는 PostCSS 플러그인으로 동작합니다. 이미 `@tailwindcss/postcss`, `postcss`, `autoprefixer` 가 devDependencies 에 포함되어 있습니다.  
Vite와 함께 사용할 때는 **별도 설정이 최소화**되어도 동작합니다.

---

## 사용 방법 (UX 흐름)

1. **앱 진입** → 지도 중심이 **출발지**가 됩니다. “여기서 출발” 마커 확인
2. **도착지 입력** → 입력창 포커스 시 `routing` 전환, 지도 드래그로 도착지 지정
3. **확인** → 서비스 영역 내면 `selected` 로 전환되어 **더미 경로** 표시(영역 밖이면 토스트 안내)
4. **다시 선택** → 초기화 후 재선택 가능

---

## 스크립트

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "gh-pages -d dist"
}
```

---

## 배포(GitHub Pages)

1. **빌드**
   ```bash
   npm run build
   ```
2. **배포**
   ```bash
   npm run deploy
   ```
3. **Vite base 설정(필요 시)**

   ```ts
   import { defineConfig } from "vite";
   import react from "@vitejs/plugin-react-swc";

   export default defineConfig({
     plugins: [react()],
     base: "/<repo-name>/", // GitHub Pages: 사용자/조직 페이지가 아닌 경우 필요
   });
   ```

   > 정적 리소스 경로는 `import.meta.env.BASE_URL` 을 사용합니다. 아이콘(`icons/van.png`)은 이 값을 기준으로 로드됩니다.

---

## 설계 메모

- **마커 캡슐(출발/도착/탑승/하차)**: 커스텀 DOM 아이콘 + `fixAnchor` 로 **줌/패닝 흔들림 최소화**
- **고스트 컨트롤러**: 드래그 중 실제 라벨 숨김 + “…“만 노출 → **중복/깜빡임 방지**
- **성능**: 드래그 중 불필요한 DOM 업데이트 억제, 종료 시 라벨 복원
- **안정성**: `useRef` 로 최신 상태(phase, end 등)를 안정 참조 → **이벤트-렌더 타이밍 이슈 회피**

---

## 한계 및 TODO

- **실제 길찾기 미사용**: 현재 `planRouteDummy` 기반 데모 → Naver Directions/외부 경로 API 연동 필요
- **서비스 지역 데이터**: 반경 기반 단순 모델 → 폴리곤/서버 동기화 고려
- **타입 안정성**: `window.naver` ambient 선언 의존 → 서비스 도입 시 커스텀 타입 보강 권장

---
