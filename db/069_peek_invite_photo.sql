-- 069_peek_invite_photo.sql
-- 초대 링크 미리보기 카드에 쓸 사진을 peek_invite 가 같이 돌려줍니다.
--
-- 왜 서버에서 고르나:
--   카톡·아이메시지 같은 메신저는 링크를 받으면 **자바스크립트를 안 돌립니다.**
--   주소만 받아서 <meta og:> 만 읽고 카드를 만듭니다. 그래서 앱 안에서
--   `tripPhoto()` 로 아무리 잘 골라도 그건 카드에 못 들어갑니다.
--   카드를 만드는 쪽(join 엣지 함수)이 SQL 한 번으로 다 받아야 합니다.
--
-- 고르는 순서는 app.js 의 `tripPhoto()` 와 **일부러 같게** 맞춰뒀습니다.
-- 카드에서 본 사진과 앱에 들어와서 보는 사진이 다르면 잘못 온 줄 압니다.
--   1) 구간에 붙은 도시 사진(제일 이른 구간부터)
--   2) 목적지 이름과 같은 도시
--   3) 같은 나라의 대표 도시 — pop_rank → fame → 이름순
--      ⚠ 이건 그 사람이 가는 곳이 아닙니다. 분위기입니다.
--      어디로 가는지는 카드의 **글자**가 말합니다(og:description).
--
-- 나가는 것이 늘어나는 것에 대해:
--   image_url 은 cities 의 공개 사진입니다. 초대 코드를 가진 사람에게만
--   나가고, 이미 title·destination·날짜가 나가고 있었습니다. 새로 새는 것 없음.

create or replace function public.peek_invite(p_code text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when t.id is null then null else jsonb_build_object(
    'title', t.title, 'destination', t.destination,
    'start_date', t.start_date, 'end_date', t.end_date,
    'role', i.role,
    'image_url', coalesce(
      (select c.image_url
         from public.trip_legs l join public.cities c on c.id = l.city_id
        where l.trip_id = t.id and c.image_url is not null
        order by l.start_date limit 1),
      (select c.image_url from public.cities c
        where c.name = t.destination and c.image_url is not null limit 1),
      (select c.image_url from public.cities c
        where c.country = coalesce(
                (select l.country from public.trip_legs l
                  where l.trip_id = t.id and l.country is not null
                  order by l.start_date limit 1), t.country)
          and c.image_url is not null
        order by c.pop_rank nulls last, c.fame nulls last, c.name limit 1)
    ),
    'expired', (i.expires_at < now() or i.uses >= i.max_uses)
  ) end
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where i.code = upper(trim(p_code));
$$;

grant execute on function public.peek_invite(text) to anon, authenticated;


-- 확인: 아무 초대나 하나 골라 사진이 붙는지 봅니다.
-- image_url 이 null 이면 그 여행은 구간에 도시가 안 붙어 있고
-- 나라에도 사진 있는 도시가 없다는 뜻입니다(우리 도시 469곳은 전부 사진이
-- 있으므로, 실제로는 country 가 목록에 없는 경우뿐입니다).
select i.code,
       (public.peek_invite(i.code) ->> 'title')     as title,
       (public.peek_invite(i.code) ->> 'image_url') as photo
from public.trip_invites i
limit 5;
