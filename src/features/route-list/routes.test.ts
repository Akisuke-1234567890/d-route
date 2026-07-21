import { beforeEach, describe, expect, it, vi } from 'vitest';

const single = vi.fn();
const insertSelect = vi.fn(() => ({ single }));
const insert = vi.fn(() => ({ select: insertSelect }));
const order = vi.fn();
const is = vi.fn(() => ({ order }));
const select = vi.fn(() => ({ is }));
const from = vi.fn(() => ({ select, insert }));
const getUser = vi.fn();

vi.mock('../../shared/api/supabase', () => ({
  getSupabaseClient: () => ({ auth: { getUser }, from })
}));

import { createRoute, listRoutes } from './routes';

describe('routes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads non-deleted routes in updated order', async () => {
    const rows = [{ id: 'route-1', name: 'Test Route', status: 'draft', created_at: '2026-07-21', updated_at: '2026-07-21' }];
    order.mockResolvedValue({ data: rows, error: null });

    await expect(listRoutes()).resolves.toEqual(rows);
    expect(from).toHaveBeenCalledWith('routes');
    expect(is).toHaveBeenCalledWith('deleted_at', null);
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('creates a route for the signed-in owner', async () => {
    const created = { id: 'route-2', name: 'Family Route', status: 'draft', created_at: '2026-07-21', updated_at: '2026-07-21' };
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    single.mockResolvedValue({ data: created, error: null });

    await expect(createRoute('  Family Route  ')).resolves.toEqual(created);
    expect(insert).toHaveBeenCalledWith({ owner_user_id: 'user-1', name: 'Family Route' });
  });

  it('rejects an empty route name before accessing Supabase', async () => {
    await expect(createRoute('   ')).rejects.toThrow('Route名を入力してください。');
    expect(from).not.toHaveBeenCalled();
  });
});
