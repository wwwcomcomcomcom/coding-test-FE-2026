# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 문맥

프론트엔드 신입 코딩테스트(150분): 병리 슬라이드 AI 분석 결과 뷰어. 요구사항·API 명세·화면 표시 규칙은 @PROBLEM.md 가 단일 기준이다.
평가 기준은 "AI 코드를 이해·검증했는가"이므로, 지원자가 한 줄씩 설명할 수 있는 단순한 코드를 우선한다. 라이브러리 추가 시 이유를 남긴다.

- 스택: React 19 + TS + Vite 8, UI는 **Radix Themes** (`@radix-ui/themes`, `@radix-ui/react-icons`는 미설치). 상태관리·라우터·쿼리 라이브러리 없음.
- `src/mocks/` 는 **절대 수정 금지** (면접관 지시가 있을 때만).
- 현장에서 15분짜리 추가 요구사항이 나온다. 유력 후보: `mockConfig.apiVersion = 2` (`patientName` → `patient: { name }`), 숨은 `status` 필터 파라미터(잘못된 값이면 400).

## Mock 서버 함정 (`src/mocks/handlers.ts`)

- 목록 지연 200~600ms, **검색어가 1글자면 +900ms** → 늦게 온 응답이 최신 결과를 덮어쓰는 경쟁 상태. 요청은 항상 AbortController + `signal.aborted` 체크.
- 상세 지연 200~1200ms → 빠르게 다른 행을 선택할 때도 같은 처리 필요.
- 목록·상세 모두 10% 확률로 500 → 에러 UI + 재시도 필수.
- 범위 밖 page는 `items: []`(total은 그대로), 없는 id는 404.
- 심어둔 데이터: `S-2026-0010` 홍길동 Ki67 `0`/양성 세포 `0` (falsy 체크 금지, `=== null` 사용), 두 글자 이름 김민·이안, 네 글자 이름 남궁민수·선우정아·독고영재, 동명이인 존재(key는 항상 `id`). 57건 중 28건이 UTC 15시 이후라 KST 변환 시 날짜가 바뀐다.

## 코드 규칙

- 표시 포맷은 `src/utils/format.ts`의 순수 함수만 사용(마스킹, KST, Ki67, 천 단위 구분, 상태 한글). KST는 브라우저 타임존에 의존하지 않게 `+9h` 후 `getUTC*`로 계산.
- 요청은 `src/api/client.ts`(`!res.ok`이면 `ApiRequestError(status)` throw), 데이터 훅은 `src/hooks/`의 `useSlides` 패턴(abort, 이전 데이터 유지, `retry`)을 따른다. 상태는 `status`로 구분하는 유니온 타입(`loading | success | error`)으로 두어 불가능한 조합(에러+데이터 등)을 타입에서 막는다.
- 디바운스는 직접 구현한 `useDebouncedValue`를 쓴다(요구사항이므로 라이브러리 금지). 검색어가 바뀌면 page는 디바운스된 값 기준으로 1로 초기화.

## 검증

- `npm run typecheck && npm test` 는 변경마다 실행. 테스트는 `src/test/setup.ts`가 MSW node 서버를 연결하고 지연·에러를 끈 상태다.
- 화면 확인: `npx vite --port 5199 --open false`로 띄운 뒤 `npx -y playwright@1.55.0 screenshot --channel chrome --wait-for-timeout=3500 <url> <file>`. Chrome `--headless --virtual-time-budget`은 MSW 서비스 워커가 안 떠서 빈 화면이 찍힌다. 확인 후 서버 종료.

## 기록 (작업 후 필수)

- `history/`에는 hook(`.claude/hooks/log-history.sh`)이 대화를 자동으로 쌓는다. 직접 수정하지 않는다.
- **코드를 바꾸는 작업을 마칠 때마다** `.AI_LOG.md`(gitignore된 개인 초안, 제출용 `AI_LOG.md`와 별개)의 해당 세션 섹션에 항목을 덧붙인다. 지우거나 다시 쓰지 말고 append만 한다. 형식:

  ```
  ### HH:mm — <작업 한 줄 요약>
  - 프롬프트: <사용자 요청 요지>
  - AI 결과물: <만든/바꾼 파일과 핵심 내용>
  - AI가 스스로 고친 부분: <첫 구현에서 바꾼 것과 이유> (없으면 생략)
  - 사용자가 직접 고친 부분: <사용자가 수정한 파일·내용과 이유 추정> (없으면 생략)
  - 의심/검증: <틀렸거나 확인이 필요했던 점, 검증 방법>
  ```

- 세션 섹션 제목은 `## YYYY-MM-DD 세션 <세션ID 앞 8자리>`. `.AI_LOG.md` 맨 위 "사용한 도구 / 설치한 라이브러리와 이유" 목록도 바뀌면 갱신한다.
- 목적은 제출용 `AI_LOG.md`(템플릿: 사용한 도구, 주요 프롬프트, AI 결과물을 직접 수정한 부분, AI 답이 틀렸던 순간)를 쉽게 채우는 것이다. 제출용 `AI_LOG.md`는 사용자가 요청할 때만 수정한다.
