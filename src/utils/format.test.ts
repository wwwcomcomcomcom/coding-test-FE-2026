import { describe, expect, it } from 'vitest';
import { formatCellCounts, formatCount, formatKi67, formatKST, maskName } from './format';

describe('maskName', () => {
  it('세 글자 이상은 첫·마지막 글자를 제외하고 마스킹한다', () => {
    expect(maskName('홍길동')).toBe('홍*동');
    expect(maskName('남궁민수')).toBe('남**수');
  });

  it('두 글자는 두 번째 글자를 마스킹한다', () => {
    expect(maskName('김민')).toBe('김*');
  });
});

describe('formatKST', () => {
  it('UTC를 KST로 변환하고 날짜가 넘어가는 경우를 처리한다', () => {
    expect(formatKST('2026-09-01T16:30:00Z')).toBe('2026-09-02 01:30');
  });
});

describe('formatKi67', () => {
  it('소수점 첫째 자리까지 표시한다', () => {
    expect(formatKi67(41.16)).toBe('41.2%');
  });

  it('0은 결과 없음이 아니라 0.0%로 표시한다', () => {
    expect(formatKi67(0)).toBe('0.0%');
  });

  it('null이면 분석 결과 없음을 표시한다', () => {
    expect(formatKi67(null)).toBe('분석 결과 없음');
  });
});

describe('formatCount', () => {
  it('천 단위 구분 기호를 붙인다', () => {
    expect(formatCount(30321)).toBe('30,321');
    expect(formatCount(0)).toBe('0');
  });
});

describe('formatCellCounts', () => {
  it('양성 / 전체 세포 수를 천 단위 구분해 표시한다', () => {
    expect(formatCellCounts(12480, 30321)).toBe('12,480 / 30,321');
  });

  it('양성 세포 0은 결과 없음이 아니라 0으로 표시한다', () => {
    expect(formatCellCounts(0, 8421)).toBe('0 / 8,421');
  });

  it('null이면 분석 결과 없음을 표시한다', () => {
    expect(formatCellCounts(null, null)).toBe('분석 결과 없음');
  });
});
