import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Box, Button, Callout, Card, Dialog, Flex, Heading, Spinner, Text, TextField } from '@radix-ui/themes';
import { PAGE_SIZE } from './api/client';
import { Pagination } from './components/Pagination';
import { SlideDetail } from './components/SlideDetail';
import { SlideTable } from './components/SlideTable';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { displayedData, useSlides } from './hooks/useSlides';
import { useUrlState } from './hooks/useUrlState';
import { nextCursor } from './utils/cursor';

export default function App() {
  // 검색어(디바운스된 값)·페이지·선택한 슬라이드는 URL이 기준이다
  const [url, setUrl] = useUrlState();
  // 입력창 글자는 타이핑마다 바뀌므로 따로 둔다
  const [query, setQuery] = useState(url.q);
  const selectedId = url.selectedId;

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  // 디바운스된 검색어가 바뀌면 URL에 반영하면서 1페이지로 되돌린다.
  // 결과가 줄어들면 현재 페이지가 범위를 벗어날 수 있기 때문.
  // q와 page를 한 번에 바꿔서 "새 검색어 + 이전 페이지" 요청이나 기록이 생기지 않게 한다.
  const [prevDebouncedQuery, setPrevDebouncedQuery] = useState(debouncedQuery);
  if (prevDebouncedQuery !== debouncedQuery) {
    setPrevDebouncedQuery(debouncedQuery);
    if (debouncedQuery !== url.q) setUrl({ ...url, q: debouncedQuery, page: 1 });
  }

  // 뒤로/앞으로 가기로 URL의 검색어가 바뀌면 입력창도 그 값으로 되돌린다.
  // 직접 입력해서 바뀐 경우는 이미 같은 값이므로 건드리지 않는다 (뒤쪽 공백이 지워지지 않게 trim해서 비교).
  const [prevUrlQuery, setPrevUrlQuery] = useState(url.q);
  if (prevUrlQuery !== url.q) {
    setPrevUrlQuery(url.q);
    if (query.trim() !== url.q) setQuery(url.q);
  }

  // 모달을 닫으면 selectedId는 바로 null이 되지만 닫히는 애니메이션은 조금 더 이어진다.
  // 그동안 내용이 비어 모달이 쪼그라들지 않도록 마지막으로 연 id를 기억해 둔다.
  const [dialogId, setDialogId] = useState<string | null>(null);
  if (selectedId !== null && selectedId !== dialogId) {
    setDialogId(selectedId);
  }

  // SlideCursor: 목록에서 파랗게 표시되는 행. 키보드(↑/↓)로 옮기고 Enter로 연다. URL에는 넣지 않는다.
  // 선택(클릭, Enter, URL의 id)하면 그 슬라이드로 옮기고, 모달을 닫아 선택이 풀려도 그대로 둔다.
  // id로 기억하므로 페이지·검색 결과가 바뀌어 그 행이 안 보이면 커서도 안 보인다.
  const [cursorId, setCursorId] = useState(selectedId);
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (prevSelectedId !== selectedId) {
    setPrevSelectedId(selectedId);
    if (selectedId !== null) setCursorId(selectedId);
  }
  const searchRef = useRef<HTMLInputElement>(null);
  // 키보드로 옆 페이지로 넘어갈 때, 새 페이지 목록이 오면 커서를 놓을 자리
  const [pendingCursor, setPendingCursor] = useState<'first' | 'last' | null>(null);

  const { state: list, retry } = useSlides(url.q, url.page);
  const isLoading = list.status === 'loading';
  const data = displayedData(list);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // 지금 URL로 보낸 요청의 결과인지. URL이 막 바뀐 렌더에서는 list가 아직 이전 요청의 결과다
  const isCurrent = list.status === 'success' && list.params.q === url.q && list.params.page === url.page;

  // URL의 page가 마지막 페이지보다 크면(공유받은 URL, 직접 입력 등) 마지막 페이지로 고친다.
  // 범위 밖이면 mock은 total만 주고 items는 비워서 보내므로, 응답을 받아야 마지막 페이지를 안다.
  // URL이 막 바뀐 렌더에서는 list가 아직 이전 요청의 결과라서, 지금 URL로 보낸 요청의 결과인지 먼저 확인한다.
  // 잘못된 URL을 기록에 남기지 않도록 replace로 바꾼다.
  if (isCurrent && url.page > totalPages) {
    setUrl({ ...url, page: totalPages }, { replace: true });
  }

  // 키보드로 다룰 수 있는 행: 지금 URL의 결과만. 로딩 중에 흐리게 보이는 직전 페이지나,
  // 범위 밖 page를 고치기 전의 빈 목록에서는 움직이지 않는다 (고치기 전의 page로 옆 페이지를 계산하지 않게)
  const currentItems = isCurrent && list.data.items.length > 0 ? list.data.items : null;

  // 옆 페이지 목록이 도착하면 기다리던 자리(첫/마지막 행)에 커서를 놓는다.
  // 그사이 page가 교정됐다면 교정된 페이지의 목록이 올 때까지 기다린다
  if (pendingCursor !== null && currentItems) {
    setPendingCursor(null);
    setCursorId(pendingCursor === 'first' ? currentItems[0].id : currentItems[currentItems.length - 1].id);
  }

  // 키는 페이지 전체(window)에서 받는다. 다음 경우는 건너뛴다
  // - 모달이 열려 있을 때: 모달 안의 투명도 슬라이더도 방향키를 쓴다
  // - 검색창에 입력 중일 때: 방향키는 글자 사이 이동, Enter는 검색창의 입력으로 둔다
  // useEffectEvent: 리스너는 한 번만 등록하고, 호출될 때마다 최신 cursorId·url·목록을 읽는다
  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (selectedId !== null || e.target === searchRef.current) return;
    if (!currentItems) return;
    const ids = currentItems.map((slide) => slide.id);

    if (e.key === 'Enter') {
      // 모달이 열리면서 포커스가 "닫기" 버튼으로 옮겨지는데, 막지 않으면 같은 Enter가 그 버튼을 눌러 바로 닫힌다
      e.preventDefault();
      // 커서가 지금 페이지에 있을 때만 연다
      if (cursorId !== null && ids.includes(cursorId)) setUrl({ ...url, selectedId: cursorId });
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    e.preventDefault(); // 페이지가 같이 스크롤되지 않게
    const move = nextCursor(ids, cursorId, e.key === 'ArrowDown' ? 1 : -1, url.page, totalPages);
    if (move?.type === 'row') setCursorId(move.id);
    if (move?.type === 'page') {
      setPendingCursor(move.at);
      setUrl({ ...url, page: move.page });
    }
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="app">
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Heading size="6">슬라이드 분석 결과 뷰어</Heading>
          <Box width={{ initial: '100%', sm: '320px' }}>
            <TextField.Root
              ref={searchRef}
              placeholder="슬라이드 ID 또는 환자명 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            >
              <TextField.Slot side="right">{isLoading && <Spinner />}</TextField.Slot>
            </TextField.Root>
          </Box>
        </Flex>

        <Flex direction="column" gap="3">
          {list.status === 'error' ? (
            <Callout.Root color="red">
              <Callout.Text>
                목록을 불러오지 못했습니다. ({list.error.message}){' '}
                <Button size="1" variant="soft" color="red" onClick={retry}>
                  다시 시도
                </Button>
              </Callout.Text>
            </Callout.Root>
          ) : data && data.total === 0 ? (
            <Card>
              <Text as="p" align="center" color="gray" my="6">
                {url.q ? `'${url.q}'에 대한 검색 결과가 없습니다.` : '표시할 슬라이드가 없습니다.'}
              </Text>
            </Card>
          ) : (
            <Box style={{ opacity: isLoading && data ? 0.6 : 1 }}>
              {/* total은 있는데 items가 비었으면 범위 밖 페이지를 고치는 중이므로 빈 문구 대신 스켈레톤을 보인다 */}
              <SlideTable
                items={data && data.items.length > 0 ? data.items : null}
                cursorId={cursorId}
                onSelect={(id) => setUrl({ ...url, selectedId: id })}
              />
            </Box>
          )}

          {data && (
            <Flex align="center" justify="between">
              <Text size="2" color="gray">
                총 {data.total}건
              </Text>
              <Pagination page={url.page} totalPages={totalPages} onChange={(page) => setUrl({ ...url, page })} />
              <Box width="60px" />
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* ESC·바깥 클릭·닫기 버튼으로 닫히면 선택을 해제한다 */}
      <Dialog.Root open={selectedId !== null} onOpenChange={(open) => !open && setUrl({ ...url, selectedId: null })}>
        <Dialog.Content maxWidth="960px" aria-describedby={undefined}>
          <Flex align="center" justify="between" gap="3" mb="4">
            <Dialog.Title mb="0">{dialogId}</Dialog.Title>
            <Dialog.Close>
              <Button variant="soft" color="gray">닫기</Button>
            </Dialog.Close>
          </Flex>
          {dialogId && <SlideDetail key={dialogId} id={dialogId} />}
        </Dialog.Content>
      </Dialog.Root>
    </main>
  );
}
