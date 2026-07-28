import { getSupabaseClient } from '../../shared/api/supabase';

export type DestinationImportance = 'must' | 'want' | 'optional' | 'information';
export type DestinationTimeType = 'none' | 'fixed' | 'approx';

export type DestinationSummary = {
  id: string;
  routeId: string;
  phaseId: string;
  name: string;
  description: string | null;
  locationName: string | null;
  mapUrl: string | null;
  meetingPoint: string | null;
  importance: DestinationImportance;
  orderValue: number;
  estimatedDurationMinutes: number | null;
  isOptional: boolean;
  timeType: DestinationTimeType;
  startTime: string | null;
  endTime: string | null;
};

export type CreateDestinationInput = {
  phaseId: string;
  name: string;
  locationName?: string;
  description?: string;
  importance?: DestinationImportance;
  timeType?: DestinationTimeType;
  startTime?: string | null;
  endTime?: string | null;
};
export type UpdateDestinationInput = CreateDestinationInput;

type DestinationRow = {
  id: string; route_id: string; phase_id: string; name: string; description: string | null;
  location_name: string | null; map_url: string | null; meeting_point: string | null;
  importance: DestinationImportance; order_value: number | string; estimated_duration_minutes: number | null;
  is_optional: boolean; time_type: DestinationTimeType; start_time: string | null; end_time: string | null;
};

const columns = 'id, route_id, phase_id, name, description, location_name, map_url, meeting_point, importance, order_value, estimated_duration_minutes, is_optional, time_type, start_time, end_time';

function requireSupabase() { const supabase=getSupabaseClient(); if (!supabase) throw new Error('Supabaseの環境変数が設定されていません。'); return supabase; }
function cleanTime(v?: string | null) { const t=v?.trim(); return t || null; }
function toSummary(row: DestinationRow): DestinationSummary { return {
  id:row.id, routeId:row.route_id, phaseId:row.phase_id, name:row.name, description:row.description,
  locationName:row.location_name, mapUrl:row.map_url, meetingPoint:row.meeting_point, importance:row.importance,
  orderValue:Number(row.order_value), estimatedDurationMinutes:row.estimated_duration_minutes, isOptional:row.is_optional,
  timeType:row.time_type ?? 'none', startTime:row.start_time, endTime:row.end_time,
}; }

export async function getRouteDestinations(routeId:string):Promise<DestinationSummary[]> {
  if (!routeId) return []; const supabase=requireSupabase();
  const {data,error}=await supabase.from('destinations').select(columns).eq('route_id',routeId).eq('record_status','active').is('deleted_at',null).order('order_value',{ascending:true}).order('created_at',{ascending:true});
  if (error) throw error; return ((data??[]) as DestinationRow[]).map(toSummary);
}

export async function createRouteDestination(routeId:string,input:CreateDestinationInput):Promise<DestinationSummary> {
  if (!routeId) throw new Error('Route IDがありません。'); if (!input.phaseId) throw new Error('Phaseを確認できませんでした。');
  const name=input.name.trim(); if (!name) throw new Error('目的地名を入力してください。'); if (name.length>40) throw new Error('目的地名は40文字以内で入力してください。');
  const timeType=input.timeType??'none'; const startTime=timeType==='none'?null:cleanTime(input.startTime); const endTime=timeType==='none'?null:cleanTime(input.endTime);
  if (timeType!=='none'&&!startTime) throw new Error('時間ありの場合は開始時刻を入力してください。');
  const supabase=requireSupabase();
  const {data:lastRows,error:orderError}=await supabase.from('destinations').select('order_value').eq('route_id',routeId).eq('phase_id',input.phaseId).eq('record_status','active').is('deleted_at',null).order('order_value',{ascending:false}).limit(1);
  if (orderError) throw orderError; const lastOrder=lastRows?.length?Number(lastRows[0].order_value):0; const nextOrder=Number.isFinite(lastOrder)?lastOrder+1000:1000;
  const {data,error}=await supabase.from('destinations').insert({route_id:routeId,phase_id:input.phaseId,name,location_name:input.locationName?.trim()||null,description:input.description?.trim()||null,importance:input.importance??'must',order_value:nextOrder,is_optional:input.importance==='optional',time_type:timeType,start_time:startTime,end_time:endTime,record_status:'active'}).select(columns).single();
  if (error) throw error; return toSummary(data as DestinationRow);
}

export async function updateRouteDestination(routeId:string,destinationId:string,input:UpdateDestinationInput):Promise<DestinationSummary> {
  if (!routeId) throw new Error('Route IDがありません。'); if (!destinationId) throw new Error('Destination IDがありません。'); if (!input.phaseId) throw new Error('Phaseを確認できませんでした。');
  const name=input.name.trim(); if (!name) throw new Error('目的地名を入力してください。'); if (name.length>40) throw new Error('目的地名は40文字以内で入力してください。');
  const timeType=input.timeType??'none'; const startTime=timeType==='none'?null:cleanTime(input.startTime); const endTime=timeType==='none'?null:cleanTime(input.endTime);
  if (timeType!=='none'&&!startTime) throw new Error('時間ありの場合は開始時刻を入力してください。');
  const supabase=requireSupabase();
  const {data,error}=await supabase.from('destinations').update({phase_id:input.phaseId,name,location_name:input.locationName?.trim()||null,description:input.description?.trim()||null,importance:input.importance??'must',is_optional:input.importance==='optional',time_type:timeType,start_time:startTime,end_time:endTime}).eq('id',destinationId).eq('route_id',routeId).eq('record_status','active').is('deleted_at',null).select(columns).single();
  if (error) throw error; return toSummary(data as DestinationRow);
}

export async function saveRouteDestinationOrder(routeId:string,ordered:DestinationSummary[],original:DestinationSummary[]):Promise<DestinationSummary[]> {
  if (!routeId) throw new Error('Route IDがありません。'); if (ordered.length!==original.length) throw new Error('目的地の並び順が不正です。');
  if (ordered.some(i=>i.timeType!=='none')) throw new Error('時刻ありの目的地は並び替えできません。');
  const originalById=new Map(original.map(i=>[i.id,i])); const orderValues=original.map(i=>i.orderValue).sort((a,b)=>a-b); if(orderValues.some(v=>!Number.isFinite(v))) throw new Error('目的地の並び順が不正です。');
  const next=ordered.map((i,index)=>({...i,orderValue:orderValues[index]})); const changed=next.filter(i=>originalById.get(i.id)?.orderValue!==i.orderValue); if(!changed.length)return next;
  const supabase=requireSupabase(); const completed:DestinationSummary[]=[];
  try { for(const item of changed){ const {error}=await supabase.from('destinations').update({order_value:item.orderValue}).eq('id',item.id).eq('route_id',routeId).eq('record_status','active').is('deleted_at',null); if(error)throw error; completed.push(item);} }
  catch(error){ for(const item of completed){const prev=originalById.get(item.id); if(!prev)continue; await supabase.from('destinations').update({order_value:prev.orderValue}).eq('id',item.id).eq('route_id',routeId).eq('record_status','active').is('deleted_at',null);} throw error; }
  return next;
}

export async function softDeleteRouteDestination(routeId:string,destinationId:string):Promise<void>{
  if(!routeId)throw new Error('Route IDがありません。'); if(!destinationId)throw new Error('Destination IDがありません。'); const supabase=requireSupabase();
  const {error}=await supabase.from('destinations').update({deleted_at:new Date().toISOString()}).eq('id',destinationId).eq('route_id',routeId).eq('record_status','active').is('deleted_at',null); if(error)throw error;
}
