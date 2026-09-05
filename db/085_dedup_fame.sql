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
