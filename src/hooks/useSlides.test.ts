import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/node';
import { displayedData, useSlides } from './useSlides';

describe('useSlides', () => {
  it('처음에는 이전 데이터 없이 로딩하고, 응답이 오면 success가 된다', async () => {
    const { result } = renderHook(() => useSlides('', 1));
    expect(result.current.state).toEqual({ status: 'loading', previous: null });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(displayedData(result.current.state)?.items).toHaveLength(20);
  });

  it('페이지를 바꾸면 로딩 중에도 직전 결과를 previous로 유지한다', async () => {
    const { result, rerender } = renderHook(({ page }) => useSlides('', page), { initialProps: { page: 1 } });
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    const firstPage = displayedData(result.current.state);

    rerender({ page: 2 });
    expect(result.current.state).toEqual({ status: 'loading', previous: firstPage });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(displayedData(result.current.state)?.page).toBe(2);
  });

  it('에러가 나면 데이터 없이 error 상태가 된다', async () => {
    server.use(http.get('/api/slides', () => HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 })));
    const { result } = renderHook(() => useSlides('', 1));

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(displayedData(result.current.state)).toBeNull();
  });
});
