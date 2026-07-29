import { getSupabaseClient } from '../../shared/api/supabase';

export type PhaseSummary = {
  id: string;
  routeId: string;
  name: string;
  description: string | null;
  orderValue: number;
  startTime: string | null;
  status: 'planned' | 'current' | 'completed' | 'skipped' | 'cancelled';
  isDefault: boolean;
};

export type CreatePhaseInput = {
  name: string;
  description?: string;
  startTime?: string | null;
};

export type UpdatePhaseInput = CreatePhaseInput;

type PhaseRow = {
  id: string;
  route_id: string;
  name: string;
  description: string | null;
  order_value: number | string;
  start_time: string | null;
  status: PhaseSummary['status'];
  is_default: boolean;
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
    startTime: row.start_time,
    status: row.status,
    isDefault: row.is_default,
  };
}

const phaseColumns = 'id, route_id, name, description, order_value, start_time, status, is_default';

export async function getRoutePhases(routeId: string): Promise<PhaseSummary[]> {
  if (!routeId) return [];
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('phases')
    .select(phaseColumns)
    .eq('route_id', routeId)
    .is('deleted_at', null)
    .order('order_value', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as PhaseRow[]).map(toPhaseSummary);
}

export async function createRoutePhase(routeId: string, input: CreatePhaseInput): Promise<PhaseSummary> {
  if (!routeId) throw new Error('Route IDがありません。');
  const name = input.name.trim();
  if (!name) throw new Error('Phase名を入力してください。');
  if (name.length > 40) throw new Error('Phase名は40文字以内で入力してください。');
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
      description: input.description?.trim() || null,
      start_time: input.startTime || null,
      order_value: nextOrder,
      status: 'planned',
      is_optional: false,
      is_default: false,
    })
    .select(phaseColumns)
    .single();
  if (error) throw error;
  return toPhaseSummary(data as PhaseRow);
}

export async function updateRoutePhase(routeId: string, phaseId: string, input: UpdatePhaseInput): Promise<PhaseSummary> {
  if (!routeId || !phaseId) throw new Error('Phaseを確認できませんでした。');
  const supabase = requireSupabase();
  const { data: current, error: currentError } = await supabase
    .from('phases')
    .select('is_default')
    .eq('id', phaseId)
    .eq('route_id', routeId)
    .is('deleted_at', null)
    .single();
  if (currentError) throw currentError;
  const name = input.name.trim();
  if (!current?.is_default && !name) throw new Error('Phase名を入力してください。');
  if (name.length > 40) throw new Error('Phase名は40文字以内で入力してください。');
  const { data, error } = await supabase
    .from('phases')
    .update({
      name,
      description: input.description?.trim() || null,
      start_time: input.startTime || null,
    })
    .eq('id', phaseId)
    .eq('route_id', routeId)
    .is('deleted_at', null)
    .select(phaseColumns)
    .single();
  if (error) throw error;
  return toPhaseSummary(data as PhaseRow);
}


export async function deleteRoutePhase(routeId: string, phaseId: string): Promise<void> {
  if (!routeId || !phaseId) throw new Error('Phaseを特定できません。');
  const supabase = requireSupabase();
  const phases = await getRoutePhases(routeId);
  const target = phases.find((phase) => phase.id === phaseId);
  if (!target) throw new Error('Phaseが見つかりません。');
  if (phases.length <= 1) throw new Error('最後のPhaseは削除できません。');

  const remaining = phases.filter((phase) => phase.id !== phaseId).sort((a,b)=>a.orderValue-b.orderValue);
  const fallback = remaining.find((phase) => phase.isDefault) ?? remaining[0];
  if (!fallback) throw new Error('目的地の移動先がありません。');

  if (target.isDefault && !fallback.isDefault) {
    const { error } = await supabase.from('phases').update({ is_default: true })
      .eq('id', fallback.id).eq('route_id', routeId).is('deleted_at',null);
    if (error) throw error;
  }

  const { error: moveError } = await supabase.from('destinations').update({ phase_id: fallback.id })
    .eq('route_id',routeId).eq('phase_id',phaseId).eq('record_status','active').is('deleted_at',null);
  if (moveError) throw moveError;

  const { error: deleteError } = await supabase.from('phases')
    .update({ deleted_at: new Date().toISOString(), is_default: false })
    .eq('id',phaseId).eq('route_id',routeId).is('deleted_at',null);
  if (deleteError) throw deleteError;
}
