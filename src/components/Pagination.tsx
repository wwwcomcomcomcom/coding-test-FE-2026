import { Button, Flex, Text } from '@radix-ui/themes';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: Props) {
  return (
    <Flex align="center" justify="center" gap="3">
      <Button variant="soft" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </Button>
      <Text size="2" color="gray">
        {page} / {totalPages}
      </Text>
      <Button variant="soft" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        다음
      </Button>
    </Flex>
  );
}
