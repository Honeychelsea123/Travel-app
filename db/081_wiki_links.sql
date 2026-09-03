-- =====================================================================
-- 빠져 있던 위키 링크 15곳
--
-- 소개글은 있는데 `summary_url` 이 비어 있던 곳들입니다(기존 469곳의 옛 누락).
--
-- ⚠⚠ **이름으로만 찾으면 안 됩니다.** 오스틴·피닉스·포틀랜드·워싱턴·
--   산호세·카르타헤나·퀸스타운은 세계 여러 곳에 있는 이름입니다.
--   그래서 **문서의 좌표가 우리 좌표와 80km 안인지** 확인했습니다.
--   b654 에 나사우(BS)가 7,559km 떨어진 독일 문서에 걸린 적이 있습니다 —
--   **이름이 같다는 것은 같은 곳이라는 뜻이 아닙니다.**
-- ⚠ 이름으로 안 되면 좌표로 근처 문서를 받아 이름이 맞는 것을 골랐습니다.
--   그것도 없으면 **안 채웁니다** — 틀린 링크보다 빈 칸이 낫습니다.
--
-- 여러 번 실행해도 안전합니다. 만든 것: tools/wikilink.pl
-- =====================================================================

update public.cities c set summary_url = v.url
from (values
  ('austin', 'https://ko.wikipedia.org/wiki/%EC%98%A4%EC%8A%A4%ED%8B%B4_(%ED%85%8D%EC%82%AC%EC%8A%A4%EC%A3%BC)'),
  ('cartagena', 'https://ko.wikipedia.org/wiki/%EC%B9%B4%EB%A5%B4%ED%83%80%ED%97%A4%EB%82%98_(%EC%BD%9C%EB%A1%AC%EB%B9%84%EC%95%84)'),
  ('goldcoast', 'https://ko.wikipedia.org/wiki/%EA%B3%A8%EB%93%9C%EC%BD%94%EC%8A%A4%ED%8A%B8_(%ED%80%B8%EC%A6%90%EB%9E%9C%EB%93%9C%EC%A3%BC)'),
  ('hualien', 'https://ko.wikipedia.org/wiki/%ED%99%94%EB%A1%84%EC%8B%9C'),
  ('ishigaki', 'https://ko.wikipedia.org/wiki/%EC%9D%B4%EC%8B%9C%EA%B0%80%ED%82%A4%EC%8B%9C'),
  ('jeju', 'https://ko.wikipedia.org/wiki/%EC%A0%9C%EC%A3%BC%EC%8B%9C'),
  ('nagano', 'https://ko.wikipedia.org/wiki/%EB%82%98%EA%B0%80%EB%85%B8%EC%8B%9C'),
  ('niigata', 'https://ko.wikipedia.org/wiki/%EB%8B%88%EA%B0%80%ED%83%80%EC%8B%9C'),
  ('phoenix', 'https://ko.wikipedia.org/wiki/%ED%94%BC%EB%8B%89%EC%8A%A4_(%EC%95%A0%EB%A6%AC%EC%A1%B0%EB%82%98%EC%A3%BC)'),
  ('portland', 'https://ko.wikipedia.org/wiki/%ED%8F%AC%ED%8B%80%EB%9E%9C%EB%93%9C_(%EC%98%A4%EB%A6%AC%EA%B1%B4%EC%A3%BC)'),
  ('queenstown', 'https://ko.wikipedia.org/wiki/%ED%80%B8%EC%8A%A4%ED%83%80%EC%9A%B4_(%EB%89%B4%EC%A7%88%EB%9E%9C%EB%93%9C)'),
  ('sanjose', 'https://ko.wikipedia.org/wiki/%EC%82%B0%ED%98%B8%EC%84%B8_(%EC%BD%94%EC%8A%A4%ED%83%80%EB%A6%AC%EC%B9%B4)'),
  ('shizuoka', 'https://ko.wikipedia.org/wiki/%EC%8B%9C%EC%A6%88%EC%98%A4%EC%B9%B4%EC%8B%9C'),
  ('takayama', 'https://ko.wikipedia.org/wiki/%EB%8B%A4%EC%B9%B4%EC%95%BC%EB%A7%88%EC%8B%9C'),
  ('washington', 'https://ko.wikipedia.org/wiki/%EC%9B%8C%EC%8B%B1%ED%84%B4_D.C.')
) as v(id, url)
where c.id = v.id and (c.summary_url is null or c.summary_url = '');

-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '링크가 있는 도시'::text as 확인, count(*)::text as 결과
    from public.cities where summary_url is not null and summary_url <> ''
  union all
  select 2, '소개글은 있는데 링크가 없는 곳',
         coalesce((select string_agg(name, ' ' order by name) from public.cities
                    where summary is not null
                      and (summary_url is null or summary_url = '')), '없음')
) t order by ord;
