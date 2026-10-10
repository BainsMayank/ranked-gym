interface Page<T> {
  data: T[] | null;
  error: unknown;
  count: number | null;
}

/**
 * Read a complete, consistently ordered table listing before reconciling local deletions.
 * Advance by the returned length: a server may impose a smaller limit than we request.
 * An incomplete listing must fail instead of making cached rows look deleted remotely.
 */
export async function readAllRows<T>(
  readPage: (from: number, to: number) => PromiseLike<Page<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  let total: number | undefined;
  do {
    const { data, error, count } = await readPage(rows.length, rows.length + 499);
    if (error) throw error;
    if (!data || count === null || (total !== undefined && count !== total)) {
      throw new Error('Server listing changed or is incomplete. Retry sync.');
    }
    total = count;
    if (data.length === 0 && rows.length < total) {
      throw new Error('Server listing was truncated. Retry sync.');
    }
    rows.push(...data);
  } while (rows.length < total);
  return rows;
}
