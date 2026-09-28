import { Button, Callout, DataList, Flex, Grid, Skeleton } from '@radix-ui/themes';
import { ApiRequestError } from '../api/client';
import { useSlide } from '../hooks/useSlide';
import { formatCellCounts, formatKi67, formatKST, maskName } from '../utils/format';
import { SlideViewer } from './SlideViewer';
import { StatusBadge } from './StatusBadge';

/**
 * 모달 본문. 제목(슬라이드 ID)과 닫기 버튼은 부모 Dialog에 있다.
 * 다른 슬라이드를 고르면 이전 데이터가 남지 않도록 부모에서 key={id}로 렌더한다.
 */
export function SlideDetail({ id }: { id: string }) {
  const { state, retry } = useSlide(id);

  if (state.status === 'error') {
    const { error } = state;
    const notFound = error instanceof ApiRequestError && error.status === 404;
    return (
      <Callout.Root color="red">
        <Callout.Text>
          {notFound ? (
            `슬라이드 ${id}를 찾을 수 없습니다.`
          ) : (
            <>
              상세 정보를 불러오지 못했습니다. ({error.message}){' '}
              <Button size="1" variant="soft" color="red" onClick={retry}>
                다시 시도
              </Button>
            </>
          )}
        </Callout.Text>
      </Callout.Root>
    );
  }

  // 로딩 중(재시도 포함): 레이아웃이 튀지 않게 실제 화면과 같은 모양의 스켈레톤
  if (state.status === 'loading') {
    return (
      <Grid {...LAYOUT}>
        {/* 프레임(3:2)은 그대로 두고 스켈레톤이 안을 채운다. Skeleton 자체엔 크기가 없어서 프레임 역할을 못 함 */}
        {/* heatmap 컨트롤 줄 자리는 회색 박스 대신 패딩으로 비워 둔다 */}
        <Flex direction="column" gap="3" className="heatmap-placeholder">
          <div className="slide-image">
            <Skeleton width="100%" height="100%" />
          </div>
        </Flex>
        <DataList.Root>
          {DETAIL_LABELS.map((label) => (
            <DataList.Item key={label}>
              <DataList.Label>{label}</DataList.Label>
              <DataList.Value><Skeleton>2026-01-01 00:00</Skeleton></DataList.Value>
            </DataList.Item>
          ))}
        </DataList.Root>
      </Grid>
    );
  }

  // 위에서 error·loading을 모두 return했으므로 여기서 state는 success로 좁혀진다
  const { data } = state;
  const { analysis } = data;

  return (
    <Grid {...LAYOUT}>
      <SlideViewer imageUrl={data.imageUrl} heatmapUrl={data.heatmapUrl} alt={`${data.id} 슬라이드 이미지`} />

      <DataList.Root>
        <DataList.Item>
          <DataList.Label>환자명</DataList.Label>
          <DataList.Value>{maskName(data.patientName)}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>검사일시</DataList.Label>
          <DataList.Value>{formatKST(data.examinedAt)}</DataList.Value>
        </DataList.Item>
        <DataList.Item align="center">
          <DataList.Label>분석 상태</DataList.Label>
          <DataList.Value><StatusBadge status={data.status} /></DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Ki67 양성률</DataList.Label>
          <DataList.Value>{formatKi67(analysis.ki67Index)}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>양성 / 전체 세포 수</DataList.Label>
          <DataList.Value>{formatCellCounts(analysis.positiveCells, analysis.totalCells)}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>분석 완료 일시</DataList.Label>
          <DataList.Value>
            {analysis.analyzedAt === null ? '분석 결과 없음' : formatKST(analysis.analyzedAt)}
          </DataList.Value>
        </DataList.Item>
      </DataList.Root>
    </Grid>
  );
}

// 넓은 화면: 이미지 | 정보 좌우 배치, 좁은 화면(sm 미만): 위아래로 쌓음
const LAYOUT = { columns: { initial: '1', sm: 'minmax(0, 1fr) 260px' }, gap: '5', align: 'start' } as const;

const DETAIL_LABELS = ['환자명', '검사일시', '분석 상태', 'Ki67 양성률', '양성 / 전체 세포 수', '분석 완료 일시'];
