-- D Route v2.1.0-p54 built-in templates
begin;

create or replace function public.create_route_from_builtin_template(p_template_key text,p_name text)
returns public.routes
language plpgsql security definer set search_path=public
as $$
declare
  new_route public.routes;
  spec jsonb;
  phase_item jsonb;
  dest_item jsonb;
  new_phase uuid;
  phase_no integer := 0;
  normalized_name text := trim(coalesce(p_name,''));
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if normalized_name='' then raise exception 'Route name is required' using errcode='22023'; end if;
  if char_length(normalized_name)>60 then raise exception 'Route name is too long' using errcode='22023'; end if;

  spec := case p_template_key
    when 'touring' then '{"description":"集合から帰路までを共有するツーリング用Route","phases":[{"name":"集合・出発","destinations":[["集合場所","集合場所と出発時刻を設定","must"],["出発","出発前の確認","must"]]},{"name":"走行・立ち寄り","destinations":[["休憩地点","休憩場所を設定","must"],["昼食","昼食場所を設定","optional"],["給油","必要な場合に使用","optional"],["目的地","メインの目的地を設定","must"]]},{"name":"帰路","destinations":[["帰路の休憩","帰りの休憩場所","optional"],["解散","解散場所または帰宅","must"]]}]}'::jsonb
    when 'day_drive' then '{"description":"立ち寄り先を順番に回る日帰りドライブ用Route","phases":[{"name":"出発・午前","destinations":[["出発地点","出発地点を設定","must"],["午前の立ち寄り","立ち寄り先を設定","optional"]]},{"name":"昼・午後","destinations":[["昼食","昼食場所を設定","must"],["観光・目的地","メインの目的地を設定","must"],["帰りの立ち寄り","必要な場合に使用","optional"]]},{"name":"帰宅","destinations":[["帰宅","帰宅地点","must"]]}]}'::jsonb
    when 'errands' then '{"description":"買い物や複数の用事を効率よく回るRoute","phases":[{"name":"用事回り","destinations":[["用事 1","最初の用事または店舗","must"],["用事 2","次の用事または店舗","must"],["用事 3","必要に応じて編集","optional"],["帰宅","最後の目的地","optional"]]}]}'::jsonb
    when 'day_trip' then '{"description":"旅行の1日を時間帯ごとに整理するRoute","phases":[{"name":"朝・午前","destinations":[["朝の出発","出発地点と時刻","must"],["午前の予定","観光や移動先","must"]]},{"name":"昼・午後","destinations":[["昼食","昼食場所","must"],["午後の予定","観光や体験","must"]]},{"name":"夜","destinations":[["夕食","夕食場所","optional"],["宿泊・帰宅","ホテルまたは帰宅地点","must"]]}]}'::jsonb
    when 'event' then '{"description":"集合から解散までを共有するイベント参加用Route","phases":[{"name":"集合・入場","destinations":[["集合場所","集合場所と時刻","must"],["会場・入場口","入場場所を設定","must"]]},{"name":"イベント","destinations":[["メイン予定","公演・試合・イベント","must"],["休憩・食事","必要な場合に使用","optional"]]},{"name":"終了・解散","destinations":[["終了後の予定","食事や買い物","optional"],["解散","解散場所","must"]]}]}'::jsonb
    when 'sports' then '{"description":"ゴルフやスポーツ当日の流れを共有するRoute","phases":[{"name":"集合・準備","destinations":[["集合場所","集合場所と時刻","must"],["受付・準備","受付や着替え","must"]]},{"name":"プレー・競技","destinations":[["開始","スタート場所や開始時刻","must"],["休憩・食事","休憩や昼食","optional"],["終了","競技終了","must"]]},{"name":"終了後","destinations":[["精算・片付け","終了後の手続き","optional"],["解散","解散場所","must"]]}]}'::jsonb
    else null
  end case;
  if spec is null then raise exception 'Unknown template' using errcode='22023'; end if;

  insert into public.routes(owner_user_id,name,description)
  values(auth.uid(),normalized_name,spec->>'description') returning * into new_route;

  for phase_item in select * from jsonb_array_elements(spec->'phases') loop
    phase_no := phase_no + 1;
    insert into public.phases(route_id,name,description,order_value,status,is_optional,created_by,updated_by)
    values(new_route.id,phase_item->>'name',null,phase_no*100,'planned',false,auth.uid(),auth.uid())
    returning id into new_phase;

    insert into public.destinations(route_id,phase_id,name,description,importance,order_value,is_optional,is_hidden,record_status,created_by,updated_by,time_type,completed_at)
    select new_route.id,new_phase,
      item.value->>0,item.value->>1,item.value->>2,
      item.ordinality*100,(item.value->>2)='optional',false,'active',
      auth.uid(),auth.uid(),'none',null
    from jsonb_array_elements(phase_item->'destinations') with ordinality as item(value,ordinality);
  end loop;

  return new_route;
end;
$$;

revoke all on function public.create_route_from_builtin_template(text,text) from public;
grant execute on function public.create_route_from_builtin_template(text,text) to authenticated;
commit;
notify pgrst,'reload schema';
select proname from pg_proc where proname='create_route_from_builtin_template';
