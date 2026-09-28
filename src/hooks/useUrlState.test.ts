import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { parseUrlState, toSearch, useUrlState } from './useUrlState';

describe('parseUrlState / toSearch', () => {
  it('URL 쿼리를 읽고, 같은 상태를 다시 쿼리로 만든다', () => {
    const state = parseUrlState('?q=%ED%99%8D&page=2&id=S-2026-0010');
    expect(state).toEqual({ q: '홍', page: 2, selectedId: 'S-2026-0010' });
    expect(parseUrlState(toSearch(state))).toEqual(state);
  });

  it('없거나 잘못된 값은 기본값으로 읽고, 기본값은 URL에 쓰지 않는다', () => {
    for (const page of ['0', '-1', '1.5', 'abc']) {
      expect(parseUrlState(`?page=${page}`).page).toBe(1);
    }
    expect(parseUrlState('')).toEqual({ q: '', page: 1, selectedId: null });
    expect(toSearch({ q: '', page: 1, selectedId: null })).toBe('');
  });
});

describe('useUrlState', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('상태를 바꾸면 pushState로 기록하고, 뒤로/앞으로 가기(popstate)를 하면 그 상태로 돌아간다', async () => {
    window.history.replaceState(null, '', '/?page=2');
    const { result } = renderHook(() => useUrlState());
    expect(result.current[0]).toEqual({ q: '', page: 2, selectedId: null });

    const historyLength = window.history.length;
    act(() => result.current[1]({ q: '', page: 3, selectedId: 'S-2026-0010' }));
    expect(window.location.search).toBe('?page=3&id=S-2026-0010');
    expect(window.history.length).toBe(historyLength + 1);

    act(() => window.history.back());
    await waitFor(() => expect(result.current[0]).toEqual({ q: '', page: 2, selectedId: null }));
    expect(window.location.search).toBe('?page=2');

    // popstate로 읽어 온 상태를 다시 push했다면 앞 기록이 사라져서 앞으로 가기가 안 된다
    act(() => window.history.forward());
    await waitFor(() => expect(result.current[0]).toEqual({ q: '', page: 3, selectedId: 'S-2026-0010' }));
    expect(window.location.search).toBe('?page=3&id=S-2026-0010');
  });

  it('잘못된 page로 들어오면 기록을 늘리지 않고 주소창을 기본값으로 고친다', () => {
    window.history.replaceState(null, '', '/?page=0&id=S-2026-0010');
    const historyLength = window.history.length;
    const { result } = renderHook(() => useUrlState());

    expect(result.current[0].page).toBe(1);
    expect(window.location.search).toBe('?id=S-2026-0010');
    expect(window.history.length).toBe(historyLength);
  });

  it('replace: true로 바꾸면 기록을 쌓지 않고 현재 기록을 바꾼다', () => {
    window.history.replaceState(null, '', '/?page=9');
    const { result } = renderHook(() => useUrlState());

    const historyLength = window.history.length;
    act(() => result.current[1]({ q: '', page: 3, selectedId: null }, { replace: true }));
    expect(window.location.search).toBe('?page=3');
    expect(window.history.length).toBe(historyLength);
  });
});
