import { readAllRows } from '../pagination';

it('reads beyond the requested page limit, including a smaller server cap', async () => {
  const all = Array.from({ length: 1203 }, (_, id) => ({ id }));
  const read = jest.fn(async (from: number, to: number) => ({
    data: all.slice(from, Math.min(to + 1, from + 200)),
    count: all.length,
    error: null,
  }));
  expect(await readAllRows(read)).toEqual(all);
  expect(read).toHaveBeenCalledTimes(7);
  expect(read.mock.calls[1]?.[0]).toBe(200);
});

it('accepts an empty table', async () => {
  expect(await readAllRows(async () => ({ data: [], count: 0, error: null }))).toEqual([]);
});

it('rejects a partial listing rather than returning it for deletion reconciliation', async () => {
  const read = jest
    .fn()
    .mockResolvedValueOnce({ data: [{ id: 'a' }], count: 2, error: null })
    .mockResolvedValueOnce({ data: [], count: 2, error: null });
  await expect(readAllRows(read)).rejects.toThrow('truncated');
});

it('rejects a listing whose count changes during pagination', async () => {
  const read = jest
    .fn()
    .mockResolvedValueOnce({ data: [{ id: 'a' }], count: 2, error: null })
    .mockResolvedValueOnce({ data: [{ id: 'b' }], count: 3, error: null });
  await expect(readAllRows(read)).rejects.toThrow('changed');
});

it('propagates a later page error without returning partial results', async () => {
  const error = new Error('Connection lost');
  const read = jest
    .fn()
    .mockResolvedValueOnce({ data: [{ id: 'a' }], count: 2, error: null })
    .mockResolvedValueOnce({ data: null, count: null, error });
  await expect(readAllRows(read)).rejects.toBe(error);
});
