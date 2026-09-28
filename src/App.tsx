import { useState } from 'react';
import { Box, Button, Callout, Card, Dialog, Flex, Heading, Spinner, Text, TextField } from '@radix-ui/themes';
import { PAGE_SIZE } from './api/client';
import { Pagination } from './components/Pagination';
import { SlideDetail } from './components/SlideDetail';
import { SlideTable } from './components/SlideTable';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { displayedData, useSlides } from './hooks/useSlides';
import { useUrlState } from './hooks/useUrlState';

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

  const { state: list, retry } = useSlides(url.q, url.page);
  const isLoading = list.status === 'loading';
  const data = displayedData(list);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // URL의 page가 마지막 페이지보다 크면(공유받은 URL, 직접 입력 등) 마지막 페이지로 고친다.
  // 범위 밖이면 mock은 total만 주고 items는 비워서 보내므로, 응답을 받아야 마지막 페이지를 안다.
  // URL이 막 바뀐 렌더에서는 list가 아직 이전 요청의 결과라서, 지금 URL로 보낸 요청의 결과인지 먼저 확인한다.
  // 잘못된 URL을 기록에 남기지 않도록 replace로 바꾼다.
  if (
    list.status === 'success' &&
    list.params.q === url.q &&
    list.params.page === url.page &&
    url.page > totalPages
  ) {
    setUrl({ ...url, page: totalPages }, { replace: true });
  }

  return (
    <main className="app">
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Heading size="6">슬라이드 분석 결과 뷰어</Heading>
          <Box width={{ initial: '100%', sm: '320px' }}>
            <TextField.Root
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
              <SlideTable items={data && data.items.length > 0 ? data.items : null} selectedId={selectedId} onSelect={(id) => setUrl({ ...url, selectedId: id })} />
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
