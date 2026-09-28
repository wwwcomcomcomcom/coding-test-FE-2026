import type { SlideStatus } from '../api/types';

/** 첫 글자·마지막 글자를 제외하고 마스킹. 두 글자 이름은 두 번째 글자를 마스킹 */
export function maskName(name: string) {
  const chars = Array.from(name);
  if (chars.length <= 1) return name;
  if (chars.length === 2) return `${chars[0]}*`;
  return chars[0] + '*'.repeat(chars.length - 2) + chars[chars.length - 1];
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * UTC ISO 문자열 → KST `YYYY-MM-DD HH:mm`
 * KST는 서머타임이 없으므로 +9시간 후 UTC getter로 읽으면 브라우저 타임존과 무관하게 동작한다.
 */
export function formatKST(iso: string) {
  const d = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatKi67(value: number | null) {
  return value === null ? '분석 결과 없음' : `${value.toFixed(1)}%`;
}

export function formatCount(value: number) {
  return value.toLocaleString('ko-KR');
}

/** 양성 세포 수 / 전체 세포 수. 0은 값이므로 `=== null`로만 결과 없음을 판단한다 */
export function formatCellCounts(positive: number | null, total: number | null) {
  if (positive === null || total === null) return '분석 결과 없음';
  return `${formatCount(positive)} / ${formatCount(total)}`;
}

export const STATUS_LABEL: Record<SlideStatus, string> = {
  completed: '완료',
  processing: '분석 중',
  failed: '실패',
};
