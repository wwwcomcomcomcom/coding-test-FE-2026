import { useCallback, useEffect, useState } from 'react';
import { fetchSlide } from '../api/client';
import type { SlideDetail } from '../api/types';

export type SlideState =
  | { status: 'loading' }
  | { status: 'success'; data: SlideDetail }
  | { status: 'error'; error: Error };

/**
 * 슬라이드 상세 조회. useSlides와 같은 패턴(abort, 늦은 응답 무시, retry).
 * 다른 슬라이드를 고르면 호출하는 쪽에서 key로 다시 마운트하므로 이전 데이터를 들고 있을 필요가 없다.
 */
export function useSlide(id: string) {
  const [state, setState] = useState<SlideState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetchSlide(id, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ status: 'success', data });
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error });
      });

    return () => controller.abort();
  }, [id, retryCount]);

  const retry = useCallback(() => setRetryCount((n) => n + 1), []);

  return { state, retry };
}
