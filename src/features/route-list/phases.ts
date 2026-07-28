import { getSupabaseClient } from '../../shared/api/supabase';

export type PhaseSummary = {
  id: string;
  routeId: string;
  name: string;
  description: string | null;
  orderValue: number;
  phaseDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: 'planned' | 'current' | 'completed' | 'skipped' | 'cancelled';
  isOptional: boolean;
};

export type CreatePhaseInput = {
  name: string;
  description?: string;
};

type PhaseRow = {
  id: string;
  route_id: string;
  name: string;
  description: string | null;
  order_value: number | string;
  phase_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: PhaseSummary['status'];
  is_optional: boolean;
};

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。');
  return supabase;
}

function toPhaseSummary(row: PhaseRow): PhaseSummary {
  return {
    id: row.id,
    routeId: row.route_id,
    name: row.name,
    description: row.description,
    orderValue: Number(row.order_value),
    phaseDate: row.phase_date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    isOptional: row.is_optional,
  };
}

export async function getRoutePhases(routeId: string): Promise<PhaseSummary[]> {
  if (!routeId) return [];

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('phases')
    .select('id, route_id, name, description, order_value, phase_date, start_time, end_time, status, is_optional')
    .eq('route_id', routeId)
    .is('deleted_at', null)
    .order('order_value', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as PhaseRow[]).map(toPhaseSummary);
}

export async function createRoutePhase(
  routeId: string,
  input: CreatePhaseInput
): Promise<PhaseSummary> {
  if (!routeId) throw new Error('Route IDがありません。');

  const name = input.name.trim();
  if (!name) throw new Error('Phase名を入力してください。');
  if (name.length > 40) throw new Error('Phase名は40文字以内で入力してください。');

  const description = input.description?.trim() || null;
  const supabase = requireSupabase();

  const { data: lastRows, error: orderError } = await supabase
    .from('phases')
    .select('order_value')
    .eq('route_id', routeId)
    .is('deleted_at', null)
    .order('order_value', { ascending: false })
    .limit(1);

  if (orderError) throw orderError;

  const lastOrder = lastRows?.length ? Number(lastRows[0].order_value) : 0;
  const nextOrder = Number.isFinite(lastOrder) ? lastOrder + 1000 : 1000;

  const { data, error } = await supabase
    .from('phases')
    .insert({
      route_id: routeId,
      name,
      description,
      order_value: nextOrder,
      status: 'planned',
      is_optional: false,
    })
    .select('id, route_id, name, description, order_value, phase_date, start_time, end_time, status, is_optional')
    .single();

  if (error) throw error;
  return toPhaseSummary(data as PhaseRow);
}
