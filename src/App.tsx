import { useState } from 'react';
import { Box, Button, Callout, Card, Dialog, Flex, Heading, Spinner, Text, TextField } from '@radix-ui/themes';
import { PAGE_SIZE } from './api/client';
import { Pagination } from './components/Pagination';
import { SlideDetail } from './components/SlideDetail';
import { SlideTable } from './components/SlideTable';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { displayedData, useSlides } from './hooks/useSlides';

export default function App() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  // 실제 검색어(디바운스된 값)가 바뀌면 1페이지로 되돌린다.
  // 결과가 줄어들면 현재 페이지가 범위를 벗어날 수 있기 때문.
  // 렌더 중에 바로 조정해서 "새 검색어 + 이전 페이지" 요청이 나가지 않게 한다.
  const [prevQuery, setPrevQuery] = useState(debouncedQuery);
  if (prevQuery !== debouncedQuery) {
    setPrevQuery(debouncedQuery);
    setPage(1);
  }

  // 모달을 닫으면 selectedId는 바로 null이 되지만 닫히는 애니메이션은 조금 더 이어진다.
  // 그동안 내용이 비어 모달이 쪼그라들지 않도록 마지막으로 연 id를 기억해 둔다.
  const [dialogId, setDialogId] = useState<string | null>(null);
  if (selectedId !== null && selectedId !== dialogId) {
    setDialogId(selectedId);
  }

  const { state: list, retry } = useSlides(debouncedQuery, page);
  const isLoading = list.status === 'loading';
  const data = displayedData(list);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

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
          ) : data && data.items.length === 0 ? (
            <Card>
              <Text as="p" align="center" color="gray" my="6">
                {debouncedQuery ? `'${debouncedQuery}'에 대한 검색 결과가 없습니다.` : '표시할 슬라이드가 없습니다.'}
              </Text>
            </Card>
          ) : (
            <Box style={{ opacity: isLoading && data ? 0.6 : 1 }}>
              <SlideTable items={data?.items ?? null} selectedId={selectedId} onSelect={setSelectedId} />
            </Box>
          )}

          {data && (
            <Flex align="center" justify="between">
              <Text size="2" color="gray">
                총 {data.total}건
              </Text>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              <Box width="60px" />
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* ESC·바깥 클릭·닫기 버튼으로 닫히면 선택을 해제한다 */}
      <Dialog.Root open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
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
