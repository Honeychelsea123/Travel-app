-- =====================================================================
-- 같은 곳이 두 번 들어간 것 지우기 · 첫 화면에 뜨는 이름 손보기
--
-- 사용자: 「첫화면에 나하가 왜있어 여기가 어딘지도 모르는사람이 대부분일텐데」
--
-- ⚠⚠ **나하와 오키나와는 좌표가 260m 차이입니다.** 같은 곳입니다.
--   이름이 다르니 이름 검사로는 안 걸렸습니다 —
--   **「이름이 다르다」와 「다른 곳이다」는 다릅니다.**
--   그래서 726곳을 좌표로 전부 훑었습니다(scratchpad/nearby.pl, 25km 안).
--   40쌍이 걸렸고 대부분은 진짜로 다른 곳이었습니다(파리↔베르사유 17km,
--   로마↔바티칸 3.5km — 나라가 다릅니다). 아래 여섯만 «같은 곳»입니다.
--
-- ⚠ 지우기 전에 **쓰이고 있는지 확인했습니다** — 별점·찜·여행 일정 모두
--   0건입니다. 하나라도 걸려 있었으면 그 사람 기록이 사라집니다.
--
-- 084 다음에 실행합니다. 여러 번 실행해도 안전합니다.
-- =====================================================================

-- ── ⓪ 별점·찜·일기를 «살아남는 도시»로 옮깁니다 (b687 에 더함) ───────
-- ⚠⚠ **`city_ratings.city_id` 는 `on delete cascade` 입니다**(db/012).
--   도시를 그냥 지우면 그 도시에 매긴 **별점·찜·한줄평·일기·다녀온 날짜가
--   말없이 같이 사라집니다.**
--   이 파일을 처음 쓴 날(2026-09-05)에는 여섯 곳 다 0건이었지만, 그 뒤로
--   나하를 매기셨을 수 있습니다. 그래서 **옮기고 나서 지웁니다.**
-- ⚠ `trip_legs.city_id` 는 `on delete set null` 이라 일정은 안 지워지지만
--   도시 연결이 끊깁니다. 그것도 옮깁니다.
--
-- ⚠⚠ **임시 표를 만들지 않습니다.** 처음엔 `create temporary table _merge`
--   로 짰는데, Supabase SQL 편집기가 **「RLS 없이 표를 만든다」고 경고**합니다
--   (임시 표는 그 세션에만 살아서 실제로는 위험하지 않지만, 경고를 넘기려고
--   RLS 를 켜는 것도 이상합니다). 짝 목록을 **그 자리에서 values 로** 씁니다.

-- (가) 살아남는 쪽에 아직 줄이 없으면 통째로 옮깁니다.
update public.city_ratings r
   set city_id = m.keep
  from (values ('naha','okinawa'), ('ulan-bator','ulaanbaatar'),
               ('buda','budapest'), ('pest','budapest'),
               ('marina-bay','singapore'), ('south-dublin','dublin')
       ) as m(dead, keep)
 where r.city_id = m.dead
   and not exists (select 1 from public.city_ratings x
                    where x.user_id = r.user_id and x.city_id = m.keep);

-- (나) 둘 다 매긴 사람은 «센 쪽»으로 합칩니다. 남은 죽는 쪽 줄은 아래
--      delete 의 cascade 로 사라집니다.
update public.city_ratings k
   -- ⚠⚠ **`nullif` 없이 `greatest` 만 쓰면 터집니다.** 둘 다 별점이 없으면
   --   0.0 이 되는데 stars 는 0.5~5.0 만 받습니다(db/012 의 체크 제약).
   --   처음엔 «뒤에서 null 로 되돌리기»로 막으려 했는데, **제약은 그 자리에서
   --   걸립니다** — 실제로 `23514 city_ratings_stars_check` 로 터졌습니다
   --   (okinawa, 0.0). 나중에 고치는 것으로는 못 막습니다.
   set stars         = nullif(greatest(coalesce(k.stars, 0), coalesce(d.stars, 0)), 0),
       been          = k.been or d.been,
       want          = k.want or d.want,
       comment       = coalesce(k.comment, d.comment),
       journal       = coalesce(k.journal, d.journal),
       journal_photo = coalesce(k.journal_photo, d.journal_photo),
       visited_on    = least(k.visited_on, d.visited_on),
       updated_at    = now()
  from (values ('naha','okinawa'), ('ulan-bator','ulaanbaatar'),
               ('buda','budapest'), ('pest','budapest'),
               ('marina-bay','singapore'), ('south-dublin','dublin')
       ) as m(dead, keep)
  join public.city_ratings d
    on d.city_id = m.dead
 where k.city_id = m.keep
   and k.user_id = d.user_id;
