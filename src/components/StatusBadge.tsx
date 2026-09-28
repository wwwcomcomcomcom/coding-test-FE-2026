import { Badge } from '@radix-ui/themes';
import type { SlideStatus } from '../api/types';
import { STATUS_LABEL } from '../utils/format';

const STATUS_COLOR = {
  completed: 'green',
  processing: 'amber',
  failed: 'red',
} as const satisfies Record<SlideStatus, string>;

export function StatusBadge({ status }: { status: SlideStatus }) {
  return <Badge color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Badge>;
}
