import { useEffect, useState } from 'react';

/** value가 delay(ms) 동안 바뀌지 않았을 때만 갱신된 값을 돌려준다 */
export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
