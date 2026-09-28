#!/usr/bin/env bash
# Claude Code Stop hook: 현재 세션 대화를 history/<YYYY-MM-DD>_<세션ID 8자리>.txt 로 기록한다.
# 매 턴마다 transcript(JSONL) 전체로 파일을 다시 생성하므로, 중간에 hook이 빠져도 다음 턴에 복구되고 중복도 생기지 않는다.
#
# 수동 실행: .claude/hooks/log-history.sh <transcript.jsonl>
set -euo pipefail

if [[ $# -ge 1 ]]; then
  transcript="$1"
else
  transcript="$(jq -r '.transcript_path // empty')"
fi
[[ -f "$transcript" ]] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
mkdir -p "$root/history"

render='
def ts: sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601 | strflocaltime("%Y-%m-%d %H:%M:%S");

# 사용자가 직접 입력한 프롬프트 (도구 결과, 스킬 본문 같은 메타 메시지 제외)
def is_prompt:
  .type == "user" and (.isMeta | not) and (.isCompactSummary | not)
  and ((.message.content | type) == "string"
       or ((.message.content | type) == "array" and all(.message.content[]; .type != "tool_result")));

def prompt_text:
  (.message.content | if type == "string" then . else map(select(.type == "text").text) | join("\n") end)
  | if test("<command-name>") then
      (capture("<command-name>(?<n>[^<]*)</command-name>").n)
      + ((capture("<command-args>(?<a>[\\s\\S]*)</command-args>") // {a: ""}).a | if . == "" then "" else " " + . end)
    else . end;

def tool_line:
  "[tool] " + .name
  + ((.input.file_path // .input.command // .input.skill // .input.description // .input.url // "")
     | tostring | split("\n")[0] | .[0:120] | if . == "" then "" else " " + . end);

# 턴 안에서 기록할 항목: Claude 텍스트, 도구 호출 요약, 질문에 대한 사용자 답변
def turn_part:
  if .type == "assistant" then
    (.message.content[]? | if .type == "text" then .text elif .type == "tool_use" then tool_line else empty end)
  elif .type == "user" and (.toolUseResult | type) == "object" and .toolUseResult.answers != null then
    (.toolUseResult.answers | to_entries[] | "[answer] " + .key + " → " + .value)
  else empty end;

[.[] | select((.isSidechain // false) | not) | select(.type == "user" or .type == "assistant")] as $e
| [$e | to_entries[] | select(.value | is_prompt) | .key] as $idx
| range(0; $idx | length) as $n
| $e[$idx[$n]] as $p
| $e[($idx[$n] + 1):($idx[$n + 1] // ($e | length))] as $rest
| [$rest[] | turn_part] as $parts
| ([$rest[] | select(.type == "assistant") | .timestamp] | last) as $last
| "==================== [\($p.timestamp | ts)] USER ====================\n"
  + ($p | prompt_text) + "\n"
  + (if ($parts | length) > 0
     then "\n-------------------- [\($last | ts)] CLAUDE --------------------\n" + ($parts | join("\n\n")) + "\n"
     else "" end)
  + "\n"
'

session="$(basename "$transcript" .jsonl)"
first_ts="$(jq -rn 'first(inputs | select(.timestamp != null) | .timestamp)' "$transcript")"
day="$(jq -rn --arg t "$first_ts" '$t | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601 | strflocaltime("%Y-%m-%d")')"
out="$root/history/${day}_${session:0:8}.txt"

tmp="$(mktemp "$root/history/.tmp.XXXXXX")"
jq -rs "$render" "$transcript" > "$tmp"
mv "$tmp" "$out"
