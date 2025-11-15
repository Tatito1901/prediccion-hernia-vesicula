// lib/array.ts
// Small utility helpers for array operations

// Dedupe an array of items that have an id field, preserving first occurrence order
export function dedupeById<T extends { id?: string | null }>(arr: T[]): T[] {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const id = item?.id;
    if (!id) continue; // skip invalid items lacking an id
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}
