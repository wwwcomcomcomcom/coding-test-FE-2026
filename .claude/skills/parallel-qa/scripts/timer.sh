#!/usr/bin/env bash
# QA_HARD_STOP까지 기다렸다가 끝난다. 오케스트레이터가 run_in_background로 실행하면 끝날 때 깨어나 남은 에이전트를 멈춘다.
# 사용법: timer.sh <QA_OUT>
source "$1/env.sh"
WAIT=$((QA_HARD_STOP - $(date +%s)))
[ "$WAIT" -gt 0 ] && sleep "$WAIT"
echo "HARD STOP reached at $(date +%H:%M:%S). Stop any agent still running, then aggregate."
