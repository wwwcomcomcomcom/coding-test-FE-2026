---
name: parallel-qa
description: Run a parallel end-to-end QA pass on the slide viewer app in at most 10 minutes. One Sonnet subagent per PROBLEM.md requirement drives its own headless Chrome through Playwright scripts, and two autonomous QA agents hunt for usability problems and visual breakage. The result is a consolidated Korean report with severity-ranked bugs. Use this whenever the user wants to test, QA, verify or check the app in a browser, e.g. "QA 돌려줘", "기능 테스트해줘", "요구사항 다 됐는지 확인", "제출 전 점검", "UI 깨지는지 봐줘", "E2E 테스트", "화면에서 확인해줘", or after a batch of feature work when they want confidence that nothing regressed. Also use it for a subset ("검색이랑 URL만 테스트해줘").
---

# parallel-qa

Test the running app against PROBLEM.md with many agents at once, then merge what they found into
one report. **Agents report and never fix.** Fixing belongs to the user afterwards, because the
coding test grades whether the candidate understands and verifies the code.

Skill folder: `.claude/skills/parallel-qa/` (below, `$SKILL`).

## Timeline (budget 600s)

| When | Who | What |
|---|---|---|
| 0:00 | you | `setup.sh` (≈5s once cached) |
| ~0:20 | you | in **one message**: timer, unit tests, and all agents |
| 8:00 | agents | `QA_DEADLINE`: reports finalized, the harness refuses new runs |
| 8:50 | you | `QA_HARD_STOP`: the timer fires, stop any agent still running |
| ≤10:00 | you | aggregate, tear down, reply |

The deadlines are enforced mechanically (the harness caps each run, the timer wakes you) so that a
slow agent can't push the run past 10 minutes. Keep your own steps short too. Don't read the app's
source or re-test anything yourself while agents run.

## Step 1: Setup

```bash
bash .claude/skills/parallel-qa/scripts/setup.sh 600
```

It installs `playwright-core` into `~/.cache/parallel-qa` if missing, so the repo's package.json stays
untouched. It reuses the dev server on :5199 or starts one, and writes `$QA_OUT/env.sh` with
the deadlines. Note the printed `QA_OUT=` path. If it fails, report the error and stop. A QA run
without a server would only produce noise.

## Step 2: Launch everything in one message

Parallelism only happens if every call goes out in the same assistant message. Send all of these
together:

1. **Timer**: Bash, `run_in_background: true`: `bash $SKILL/scripts/timer.sh <QA_OUT>`
2. **Requirement 8 (test code)**: Bash, `run_in_background: true`:
   `npm run typecheck > <QA_OUT>/unit.log 2>&1; npm test >> <QA_OUT>/unit.log 2>&1; echo "exit=$?" >> <QA_OUT>/unit.log`
3. **One Agent call per roster entry** (`references/features.md`: F1–F8, Q1, Q2), each with
   `model: "sonnet"`, `subagent_type: "general-purpose"`, `description: "QA <id>"`. Use this prompt
   and fill in the brackets. Keep it this short: the agents read the details from files, and ten long
   prompts would eat your own time budget.

```
You are parallel-qa agent <ID> (<"feature tester" for F*, "autonomous explorer" for Q*>) for the app in <repo root>.
Read and follow <SKILL>/references/agent-guide.md. Your scope is the <ID> section of <SKILL>/references/features.md.
Env: `source <QA_OUT>/env.sh` (repeat it in every Bash call). Run scripts with QA_AGENT=<ID>.
Hard deadline: <QA_DEADLINE as HH:MM:SS> — report must be final by then: <QA_OUT>/<ID>.md
```

**Scope changes.** If the user asked about only some features, launch only those agents (plus Q1/Q2
unless they said otherwise). If an extra requirement was added on site (e.g. `apiVersion: 2`, a
`status` filter), add one more F agent for it and write its probes into the prompt.

Record each agent's name/ID from the launch results. You will need them to stop stragglers.

## Step 3: Wait

Don't poll or sleep. Agent notifications and the timer wake you. When all agents are done before the
hard stop, stop the timer (`TaskStop`) and go to step 4. When the timer fires first, load `TaskStop`
(`ToolSearch select:TaskStop`), stop every agent still running, and mark them `TIMEOUT`. Their
partial report files still count.

## Step 4: Aggregate (≈60s)

Read every `<QA_OUT>/*.md` report and `unit.log`. Write `<QA_OUT>/REPORT.md`:

```markdown
# parallel-qa 결과 — <run id>
소요 m:ss / 10:00 · 에이전트 N개 (완료 a, 시간초과 b) · 단위 테스트(요구사항 8): typecheck ✅/❌, vitest x/y

## 요구사항별 결과
| 요구사항 | 에이전트 | 결과 | 문제 |
|---|---|---|---|
| 1 슬라이드 목록 | F1-list | PASS | 0 |

## 발견한 문제 (심각도순)
| 심각도 | 영역 | 요약 | 근거 |
|---|---|---|---|

## 사용성·UI 탐색 (Q1, Q2)
- ...

## 확인하지 못한 것
- ...
```

While merging, act as a skeptical editor, not a stenographer. Merge duplicates that several agents
reported. Mark a finding `확인 필요` when it has no reproduction steps or evidence, or when it looks
like the known false positives in `references/harness.md` (random 500s, skeleton rows, StrictMode
double calls, a timezone-only assumption). Don't launch new tests to settle it. There is no time
left, and the user can rerun.

Then run `bash $SKILL/scripts/teardown.sh <QA_OUT>` (it only stops a server that setup started) and
reply to the user in Korean: the requirement table, the top problems with their evidence paths, the
total time, and the path to `REPORT.md`. Screenshots live in `<QA_OUT>/<ID>/`.

## Notes

- `.qa-runs/` is gitignored. Old runs can be deleted freely.
- This skill only reads code and writes to `.qa-runs/`, so it doesn't need a `.AI_LOG.md` entry.
  If the user then asks you to fix the bugs it found, that fix is a normal code change and gets one.
