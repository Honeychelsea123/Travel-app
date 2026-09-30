-- =====================================================================
-- 110 · 성향 v2 — 네 축 숫자 칸 · 사람 화면에 보내기 · 「다시 간 횟수」가 쓴 때를 안 바꾸게 (2026-09-30)
--
-- 사용자(2026-09-30): 「성향은 여러번 똑같은 도시까지 녹일 수 있고 좀 더 다양성있게 로직을 짜보자」
--   → 명세·시안 → 고른 것: 단골력 = 「익숙한 곳」(한 나라 몰림 + 다시 간 도시 중 큰 쪽) · 흔들림 막기.
--
-- 여러 번 돌려도 같습니다(있으면 건너뛰고, 함수·트리거는 갈아 끼웁니다). 기존 자료는 안 건드립니다.
-- ⚠ **앱을 올리기 전에 돌려 주세요.** 안 돌리면 ③ 때문에 「다시 간 도시」를 저장할 때 일기장·보관함의
--   「최신순」이 흔들립니다(저장한 도시가 전부 맨 위로 올라옵니다).
-- =====================================================================

-- ① 네 축 숫자(0~100, 개척·단골·모험·만족 차례). 본인 앱이 성향을 셀 때 같이 올립니다(pshift.js).
--    사람 화면(people.js)이 막대를 그 사람 것과 똑같이 그리려고 씁니다 — 다시 간 횟수(109)는 남에게 안 가서,
--    남의 기기에서 새로 세면 본인 화면과 어긋납니다. 숫자 넷은 계산된 값이라 횟수는 드러나지 않습니다.
--    50 은 「아직 모름」인 축입니다.
alter table public.profiles add column if not exists persona_ax smallint[];

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_persona_ax_chk') then
    alter table public.profiles add constraint profiles_persona_ax_chk
      check (persona_ax is null
             or (array_length(persona_ax, 1) = 4 and 0 <= all (persona_ax) and 100 >= all (persona_ax)));
  end if;
end $$;

-- ② 사람 알맹이 — 101 의 것 그대로에 'persona_ax' 한 칸만 더합니다.
--    ⚠ 별점을 가린 사람(show_stars = false)이면 안 보냅니다 — 만족력이 별점에서 나오고, 지금도 별점을 가리면
--      막대를 안 그립니다(그림만).
create or replace function public.person_body(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); p record; 별 boolean; 발자국 jsonb;
begin
  if me is null then raise exception '로그인이 필요합니다'; end if;
  if not public.can_see_person(me, p_user) then return null; end if;
  select show_stars, persona, persona_ax into p from public.profiles where id = p_user;
  별 := p_user = me or coalesce(p.show_stars, true);

  with been as (
    select v.city_id,
           coalesce(n.parent_code, c.country)  as country,
           coalesce(np.continent, n.continent) as continent
      from public.visited_of(p_user) v
      join public.cities c          on c.id = v.city_id
      left join public.countries n  on n.code = c.country
      left join public.countries np on np.code = n.parent_code
  )
  select jsonb_build_object(
    'cities',    (select count(*) from been),
    'countries', (select count(distinct country) from been),
    'rated',     (select count(*) from public.city_ratings where user_id = p_user and stars is not null),
    'trips',     (select count(*) from public.trip_members m join public.trips t on t.id = m.trip_id
                   where m.user_id = p_user and m.left_at is null and t.end_date < current_date),
    'by_continent', coalesce((select jsonb_object_agg(k, n) from (
        select coalesce(continent, '기타') as k, count(distinct country) as n from been group by 1) x),
      '{}'::jsonb)
  ) into 발자국;

  return jsonb_build_object(
    'persona', p.persona,
    'persona_ax', case when 별 then to_jsonb(p.persona_ax) end,
    'show_stars', 별,
    'foot', 발자국,
    'visited', coalesce((select jsonb_agg(v.city_id) from public.visited_of(p_user) v), '[]'::jsonb),
    -- 별점 · 한줄평(가고 싶은 곳 · 일기 · 다시 간 횟수는 안 나갑니다)
    'ratings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'city_id', r.city_id,
               'stars',   case when 별 then r.stars end,
               'comment', nullif(btrim(r.comment), ''))
             order by r.stars desc nulls last, r.city_id)
        from public.city_ratings r
       where r.user_id = p_user
         and (r.stars is not null or nullif(btrim(r.comment), '') is not null)), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.badge_id, 'at', b.earned_at) order by b.earned_at)
        from public.user_badges b where b.user_id = p_user), '[]'::jsonb)
  );
end $$;
revoke all on function public.person_body(uuid) from public, anon;
grant execute on function public.person_body(uuid) to authenticated;

-- ③ 「다시 간 횟수」만 바꾼 것은 «쓴 때»가 아닙니다.
--    012 의 ratings_touch 는 고칠 때마다 updated_at 을 지금으로 바꿉니다. 일기장(diary.js)과 보관함 최신순
--    (shelf.js)이 그 칸으로 줄을 세워서, 시트에서 횟수를 저장하면 매긴 도시가 전부 맨 위로 올라왔을 것입니다.
--    visits(와 updated_at) 말고 바뀐 칸이 없으면 옛 시각을 그대로 둡니다. 별점·한줄평·일기를 고치면 전과 같습니다.
create or replace function public.ratings_touch_guard()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(new) - 'visits' - 'updated_at') is not distinct from (to_jsonb(old) - 'visits' - 'updated_at') then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;
  return new;
end $$;
drop trigger if exists ratings_touch on public.city_ratings;
create trigger ratings_touch before update on public.city_ratings
  for each row execute function public.ratings_touch_guard();

-- 확인 — 세 칸 모두 true 면 끝입니다.
select
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'profiles' and column_name = 'persona_ax') as ax_ok,
  (select pg_get_functiondef('public.person_body(uuid)'::regprocedure) like '%persona_ax%')            as body_ok,
  exists (select 1 from pg_trigger t join pg_proc f on f.oid = t.tgfoid
           where t.tgname = 'ratings_touch' and f.proname = 'ratings_touch_guard')                   as touch_ok;
