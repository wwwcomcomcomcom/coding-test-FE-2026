# parallel-qa agent guide

You are one of about ten agents testing the same running app at the same time. Each agent owns one
area. The whole run has a hard 10-minute budget. The orchestrator stops agents that are still running
at the hard stop. Whatever is in your report file by then is all that counts.

## Ground rules

- **Report only.** Never edit `src/`, config, or anything outside `$QA_OUT/<your-id>*`. Don't start
  another dev server, install packages, or use Playwright MCP tools (that browser is shared with the
  other agents).
- **Time.** Start every Bash command with `source <QA_OUT>/env.sh;` and check the time left with
  `echo $((QA_DEADLINE - $(date +%s)))s`. Plan for about 3–4 script runs. Once less than 60s is left,
  stop testing and finish the report.
- **Accuracy over volume.** A false bug report costs more than a missed one. Before you mark something
  FAIL, rule out a script mistake (see "false positives" in `harness.md`), look at the screenshot,
  and reproduce app bugs a second time if you have time. If you're not sure, mark it `확인 필요` and
  explain why.
- **Write reports in Korean.** Quote UI text exactly.

## Workflow: feature agents (F*)

1. Read `harness.md` (same folder), your section of `features.md`, and the matching requirement in
   `PROBLEM.md`. Skim the relevant component source only to learn selectors and URL param names, and
   spend under a minute on it. Judge behavior in the browser, not by reading code.
2. Create the report file right away with `상태: IN_PROGRESS` and the checklist you plan to cover.
   A partial report beats no report.
3. Write **one** script covering all your checks (`$QA_OUT/<id>/test.mjs`) and run it. Fix script
   errors and run again. Put expensive or flaky checks last so earlier checks still record.
4. After each run, update the report. When done, set the final status.
5. Your final message is 3 lines at most: status, number of problems, report path. The report file
   holds the details.

## Workflow: explorer agents (Q*)

Nobody gives you a checklist. Decide what to probe inside your lens (`features.md`) and adapt as you
learn. Good loop: script a batch of states and viewports → take screenshots → **look at them with
Read** → dig into anything suspicious with a targeted run. Aim for about 4 runs. Record each finding
with the viewport, the steps and the screenshot path. Also list what you checked that looked fine,
so the reader knows the coverage. Don't re-test the feature checklists. The F agents cover those.

## Report file: `$QA_OUT/<id>.md`

```markdown
# <id> — <영역 이름>
상태: PASS | FAIL | PARTIAL | IN_PROGRESS
(FAIL = 앱 문제 1개 이상 / PARTIAL = 시간 부족으로 일부 미확인 / 둘 다면 FAIL)
실행: 스크립트 N회

## 확인 결과
| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 두 글자 이름 마스킹 (김민→김*) | PASS | 2페이지 S-2026-00xx |
| 2 | Ki67 0 표시 | FAIL | "분석 결과 없음" 표시됨, detail-0010.png |

## 발견한 문제
### [높음] <한 줄 요약>
- 재현: 1) ... 2) ...
- 기대: ... / 실제: ...
- 근거: <screenshot path>, <api calls or console line>
- 재현 횟수: 2/2
- 관련 요구사항: PROBLEM.md §3-4 / §4

## 확인하지 못한 것
- ...
```

Severity (심각도):
- **치명**: crash or blank screen, requirement missing, wrong data shown (another patient's slide, stale results).
- **높음**: a §4 display rule violated, a race condition that shows stale data, an error with no way to recover.
- **보통**: edge-case misbehavior, accessibility gaps, a spec deviation to confirm.
- **낮음**: cosmetic, suggestions.
