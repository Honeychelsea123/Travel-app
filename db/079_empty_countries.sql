-- =====================================================================
-- 도시가 하나도 없어진 나라 셋 되살리기 + 몬터레이 fame
--
-- 077 을 넣고 확인 쿼리 4번이 알려줬습니다: **BS KN SC** 에 도시가 0.
--   바하마(나사우) · 세인트키츠 네비스(바스테르) · 세이셸(빅토리아)
--
-- ⚠⚠ **애초에 도시를 늘린 이유가 「간 나라를 갔다고 말할 자리」였습니다.**
--   도시가 0 이면 그 나라는 앱에서 존재하지 않는 것과 같습니다 — 깃발도
--   못 켜고 평가도 못 합니다. 정리하다 목적을 깎아먹은 셈입니다.
--   ⚠ 세 곳 다 **자료는 멀쩡했습니다.** 위키백과 «이름 찾기»에서만 떨어졌고
--     (나사우는 7,559km 떨어진 독일 문서에, 바스테르·빅토리아는 동음이의),
--     좌표·시간대는 GeoNames 것 그대로입니다.
--   → **삭제 규칙에 「그 나라의 마지막 도시는 안 지운다」가 있었어야 합니다.**
--     다음에 정리할 때 넣으십시오(tools/cullsql.pl).
--
-- ⚠ 몬터레이는 077 에서 **살아남았습니다.** `michie` 를 지우는 목록에 넣어
--   뒀는데, 같은 파일의 update 가 먼저 돌아 `monterey` 로 이름을 바꿔서
--   delete 가 못 찾았습니다(그래서 도시 수가 697 이 아니라 698 입니다).
--   결과는 오히려 잘 됐지만 **문장 차례에 기댄 우연**이었습니다.
--   078 은 `michie` 를 아예 안 건드리므로 fame 이 1(누구나 아는 곳)로 남습니다.
--   여기서 2 로 내립니다.
--
-- 077 · 078 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

insert into public.cities
  (id, name, name_en, country, center_lat, center_lng, timezone, currency, transit_grade, fame)
select v.id, v.name, v.name_en, v.country, v.lat, v.lng, v.tz, c.currency, v.grade, v.fame
from (values
  ('nassau',      '나사우',   'Nassau',     'BS',  25.05823, -77.34306, 'America/Nassau',    'normal',  3),
  ('basseterre',  '바스테르', 'Basseterre', 'KN',  17.29550, -62.72499, 'America/St_Kitts',  'limited', 3),
  ('victoria-sc', '빅토리아', 'Victoria',   'SC',  -4.62001,  55.45501, 'Indian/Mahe',       'limited', 3)
) as v(id, name, name_en, country, lat, lng, tz, grade, fame)
join public.countries c on c.code = v.country
on conflict do nothing;

update public.cities set fame = 2 where id = 'monterey' and fame is distinct from 2;


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 1번이 701 이어야 합니다(698 + 3).
select * from (
  select 1 as ord, '도시 전체'::text as 확인, count(*)::text as 결과
    from public.cities
  union all
  select 2, '도시가 없는 나라',
         coalesce((select string_agg(n.code, ' ' order by n.code)
                     from public.countries n
                    where not exists (select 1 from public.cities x
                                       where x.country = n.code)), '없음')
  union all
  select 3, '몬터레이 fame',
         coalesce((select fame::text from public.cities where id = 'monterey'), '없음')
  union all
  select 4, 'fame 이 빈 도시', count(*)::text from public.cities where fame is null
) t order by ord;
