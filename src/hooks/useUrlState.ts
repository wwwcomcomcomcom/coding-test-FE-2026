import { useCallback, useEffect, useState } from 'react';

/** URL 쿼리에 담는 화면 상태: ?q=검색어&page=페이지&id=선택한 슬라이드 */
export interface UrlState {
  q: string;
  page: number;
  selectedId: string | null;
}

/** location.search 문자열을 화면 상태로 바꾼다. 없거나 잘못된 값은 기본값으로 */
export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const page = Number(params.get('page'));
  return {
    q: params.get('q')?.trim() ?? '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    selectedId: params.get('id') || null,
  };
}

/** 화면 상태를 location.search 문자열로 바꾼다. 기본값은 URL에 쓰지 않는다 */
export function toSearch({ q, page, selectedId }: UrlState) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page !== 1) params.set('page', String(page));
  if (selectedId) params.set('id', selectedId);
  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * 검색어·페이지·선택한 슬라이드를 URL과 맞춘다.
 * - 상태가 바뀌면 pushState로 새 기록을 남긴다 (뒤로 가기로 이전 화면에 돌아갈 수 있게)
 * - 잘못된 값을 고치는 경우는 replace: true로 replaceState를 써서 잘못된 URL을 기록에 남기지 않는다
 * - 뒤로/앞으로 가기(popstate)를 하면 URL을 다시 읽어 상태를 바꾼다
 */
export function useUrlState() {
  // 기록을 새로 쌓을지(push) 현재 기록을 바꿀지(replace)를 상태와 함께 둔다.
  // 처음 읽은 URL과 popstate로 읽은 URL은 replace라서, ?page=0처럼 parseUrlState가 고친 값은
  // 기록을 늘리지 않고 주소창에서도 고쳐진다. 요청은 처음부터 고친 값(page 1)으로 나간다.
  const [entry, setEntry] = useState(() => ({ state: parseUrlState(window.location.search), replace: true }));

  useEffect(() => {
    const onPopState = () => setEntry({ state: parseUrlState(window.location.search), replace: true });
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    // URL이 이미 같으면(popstate로 들어온 올바른 URL, 같은 행 재클릭) 기록을 건드리지 않는다
    const search = toSearch(entry.state);
    if (search === window.location.search) return;
    const url = window.location.pathname + search;
    if (entry.replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }, [entry]);

  const setState = useCallback(
    (state: UrlState, { replace = false } = {}) => setEntry({ state, replace }),
    [],
  );

  return [entry.state, setState] as const;
}