-- (다) 일정의 도시 연결도 옮깁니다.
update public.trip_legs l
   set city_id = m.keep
  from (values ('naha','okinawa'), ('ulan-bator','ulaanbaatar'),
               ('buda','budapest'), ('pest','budapest'),
               ('marina-bay','singapore'), ('south-dublin','dublin')
       ) as m(dead, keep)
 where l.city_id = m.dead;

-- 옮긴 뒤 «남은 것»을 눈으로 확인하십시오. 다 0 이어야 합니다.
select m.dead, m.keep,
       (select count(*) from public.city_ratings r where r.city_id = m.dead) as 남은별점,
       (select count(*) from public.trip_legs   l where l.city_id = m.dead) as 남은일정
  from (values ('naha','okinawa'), ('ulan-bator','ulaanbaatar'),
               ('buda','budapest'), ('pest','budapest'),
               ('marina-bay','singapore'), ('south-dublin','dublin')
       ) as m(dead, keep);

-- ── ① 같은 곳이 두 번 ────────────────────────────────────────────────
delete from public.cities where id in (
  'naha',          -- 오키나와와 0.25km. 한국에서는 「오키나와」로 부릅니다.
  'ulan-bator',    -- 울란바토르와 2.9km. **같은 도시의 두 가지 한글 표기**입니다.
  'buda',          -- 부다페스트와 0.57km. 부다는 부다페스트의 서쪽 절반입니다.
  'pest',          -- 부다페스트와 3.2km. 페슈트는 동쪽 절반입니다.
  'marina-bay',    -- 싱가포르와 9km. 싱가포르 안의 한 구역입니다.
  'south-dublin'   -- 더블린과 8.5km. 행정구역이지 따로 가는 곳이 아닙니다.
);

-- ⚠ 괴레메(0.03km!)와 카파도키아는 **안 지웁니다.** 좌표가 같은 것은
--   카파도키아 좌표를 괴레메로 잡아 놓았기 때문인데, 둘 다 실제로 쓰이는
--   이름입니다(카파도키아=지역, 괴레메=그 안의 마을). 좌표만 갈라 둡니다.
update public.cities set center_lat = 38.6431, center_lng = 34.8289
 where id = 'cappadocia' and center_lat = 38.6431 and center_lng = 34.8289;
-- (위 줄은 아무것도 안 바꿉니다 — 지금 값을 적어 둔 것입니다. 카파도키아
--  중심을 옮기려면 여기서 바꾸십시오. 괴레메는 38.6431/34.8289 입니다.)

-- ── ② 첫 화면에 뜨는 이름(fame 1) 손보기 ─────────────────────────────
-- ⚠⚠ **fame 1 이 80곳이나 됩니다.** 그 안에서는 가나다순이라 목록이
--   「괌·나라·나트랑·나하」로 시작합니다. 정렬이 틀린 것이 아니라
--   **1 등급이 너무 넓은 것**입니다.
-- ⚠ `fame` 은 **작을수록 유명합니다**(db/033).
--
-- 일본 쪽 넷을 2 로 내립니다. 도쿄·오사카·교토·후쿠오카·삿포로·오키나와와
-- 같은 칸에 둘 이름들이 아닙니다:
update public.cities set fame = 2
 where id in ('nara', 'nagoya', 'yufuin') and fame = 1;

-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '도시 전체'::text as 확인, count(*)::text as 결과
    from public.cities
  union all
  select 2, '지운 것이 남아 있나',
         coalesce((select string_agg(id, ' ') from public.cities
                    where id in ('naha','ulan-bator','buda','pest',
                                 'marina-bay','south-dublin')), '없음 (다 지워짐)')
  union all
  select 3, 'fame 1 개수', (select count(*)::text from public.cities where fame = 1)
  union all
  select 4, 'fame 1 앞 열둘(가나다)',
         (select string_agg(name, ' ' order by name)
            from (select name from public.cities where fame = 1
                   order by name limit 12) x)
  union all
  -- 지운 도시에 딸린 것이 정말 없었는지 다시 봅니다.
  select 5, '고아가 된 별점', (select count(*)::text from public.city_ratings r
     where not exists (select 1 from public.cities c where c.id = r.city_id))
  union all
  select 6, '사진·소개글 빈 곳',
         (select count(*)::text from public.cities
           where image_url is null or summary is null)
) t order by ord;
