import { getSupabaseClient } from '../../shared/api/supabase';

export type DestinationImportance = 'must' | 'want' | 'optional' | 'information';

export type DestinationSummary = {
  id: string;
  routeId: string;
  phaseId: string | null;
  name: string;
  description: string | null;
  locationName: string | null;
  mapUrl: string | null;
  meetingPoint: string | null;
  importance: DestinationImportance;
  orderValue: number;
  estimatedDurationMinutes: number | null;
  isOptional: boolean;
};

export type CreateDestinationInput = {
  name: string;
  locationName?: string;
  description?: string;
  importance?: DestinationImportance;
};

export type UpdateDestinationInput = CreateDestinationInput;

type DestinationRow = {
  id: string;
  route_id: string;
  phase_id: string | null;
  name: string;
  description: string | null;
  location_name: string | null;
  map_url: string | null;
  meeting_point: string | null;
  importance: DestinationImportance;
  order_value: number | string;
  estimated_duration_minutes: number | null;
  is_optional: boolean;
};

function toDestinationSummary(row: DestinationRow): DestinationSummary {
  return {
    id: row.id,
    routeId: row.route_id,
    phaseId: row.phase_id,
    name: row.name,
    description: row.description,
    locationName: row.location_name,
    mapUrl: row.map_url,
    meetingPoint: row.meeting_point,
    importance: row.importance,
    orderValue: Number(row.order_value),
    estimatedDurationMinutes: row.estimated_duration_minutes,
    isOptional: row.is_optional,
  };
}

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabaseの環境変数が設定されていません。');
  }
  return supabase;
}

export async function getRouteDestinations(routeId: string): Promise<DestinationSummary[]> {
  if (!routeId) return [];

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('destinations')
    .select(
      'id, route_id, phase_id, name, description, location_name, map_url, meeting_point, importance, order_value, estimated_duration_minutes, is_optional'
    )
    .eq('route_id', routeId)
    .eq('record_status', 'active')
    .is('deleted_at', null)
    .order('order_value', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as DestinationRow[]).map(toDestinationSummary);
}

export async function createRouteDestination(
  routeId: string,
  input: CreateDestinationInput
): Promise<DestinationSummary> {
  if (!routeId) throw new Error('Route IDがありません。');

  const name = input.name.trim();
  if (!name) throw new Error('目的地名を入力してください。');
  if (name.length > 40) throw new Error('目的地名は40文字以内で入力してください。');

  const supabase = requireSupabase();

  const { data: lastRows, error: orderError } = await supabase
    .from('destinations')
    .select('order_value')
    .eq('route_id', routeId)
    .eq('record_status', 'active')
    .is('deleted_at', null)
    .order('order_value', { ascending: false })
    .limit(1);

  if (orderError) throw orderError;

  const lastOrder = lastRows?.length ? Number(lastRows[0].order_value) : 0;
  const nextOrder = Number.isFinite(lastOrder) ? lastOrder + 1000 : 1000;

  const { data, error } = await supabase
    .from('destinations')
    .insert({
      route_id: routeId,
      name,
      location_name: input.locationName?.trim() || null,
      description: input.description?.trim() || null,
      importance: input.importance ?? 'want',
      order_value: nextOrder,
      is_optional: input.importance === 'optional',
      record_status: 'active',
    })
    .select(
      'id, route_id, phase_id, name, description, location_name, map_url, meeting_point, importance, order_value, estimated_duration_minutes, is_optional'
    )
    .single();

  if (error) throw error;
  return toDestinationSummary(data as DestinationRow);
}


export async function updateRouteDestination(
  routeId: string,
  destinationId: string,
  input: UpdateDestinationInput
): Promise<DestinationSummary> {
  if (!routeId) throw new Error('Route IDがありません。');
  if (!destinationId) throw new Error('Destination IDがありません。');

  const name = input.name.trim();
  if (!name) throw new Error('目的地名を入力してください。');
  if (name.length > 40) throw new Error('目的地名は40文字以内で入力してください。');

  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('destinations')
    .update({
      name,
      location_name: input.locationName?.trim() || null,
      description: input.description?.trim() || null,
      importance: input.importance ?? 'want',
      is_optional: input.importance === 'optional',
    })
    .eq('id', destinationId)
    .eq('route_id', routeId)
    .eq('record_status', 'active')
    .is('deleted_at', null)
    .select(
      'id, route_id, phase_id, name, description, location_name, map_url, meeting_point, importance, order_value, estimated_duration_minutes, is_optional'
    )
    .single();

  if (error) throw error;
  return toDestinationSummary(data as DestinationRow);
}



export async function swapRouteDestinationOrder(
  routeId: string,
  first: Pick<DestinationSummary, 'id' | 'orderValue'>,
  second: Pick<DestinationSummary, 'id' | 'orderValue'>
): Promise<void> {
  if (!routeId) throw new Error('Route IDがありません。');
  if (!first.id || !second.id) throw new Error('Destination IDがありません。');
  if (first.id === second.id) return;
  if (!Number.isFinite(first.orderValue) || !Number.isFinite(second.orderValue)) {
    throw new Error('目的地の並び順が不正です。');
  }

  const supabase = requireSupabase();

  const { error: firstError } = await supabase
    .from('destinations')
    .update({ order_value: second.orderValue })
    .eq('id', first.id)
    .eq('route_id', routeId)
    .eq('record_status', 'active')
    .is('deleted_at', null);

  if (firstError) throw firstError;

  const { error: secondError } = await supabase
    .from('destinations')
    .update({ order_value: first.orderValue })
    .eq('id', second.id)
    .eq('route_id', routeId)
    .eq('record_status', 'active')
    .is('deleted_at', null);

  if (!secondError) return;

  // Best-effort rollback. Keep the original error because it explains the failed reorder.
  await supabase
    .from('destinations')
    .update({ order_value: first.orderValue })
    .eq('id', first.id)
    .eq('route_id', routeId)
    .eq('record_status', 'active')
    .is('deleted_at', null);

  throw secondError;
}

export async function softDeleteRouteDestination(
  routeId: string,
  destinationId: string
): Promise<void> {
  if (!routeId) throw new Error('Route IDがありません。');
  if (!destinationId) throw new Error('Destination IDがありません。');

  const supabase = requireSupabase();

  const { error } = await supabase
    .from('destinations')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', destinationId)
    .eq('route_id', routeId)
    .eq('record_status', 'active')
    .is('deleted_at', null);

  if (error) throw error;
}
