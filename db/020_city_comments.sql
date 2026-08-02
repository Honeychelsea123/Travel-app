-- =====================================================================
-- 도시 한 줄평을 남들에게도 보이게 한다
--
-- 지금 city_ratings 는 자기 것만 보입니다. 그래야 누가 어디 다녀왔는지가
-- 새지 않기 때문입니다. 그런데 한 줄평은 남들에게 보이라고 쓰는 것입니다.
--
-- 그래서 이렇게 나눕니다:
--   별점만 매기면  → 익명 집계(평균·인원수)에만 들어간다
--   한 줄평을 쓰면 → 이름과 함께 공개된다
-- 쓰는 사람이 스스로 고르는 셈이라 몰래 새는 일이 없습니다.
--
-- 019 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

create or replace function public.city_comments(p_city text)
returns table (
  user_id     uuid,
  name        text,
  avatar_url  text,
  stars       numeric,
  comment     text,
  created_at  timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.user_id,
         coalesce(p.display_name, '이름 없음'),
         p.avatar_url,
         r.stars,
         r.comment,
         r.updated_at
    from public.city_ratings r
    left join public.profiles p on p.id = r.user_id
   where r.city_id = p_city
     and r.comment is not null
     and length(btrim(r.comment)) > 0
   order by r.updated_at desc
   limit 50;
$$;
grant execute on function public.city_comments(text) to anon, authenticated;


-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '한 줄평 함수'::text as check,
         case when has_function_privilege('authenticated',
                'public.city_comments(text)', 'execute')
              then 'OK' else 'X' end as result,
         '한 줄평을 쓴 사람만 이름이 나갑니다'::text as note
  union all
  select 2, '별점만 매긴 사람',
         'OK',
         '이름이 안 나갑니다 — 평균과 인원수에만 들어갑니다'
  union all
  select 3, '지금 한 줄평 수',
         'OK',
         (select count(*)::text from public.city_ratings
           where comment is not null and length(btrim(comment)) > 0) || '개'
) t order by ord;
