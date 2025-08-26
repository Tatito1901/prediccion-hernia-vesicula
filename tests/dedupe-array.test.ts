import { describe, it, expect } from 'vitest';
import { dedupeById } from '@/lib/array';

interface Item { id?: string | null; value: number }

describe('dedupeById', () => {
  it('removes duplicates by id and preserves first occurrence order', () => {
    const input: Item[] = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'a', value: 3 }, // duplicate id "a"
      { id: 'c', value: 4 },
      { id: 'b', value: 5 }, // duplicate id "b"
    ];

    const out = dedupeById(input);
    expect(out).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 4 },
    ]);
  });

  it('skips items without an id', () => {
    const input: Item[] = [
      { id: undefined, value: 1 },
      { id: null, value: 2 },
      { id: 'x', value: 3 },
      { id: '', value: 4 } as any, // empty id is treated as falsy and skipped
    ];

    const out = dedupeById(input);
    expect(out).toEqual([{ id: 'x', value: 3 }]);
  });

  it('returns empty array for empty input', () => {
    const out = dedupeById([]);
    expect(out).toEqual([]);
  });
});
