# Agent roster

Feature agents map one to one onto the requirements in PROBLEM.md §3. Each also owns the §4 display
rules that show up in its screen area. PROBLEM.md is the source of truth. The probes below are the
edge cases most likely to break, not the whole list. Read the requirement text yourself too.

Requirement 8 (test code) is not a browser feature. The orchestrator runs `npm run typecheck && npm test`
for it.

Mock data you can rely on (seeded, the same every run): 57 slides. `S-2026-0010` has Ki67 `0` and
0 positive cells. There are 2-letter names (김민, 이안), 4-letter names (남궁민수, 선우정아, 독고영재),
and patients who share a name. About half of `examinedAt` values are after 15:00 UTC, so the KST date
is the next day.

---

## F1-list: 슬라이드 목록 (§3-1, §4 환자명·검사일시·분석 상태)
- Columns: thumbnail (the image really loads: `naturalWidth > 0`), slide ID, patient name, exam time, status.
- 20 rows per page, pagination works (next, prev, direct page). Last page = 57 − 40 = 17 rows. Sorted by exam time, newest first.
- For every row on at least 2 pages, compare with `t.api('/api/slides?page=N')`:
  masking (홍길동→홍*동, 김민→김*, 남궁민수→남**수), KST `YYYY-MM-DD HH:mm` including date rollover, status in Korean.
- Shared names don't break rendering. Look for React duplicate-key warnings in the console summary.

## F2-states: 로딩·에러·빈 상태 (§3-2)
- A loading indicator is visible while the list loads (`t.fault({match:'/api/slides?', delayMs:2000})`) and while the detail loads.
- List 500 (`times: Infinity`): an error message appears, the layout stays intact, the search box still works, and there is no `pageerror`.
- Detail 500 and detail 404 (`/?id=S-9999-9999` or whatever the app's URL param is): a clear message in the detail area, and the list stays usable.
- No results (`zzzz`): an empty-state message that is **not** the error UI.
- Out-of-range page (`page=99`): no blank screen. It should be corrected or explained.

## F3-search: 검색 + 디바운스 (§3-3)
- Partial match on slide ID (`0010`, `S-2026-00`) and on patient name (full, partial, 2-letter). Every result must really match (check with `t.api`).
- Debounce: type 6 characters with `pressSequentially(..., {delay: 60})` → only ~1 list request goes out after typing stops, and none until ≈300ms of idle. Count only non-aborted calls.
- Race condition: type 1 character (the mock adds +900ms), then quickly finish the word. After everything settles (~2.5s), the rows must match the **final** query, not the 1-character one. Repeat 2–3 times. For a deterministic case, delay the first list call with `t.fault`.
- Changing the query from page 2 goes back to page 1. Clearing the query brings back the full list (57).

## F4-detail: 상세 보기 (§3-4, §4 Ki67·세포 수·분석 완료 일시)
- Selecting a row shows the slide image, patient name (masked), exam time (KST), status, Ki67, positive/total cells, and analysis time (KST). Compare with `t.api('/api/slides/<id>')`.
- Ki67 has 1 decimal (`41.16`→`41.2%`), cells use thousands separators (`12,480 / 30,321`).
- A non-completed slide shows Ki67 as `분석 결과 없음`. No `null`, `NaN`, `Invalid Date` or `undefined` anywhere.
- `S-2026-0010`: Ki67 `0` → `0.0%`, cells `0 / N`. It must NOT show `분석 결과 없음`. This is the classic falsy-check bug.
- Race condition: `t.fault({match:'/api/slides/', delayMs:2500})`, select row A, then quickly row B → the final panel shows B, never A.

## F5-heatmap: Heatmap 오버레이 (§3-5)
- On a completed slide the heatmap image sits on top of the slide image (the bounding boxes overlap, and it really loads).
- The on/off toggle hides and shows it. The opacity slider covers 0–100%: drive it with the keyboard (Home/End/arrows) and check the computed `opacity` (0 and 1 at the ends) and the label.
- On a slide without a heatmap (processing/failed) the spec says the controls are **disabled**. Hidden instead of disabled is a spec deviation. Report it as "명세와 다름, 확인 필요", not as a crash.
- Switching between slides: the controls and the overlay stay consistent, and no heatmap from the previous slide is left behind.

## F6-url: URL 상태 동기화 (§3-6)
- Search, page and selection each show up in the query string.
- Reload → the same query in the input, the same page, the same slide open.
- Open the URL in a **fresh page/context** (sharing) → same view.
- Back/forward steps through states sensibly.
- Garbage params (`page=abc`, `page=0`, `page=-1`, `page=999`, unknown id, very long or encoded `q`): no crash, sensible fallback.

## F7-retry: 재시도 (§3-7)
- List fails once (`t.fault` status 500, times 1) → a retry button → click → the list loads, and a new request went out.
- The same for the detail panel.
- Fails twice (`times: 2`): the first retry fails again and still shows the retry option, and the second retry succeeds.

## F8-keyboard: 키보드 접근성 (§3-9)
- Tab reaches the list. ↑/↓ move a visible highlight row by row. Enter opens that slide's detail.
- Boundaries: ↑ on the first row, ↓ on the last row (whatever the app does at page edges should be sensible and not lose focus).
- Arrow keys typed in the search input don't move the list selection by accident, and typing doesn't trigger list shortcuts.
- The highlight/focus is visible (screenshot). After closing the detail (Esc or button), focus goes back to somewhere sensible.

---

## Q1-visual: UI 깨짐 탐색 (autonomous)
Lens: does anything look broken? Viewports 375×812, 768×1024, 1280×800 and 1920×1080. Look for
horizontal page scroll, clipped or overlapping text, long names and IDs in cells, image distortion,
a detail view that doesn't fit or can't scroll on small screens, layout shift between loading, data,
error and empty states, dark `colorScheme`, 200% zoom (`page.evaluate(() => document.body.style.zoom = '2')`),
and z-index/overlay problems. Look at the screenshots yourself with Read. Your eyes are the test.

## Q2-usability: 사용성 탐색 (autonomous)
Lens: a pathologist trying to get work done. Do real tasks: find 홍길동's slides and compare their
Ki67, check the heatmap on a completed slide, share a view with a colleague, work on a slow network
(`delayMs`) and a flaky one (`stable:false`). Judge feedback during waits, message clarity (Korean,
actionable), whether disabled states are understandable, click targets, focus handling in the detail
view (Esc, focus trap, focus return), tab order, labels on inputs and sliders, rapid double-clicks and
spammed pagination, flicker, and lost state.
