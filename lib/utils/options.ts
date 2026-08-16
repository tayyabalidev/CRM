export const OPTION_LIST_LIMIT = 200;

export async function ensureIncludedOption<T extends { id: string }>(
  rows: T[],
  includeId: string | undefined,
  fetchOne: (id: string) => Promise<T | null>,
): Promise<T[]> {
  if (!includeId || rows.some((row) => row.id === includeId)) {
    return rows;
  }

  const extra = await fetchOne(includeId);
  return extra ? [extra, ...rows] : rows;
}
