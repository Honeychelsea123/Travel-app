-- =====================================================================
-- 새로 넣은 도시의 fame 을 바로잡습니다 (2등급 72 · 3등급 156)
--
-- ⚠⚠ **`fame` 은 작을수록 유명합니다**(db/033):
--     1 누구나 아는 곳(도쿄·파리·뉴욕) · 2 여행 좀 다니면 아는 곳 ·
--     3 덜 알려진 곳
--   그런데 db/075 는 **인구가 많을수록 3** 을 줬습니다. 정확히 거꾸로입니다.
--   그대로 두면 성향 카드의 「남들이 안 가는 도시 매니아」 판정이 뒤집히고
--   (card.js 의 avgFame), 추천 가중치도 반대로 갑니다(rec.js 의 `3 - fame`).
--
-- ⚠ **인구로는 못 정합니다.** 카라치·라고스·킨샤사는 200만이 넘지만 한국
--   사람은 모릅니다. fame 은 **한국인 기준의 «알려짐»**이지 크기가 아닙니다.
--   그래서 이렇게 매깁니다:
--     · 손으로 고른 여행지 · 한국 여행지 · 그 나라 최대 도시 ..... 2
--     · 나머지 .................................................. 3
--   **1 은 안 씁니다.** 「누구나 아는 곳」은 이미 기존 469곳에 다 있습니다.
--
-- ⚠ **절대값을 넣습니다**(뒤집기가 아니라). 여러 번 돌려도 같은 결과입니다 —
--   뒤집기로 짜면 두 번 돌렸을 때 도로 거꾸로 갑니다.
-- ⚠ 077 을 먼저 돌리십시오. 여기 목록은 **살아남은 도시**만 담고 있습니다.
--
-- 만든 것: tools/famefix.pl
-- =====================================================================

update public.cities set fame = 2 where id in (
    'mar-del-plata', 'zell-am-see', 'bad-ischl', 'locarno', 'lauterbrunnen', 'antofagasta', 'ostrava', 'regensburg',
    'rothenburg-ob-der-tauber', 'odense', 'salamanca', 'santiago-de-compostela', 'ibiza', 'vantaa', 'nimes', 'aix-en-provence',
    'rouen', 'biarritz', 'chamonix-mont-blanc', 'delphi', 'sibenik', 'pest', 'medan', 'makassar',
    'manado', 'ubud', 'akureyri', 'lucca', 'matera', 'assisi', 'battambang', 'boryeong',
    'buan', 'danyang', 'donghae', 'ganghwa', 'gangjin', 'geochang', 'gochang', 'gunsan',
    'icheon', 'inje', 'mungyeong', 'namhae', 'namwon', 'samcheok', 'sancheong', 'ulleung',
    'wando', 'yangpyeong', 'yangyang', 'yeongju', 'yeongwol', 'shymkent', 'pakse', 'negombo',
    'kuching', 'biratnagar', 'napier', 'wanaka', 'callao', 'iloilo', 'bacolod-city', 'lublin',
    'moscow', 'linkoeping', 'surat-thani', 'sanliurfa', 'goereme', 'nantou', 'pingtung', 'pretoria'
);

update public.cities set fame = 3 where id in (
    'andorra-la-vella', 'kabul', 'saint-john-s', 'tirana', 'yerevan', 'gyumri', 'luanda', 'ganja',
    'sarajevo', 'bridgetown', 'dhaka', 'ouagadougou', 'varna', 'ar-rifa', 'bujumbura', 'parakou',
    'thimphu', 'gaborone', 'minsk', 'belize-city', 'lubumbashi', 'bangui', 'brazzaville', 'abidjan',
    'puerto-montt', 'douala', 'santiago-de-cuba', 'las-tunas', 'mindelo', 'nicosia', 'liberec', 'djibouti',
    'esbjerg', 'randers', 'roseau', 'santo-domingo', 'algiers', 'guayaquil', 'ambato', 'narva',
    'asmara', 'addis-ababa', 'oulu', 'lautoka', 'weno', 'libreville', 'saint-george-s', 'batumi',
    'gori', 'kumasi', 'bakau', 'conakry', 'malabo', 'guatemala-city', 'quetzaltenango', 'bissau',
    'new-amsterdam', 'san-pedro-sula', 'port-de-paix', 'buda', 'debrecen', 'south-dublin', 'jerusalem', 'netanya',
    'baghdad', 'mashhad', 'keflavik', 'kingston', 'irbid', 'nakuru', 'osh', 'tarawa',
    'moroni', 'kuwait-city', 'aktobe', 'beirut', 'castries', 'vaduz', 'monrovia', 'maseru',
    'siauliai', 'luxembourg', 'benghazi', 'monaco', 'chisinau', 'niksic', 'antananarivo', 'majuro',
    'skopje', 'bamako', 'mandalay', 'ulan-bator', 'baruun-urt', 'nouakchott', 'sliema', 'curepipe',
    'blantyre', 'nampula', 'windhoek', 'niamey', 'lagos-ng', 'managua', 'bhaktapur', 'baiti',
    'seeb', 'panama-city', 'lae', 'rawalpindi', 'bydgoszcz', 'gaza', 'ngerulmud', 'ciudad-del-este',
    'iasi', 'novi-sad', 'saint-petersburg', 'novosibirsk', 'yekaterinburg', 'kigali', 'jeddah', 'tulagi',
    'omdurman', 'vaesteras', 'marina-bay', 'nitra', 'freetown', 'borgo-maggiore', 'dakar', 'mogadishu',
    'paramaribo', 'juba', 'santo-antonio', 'san-salvador', 'aleppo', 'lobamba', 'n-djamena', 'lome',
    'dushanbe', 'dili', 'ashgabat', 'sousse', 'nuku-alofa', 'port-of-spain', 'funafuti', 'dar-es-salaam',
    'kyiv', 'dnipro', 'kampala', 'maldonado', 'vatican-city', 'kingstown', 'caracas', 'luganville',
    'apia', 'sanaa', 'ndola', 'bulawayo'
);

-- ── 확인 ─────────────────────────────────────────────────────────────
-- 1등급은 기존 469곳에서만 나와야 합니다(새로 넣은 것에는 1 이 없습니다).
select * from (
  select 1 as ord, 'fame 1 (누구나 아는 곳)'::text as 확인,
         count(*)::text as 결과 from public.cities where fame = 1
  union all
  select 2, 'fame 2', count(*)::text from public.cities where fame = 2
  union all
  select 3, 'fame 3', count(*)::text from public.cities where fame = 3
  union all
  select 4, 'fame 이 빈 곳', count(*)::text from public.cities where fame is null
  union all
  select 5, '미국에서 제일 유명한 다섯',
         (select string_agg(name, ' ' order by fame, name)
            from (select name, fame from public.cities
                   where country = 'US' and fame is not null
                   order by fame, name limit 5) x)
) t order by ord;
