# Playwright harness (`scripts/pw.mjs`)

Every agent writes plain Node scripts that import the harness and run them with Bash.
Each run launches its **own** headless Chrome. That is why we use scripts instead of the Playwright MCP
server: MCP tools share one browser across all agents, and ten agents clicking in one browser would
break each other.

## Running

```bash
source "$QA_OUT/env.sh"                      # QA_BASE_URL, QA_OUT, QA_DEADLINE, QA_PW, ...
mkdir -p "$QA_OUT/$AGENT_ID"
# write $QA_OUT/$AGENT_ID/test.mjs, then:
QA_AGENT=$AGENT_ID node "$QA_OUT/$AGENT_ID/test.mjs"
```

Bash does not keep variables between calls, so repeat `source "$QA_OUT/env.sh"` (with the literal
path) in every command. The script gets killed after 90s, or sooner if the deadline is near. It will
not start at all with less than 15s left (exit 3 prints `DEADLINE`). When you see that, write your report
and stop testing.

```js
import { runTest } from '/abs/path/from/$QA_PW/pw.mjs';   // paste the literal $QA_PW value

await runTest(async (t) => {
  await t.open('/?q=홍길동');
  const ids = t.page.getByRole('rowheader', { name: /S-2026-/ });
  await ids.first().waitFor();
  t.check('검색 결과 있음', (await ids.count()) > 0, await ids.count());
  await t.shot('search-hong');
}, { stable: true });
```

The summary prints `PASS/FAIL` per check, console errors and warnings, how many API calls went out,
and the time left. Each run also appends to `$QA_OUT/$AGENT_ID/runs.jsonl`.

## API

| Member | Purpose |
|---|---|
| `t.page`, `t.context`, `t.browser` | Playwright objects (playwright-core 1.55, system Chrome) |
| `t.open(pathAndQuery)` | goto `QA_BASE_URL + path` and wait until React has rendered |
| `t.check(name, ok, detail)` | record a PASS/FAIL. Never throws, so later checks keep running |
| `t.shot(name, {fullPage})` | screenshot to `$QA_OUT/$AGENT_ID/<name>.png`. Open it with Read to look at it |
| `t.fault({match, status, delayMs, times})` | the next matching `/api/` calls get delayed and/or answered with `status`. `match` is a substring (`'/api/slides/'` = detail, `'/api/slides?'` = list) or a RegExp. `times` defaults to 1, `Infinity` = every call. Survives reloads |
| `t.clearFaults()` | remove all pending faults |
| `t.apiCalls` | live array `{t, url, aborted}` of the app's API calls. `aborted: true` means the request was cancelled before it reached the mock |
| `t.api(path)` | raw GET through the mock, bypassing the hook and retrying 500s → `{status, body}`. Use it as the **oracle** for expected data |
| `t.aria(selector)` | ARIA snapshot text. The quickest way to find roles and names for locators |
| `t.note(msg)`, `t.sleep(ms)`, `t.remaining()` | misc |

Options for `runTest`: `stable` (default `true`), `viewport` (default 1280×800), `colorScheme` (`'dark'`).

## Things that cause false positives here

- **Random 500s and latency.** The mock fails 10% of calls and delays list calls 200–600ms (+900ms
  for 1-char queries) and detail calls 200–1200ms. `stable: true` retries those random 500s
  transparently, so a failure you see comes from the app, not bad luck. Use `stable: false` only to
  watch the app deal with real flakiness. Use `t.fault` for errors you need to happen every time.
  With stable mode on, the console still logs `Failed to load resource … 500` for the retried calls.
  Ignore those. A 404 for a favicon is noise too.
- **StrictMode.** In dev, every effect runs twice, so each fetch shows up once with `aborted: true`
  and once for real. Count only `!c.aborted` calls when you judge debounce or request counts.
- **Skeleton rows.** While loading, placeholder rows have the same roles as data rows. Wait for real
  data (e.g. `getByRole('rowheader', { name: /S-2026-/ })`) before clicking or counting.
- **Timezone.** The browser runs in `America/New_York` on purpose. The spec requires KST output no
  matter where the viewer is. If you need to compare, set `QA_TZ=Asia/Seoul` on a run. A value that
  is correct only in Seoul is a real bug.
- **Your oracle must be independent.** Compute expected values from `t.api(...)` data plus the
  PROBLEM.md rules in your own test code. Never import `src/utils/*`. That is the code under test.
- A selector timeout is almost always a problem in your script. Look at the auto-saved
  `uncaught.png` and `t.aria()` before you report it as an app bug.
