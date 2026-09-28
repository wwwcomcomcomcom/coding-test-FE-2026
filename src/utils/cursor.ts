/** ↑/↓를 눌렀을 때 SlideCursor가 갈 곳 */
export type CursorMove =
  | { type: 'row'; id: string } // 같은 페이지의 다른 행
  | { type: 'page'; page: number; at: 'first' | 'last' } // 옆 페이지로 넘어가 그 페이지의 첫/마지막 행
  | null; // 더 갈 곳이 없음 (첫 페이지의 첫 행에서 ↑, 마지막 페이지의 마지막 행에서 ↓)

/**
 * 현재 페이지의 id 목록과 커서 위치로 다음 위치를 구한다.
 * 커서가 이 페이지에 없으면(아직 없음, 다른 페이지·검색 결과에 있음) ↓는 첫 행, ↑는 마지막 행에 놓는다.
 */
export function nextCursor(
  ids: string[],
  cursorId: string | null,
  direction: 1 | -1,
  page: number,
  totalPages: number,
): CursorMove {
  if (ids.length === 0) return null;

  const index = cursorId === null ? -1 : ids.indexOf(cursorId);
  if (index === -1) return { type: 'row', id: direction === 1 ? ids[0] : ids[ids.length - 1] };

  const next = index + direction;
  if (next >= 0 && next < ids.length) return { type: 'row', id: ids[next] };

  const nextPage = page + direction;
  if (nextPage < 1 || nextPage > totalPages) return null;
  return { type: 'page', page: nextPage, at: direction === 1 ? 'first' : 'last' };
}
