-- =====================================================================
-- 속령은 모국으로 셉니다 — 「괌은 국가가 미국이잖아」(사용자)
--
-- 괌·사이판은 미국, 홍콩·마카오는 중국, 타히티는 프랑스입니다.
-- ⚠ **도시는 그대로 「괌」으로 남습니다.** 바뀌는 것은 «세는 법»뿐입니다.
--
-- ⚠⚠ **왜 고쳐야 하나** — 앱이 두 가지 수를 말하고 있었습니다.
--   깃발 벽과 홈의 깃발 줄은 UN 195 «안에 드는 것»만 셉니다(un.js).
--   그런데 서버(my_footprint)는 그 구분 없이 distinct country 를 셌습니다.
--   홍콩만 다녀온 사람은 홈에서 「1개국」인데 깃발 벽은 0개 — 분모(195)에
--   없는 코드를 분자에서 세고 있었기 때문입니다.
--
-- ⚠ **한 곳에만 적습니다.** 앞가림 표를 코드에도 적어두면 언젠가 한쪽만
--   고칩니다(이 저장소가 몇 번 겪은 일입니다). `countries.parent_code` 가
--   유일한 자리이고, 화면 쪽은 이 칸을 받아서 씁니다(cities.js 의 `cc`).
--
-- ⚠ 대만(TW)은 **여기 없습니다.** UN 회원국이 아니지만 모국도 없습니다 —
--   따로 정해야 할 문제라 이 판에서는 손대지 않았습니다.
--
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

alter table public.countries
  add column if not exists parent_code text references public.countries(code);

comment on column public.countries.parent_code is
  '속령이면 모국의 코드. 나라 수를 셀 때 이 값으로 셉니다(괌→US).';

update public.countries c set parent_code = v.p
  from (values ('GU','US'), ('MP','US'), ('HK','CN'), ('MO','CN'), ('PF','FR'))
       as v(code, p)
 where c.code = v.code and c.parent_code is distinct from v.p;


-- ── 발자국 다시 쓰기 ─────────────────────────────────────────────────
-- 014 의 것과 **한 군데만 다릅니다** — `been` 이 모국으로 접습니다.
-- ⚠ `my_counts`(배지)는 이 함수를 «부르므로» 같이 맞춰집니다(057).
--   식을 옮겨 적지 마십시오 — 057 이 바로 그것을 고친 커밋입니다.
create or replace function public.my_footprint()
returns jsonb
language sql stable security definer set search_path = public as $$
  with been as (
    select v.city_id,
           /* 속령이면 모국. 대륙도 모국 것을 씁니다 — 괌을 오세아니아로
              두면 「미국 = 북아메리카」와 어긋나 대륙 합이 안 맞습니다. */
           coalesce(n.parent_code, c.country)        as country,
           coalesce(np.continent, n.continent)       as continent
      from public.my_visited() v
      join public.cities c          on c.id = v.city_id
      left join public.countries n  on n.code = c.country
      left join public.countries np on np.code = n.parent_code
  )
  select jsonb_build_object(
    'cities',    (select count(*) from been),
    'countries', (select count(distinct country) from been),
    'rated',     (select count(*) from public.city_ratings
                   where user_id = auth.uid() and stars is not null),
    'wants',     (select count(*) from public.city_ratings
                   where user_id = auth.uid() and want),
    'trips',     (select count(*) from public.trip_members m
                   join public.trips t on t.id = m.trip_id
                  where m.user_id = auth.uid() and m.left_at is null
                    and t.end_date < current_date),
    'by_continent', coalesce((
      select jsonb_object_agg(k, n) from (
        select coalesce(continent, '기타') as k, count(distinct country) as n
          from been group by 1
      ) x), '{}'::jsonb)
  );
$$;
grant execute on function public.my_footprint() to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '모국이 붙은 나라'::text as 확인,
         coalesce((select string_agg(code || '→' || parent_code, ' ' order by code)
                     from public.countries where parent_code is not null), '없음') as 결과
  union all
  select 2, 'parent_code 칸이 생겼나',
         case when exists (select 1 from information_schema.columns
                            where table_schema='public' and table_name='countries'
                              and column_name='parent_code')
              then '예' else '아니오' end
  union all
  select 3, 'my_footprint 살아 있나',
         case when has_function_privilege('authenticated','public.my_footprint()','execute')
              then '예' else '아니오' end
) t order by ord;
