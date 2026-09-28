import { Skeleton, Table } from '@radix-ui/themes';
import type { SlideSummary } from '../api/types';
import { formatKST, maskName } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface Props {
  items: SlideSummary[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const SKELETON_ROWS = 8;

export function SlideTable({ items, selectedId, onSelect }: Props) {
  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="72px">썸네일</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>슬라이드 ID</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>환자명</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>검사일시</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>분석 상태</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {items === null
          ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <Table.Row key={i}>
                <Table.Cell><Skeleton width="48px" height="48px" /></Table.Cell>
                <Table.Cell><Skeleton>S-2026-0000</Skeleton></Table.Cell>
                <Table.Cell><Skeleton>홍*동</Skeleton></Table.Cell>
                <Table.Cell><Skeleton>2026-01-01 00:00</Skeleton></Table.Cell>
                <Table.Cell><Skeleton>완료</Skeleton></Table.Cell>
              </Table.Row>
            ))
          : items.map((slide) => (
              <Table.Row
                key={slide.id}
                align="center"
                className="slide-row"
                data-selected={slide.id === selectedId || undefined}
                onClick={() => onSelect(slide.id)}
              >
                <Table.Cell>
                  <img className="slide-thumb" src={slide.thumbnailUrl} alt={`${slide.id} 썸네일`} />
                </Table.Cell>
                <Table.RowHeaderCell>{slide.id}</Table.RowHeaderCell>
                <Table.Cell>{maskName(slide.patientName)}</Table.Cell>
                <Table.Cell>{formatKST(slide.examinedAt)}</Table.Cell>
                <Table.Cell><StatusBadge status={slide.status} /></Table.Cell>
              </Table.Row>
            ))}
      </Table.Body>
    </Table.Root>
  );
}
