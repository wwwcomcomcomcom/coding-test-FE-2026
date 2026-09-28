import { describe, expect, it } from 'vitest';
import { nextCursor } from './cursor';

const ids = ['A', 'B', 'C'];

describe('nextCursor', () => {
  it('같은 페이지 안에서는 위아래 행으로 옮긴다', () => {
    expect(nextCursor(ids, 'B', 1, 2, 3)).toEqual({ type: 'row', id: 'C' });
    expect(nextCursor(ids, 'B', -1, 2, 3)).toEqual({ type: 'row', id: 'A' });
  });

  it('커서가 이 페이지에 없으면 ↓는 첫 행, ↑는 마지막 행에 놓는다', () => {
    expect(nextCursor(ids, null, 1, 2, 3)).toEqual({ type: 'row', id: 'A' });
    expect(nextCursor(ids, 'Z', -1, 2, 3)).toEqual({ type: 'row', id: 'C' });
  });

  it('페이지 끝에서는 옆 페이지로 넘기고 도착할 끝을 알려 준다', () => {
    expect(nextCursor(ids, 'C', 1, 2, 3)).toEqual({ type: 'page', page: 3, at: 'first' });
    expect(nextCursor(ids, 'A', -1, 2, 3)).toEqual({ type: 'page', page: 1, at: 'last' });
  });

  it('첫 페이지의 첫 행에서 ↑, 마지막 페이지의 마지막 행에서 ↓는 움직이지 않는다', () => {
    expect(nextCursor(ids, 'A', -1, 1, 3)).toBeNull();
    expect(nextCursor(ids, 'C', 1, 3, 3)).toBeNull();
  });

  it('행이 없으면 움직이지 않는다', () => {
    expect(nextCursor([], null, 1, 1, 1)).toBeNull();
  });
});
