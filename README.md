# 프론트엔드 신입 코딩테스트

**과제 설명은 [`PROBLEM.md`](./PROBLEM.md)를 먼저 읽어 주세요.**

## 실행

```bash
npm install
npm run dev     # http://localhost:5173
npm test
```

- **Node.js 22.22 이상** (LTS 24 권장, `node -v` 로 확인). 버전이 낮으면 `npm install` 이 실패합니다.
- 스택: React 19 + TypeScript + Vite, Mock API: MSW, 테스트: Vitest + Testing Library

## 폴더 구조

```
src/
├── api/types.ts        # API 타입 정의
├── mocks/              # Mock 서버 (수정 금지)
├── test/setup.ts       # 테스트 환경 설정 (MSW 연결됨)
├── utils/example.*     # 테스트 작성 예시
├── App.tsx             # 여기서부터 구현
└── main.tsx
```

---

## 지원자 작성란

### 구현한 항목

필수·권장·도전 9개 항목을 모두 구현했습니다. UI는 Radix Themes(`@radix-ui/themes`)를 썼고, 그 밖의 라이브러리(상태 관리, 라우터, 쿼리, 디바운스)는 쓰지 않았습니다.

| 요구사항 | 주요 파일 | 비고 |
|---|---|---|
| 1. 슬라이드 목록 | `components/SlideTable.tsx`, `Pagination.tsx` |  |
| 2. 로딩·에러·빈 상태 | `App.tsx`, `SlideDetail.tsx` |  |
| 3. 검색 + 디바운스 | `hooks/useDebouncedValue.ts`, `hooks/useSlides.ts` |  |
| 4. 상세 보기 | `hooks/useSlide.ts`, `SlideDetail.tsx` |  |
| 5. Heatmap 오버레이 | `SlideViewer.tsx` |  |
| 6. URL 상태 동기화 | `hooks/useUrlState.ts`, `App.tsx` |  |
| 7. 재시도 | `useSlides.ts`, `useSlide.ts` |  |
| 8. 테스트 | `*.test.ts`, `.claude/skills/parallel-qa` |  |
| 9. 키보드 접근성 | `utils/cursor.ts`, `App.tsx` |  |

**화면 표시 규칙**: 모두 `utils/format.ts`의 순수 함수로 처리하고 테스트했습니다.
- KST 변환은 브라우저 타임존에 의존하지 않도록 `+9h` 후 `getUTC*`로 계산합니다.
- Ki67과 세포 수의 `0`을 "결과 없음"으로 잘못 처리하지 않도록 `=== null`로만 판단합니다(`S-2026-0010`의 Ki67 `0.0%`, 세포 수 `0 / 8,421`로 확인).

**상태 타입**: 데이터 훅의 상태는 `loading | success | error` 판별 유니온입니다. "에러인데 데이터가 있음" 같은 불가능한 조합은 타입 단계에서 막힙니다.

### 구현하지 못한 항목 / 이유

- **Heatmap 컨트롤 "비활성화" → "숨김"**: 명세는 비활성화입니다. 처음에는 비활성화로 구현했지만, heatmap이 없는 슬라이드(분석 중·실패)에서는 heatmap UI를 아예 표시하지 않도록 바꿨습니다. 명세와 다르니 확인이 필요합니다.
- **투명도 슬라이더의 접근 가능한 이름**: `aria-label`이 Radix 루트에만 붙어 있습니다. 실제 `role="slider"` 요소에는 이름이 없습니다(QA에서 발견).
- **모달을 닫은 뒤 포커스 복귀**: Esc로 닫으면 포커스가 `body`로 갑니다. 방향키는 전역 리스너로 받아서 계속 동작하지만, 스크린리더 사용자는 원래 위치를 잃습니다.
- **목록 행의 Tab 이동**: 행에 포커스를 주는 방식을 한 번 시도했지만, 포커스 테두리가 거슬려서 전역 방향키 방식으로 바꿨습니다. 그래서 Tab으로는 행에 갈 수 없습니다.
- **좁은 화면(375px)의 목록**: 표 헤더와 ID·날짜가 줄바꿈되고, 모바일용 목록 레이아웃은 따로 만들지 않았습니다.
- **알려진 충돌**: 마우스로 누른 페이지 버튼에 포커스가 남은 상태에서 Enter를 누르면, 페이지가 넘어가지 않고 커서 위치의 슬라이드가 열립니다.

### 폴더 구조 (구현 후)

```
src/
├── api/client.ts            # fetch 래퍼 (!res.ok → ApiRequestError)
├── hooks/
│   ├── useSlides.ts         # 목록 요청 (abort, 이전 데이터 유지, retry)
│   ├── useSlide.ts          # 상세 요청
│   ├── useDebouncedValue.ts # 디바운스 (직접 구현)
│   └── useUrlState.ts       # URL ↔ 상태 (pushState/popstate)
├── components/              # SlideTable, Pagination, SlideDetail, SlideViewer, StatusBadge
├── utils/
│   ├── format.ts            # 마스킹, KST, Ki67, 세포 수, 상태 한글
│   └── cursor.ts            # 키보드 커서 이동 계산
└── App.tsx
```

### 시간이 더 있었다면

-
