import { useCallback, useEffect, useState } from 'react';
import { fetchSlides } from '../api/client';
import type { SlideListResponse } from '../api/types';

/**
 * 가능한 상태만 표현한다. 에러와 데이터가 함께 있거나, 성공인데 데이터가 없는 조합은 타입에서 막힌다.
 * 로딩 중에만 직전 결과(previous)를 들고 있어서 페이지 이동·검색 중에도 표가 깜빡이지 않는다.
 */
export type SlidesState =
  | { status: 'loading'; previous: SlideListResponse | null }
  | { status: 'success'; data: SlideListResponse }
  | { status: 'error'; error: Error };

/** 화면에 보여 줄 목록: 성공 결과, 로딩 중이면 직전 결과, 에러면 없음 */
export function displayedData(state: SlidesState) {
  if (state.status === 'success') return state.data;
  if (state.status === 'loading') return state.previous;
  return null;
}

export function useSlides(q: string, page: number) {
  const [state, setState] = useState<SlidesState>({ status: 'loading', previous: null });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ status: 'loading', previous: displayedData(prev) }));

    fetchSlides({ q, page }, controller.signal)
      .then((data) => {
        // 이미 다음 요청으로 넘어갔다면 늦게 도착한 응답은 버린다
        if (controller.signal.aborted) return;
        setState({ status: 'success', data });
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });

    return () => controller.abort();
  }, [q, page, retryCount]);

  const retry = useCallback(() => setRetryCount((n) => n + 1), []);

  return { state, retry };
}
