-- =====================================================================
-- 도시 목록 정리 — 454곳 삭제 (1,151 → 697)
--
-- 사용자: 「마이너한 도시들이 너무 많이 생겼던데 이미지랑 위키백과 내용
--   다 긁어올 수 있는 도시만 넣어야해」 · 「사진이랑 설명 넣을 수 있는곳만
--   살리자」 · 「다 조금씩 줄이자 한국인 아무도 안가는데도 많이 들어간거
--   같은데」 · 「북한은 삭제해」
--
-- 무엇을 지우나 (넷을 합친 것입니다):
--   ① 한국어 위키백과에 «사진 있는 문서»가 없는 곳 ......... 96
--      ⚠ 이름만으로 찾으면 「님」·「팔마」·「코르도바」가 동음이의 문서에
--        걸립니다. 그래서 **좌표로 다시 찾아** 10km 안의 문서 중 이름이
--        맞는 것만 인정했습니다(2차). 좌표 확인이 실제로 일했습니다 —
--        나사우(BS)는 7,559km 떨어진 딴 문서에, 리베리아(CR)는 나라
--        「라이베리아」 문서에 걸려 있었습니다.
--        **이름이 같다는 것은 같은 곳이라는 뜻이 아닙니다.**
--   ② 일본 과다분 .......................................... 18
--      이번에 넣은 26곳 중 여덟만 남깁니다(미야지마·고야산·가루이자와·
--      니세코·노보리베쓰·구사쓰·하쿠바·아타미 — 세계유산·스키·온천).
--   ③ 북한 ................................................. 3
--   ④ 나라별 상한 초과 .................................... 나머지
--      한국인 출국 통계 기준(계획서). 그 밖의 나라는 **1곳** — 애초에
--      도시를 늘린 이유가 「간 나라를 갔다고 말할 자리」였고, 두 곳째부터는
--      아무도 안 누릅니다. 결과: 1곳 114개국 · 2곳 22개국 · 3곳 11개국.
--
-- ⚠⚠ **기존 469곳은 하나도 안 건드립니다.** 사진과 소개글이 손으로 채워져
--   있고(469/469), 그 자체가 「넣을 만한 곳」이라는 증거입니다. 아래 목록은
--   전부 db/075 로 들어간 것들입니다.
--
-- ⚠ **누가 쓰고 있는 도시는 안 지웁니다.** 아래 `not exists` 넷이 막습니다.
--   외래키가 `on delete cascade` 라 그냥 지우면 **남의 별점과 일기가 같이
--   사라집니다.** 오늘 넣은 것이라 아무도 안 썼겠지만, 그 가정에 기대지
--   않습니다. 못 지운 것이 있으면 아래 확인 쿼리 2번이 알려줍니다.
--
-- 여러 번 실행해도 안전합니다.
-- 만든 것: tools/cullsql.pl (고르는 규칙은 tools/wikigate.pl · citytrim.pl)
-- =====================================================================

-- ── 먼저: 잘못 들어간 도시 고치기 ────────────────────────────────────
-- ⚠⚠ **이름으로 GeoNames 를 찾을 때 «별칭»까지 훑은 것이 문제였습니다.**
--   별칭이 먼저 걸리면 엉뚱한 마을이 들어옵니다. 넷이 그랬습니다:
--     오쓰→Ozu(에히메) · 가와고에→Toyoda · 후쿠야마→Okugano ·
--     몬터레이→Michie(테네시!)
--   앞의 셋은 아래 삭제 목록에 들어 있고, 몬터레이만 남으므로 여기서
--   바로잡습니다. 캘리포니아 몬터레이(36.60024, -121.89468, 인구 28,338).
--   ⚠ 다음에 목록을 만들 때는 **이름 일치를 별칭보다 우선**해야 합니다.
--     tools/citypick.pl 의 `%색인` 에 적어 뒀습니다.
update public.cities
   set id = 'monterey', name_en = 'Monterey',
       center_lat = 36.60024, center_lng = -121.89468,
       timezone = 'America/Los_Angeles'
 where id = 'michie'
   and not exists (select 1 from public.cities x where x.id = 'monterey');


-- ── 지우기 ───────────────────────────────────────────────────────────
delete from public.cities c
 where c.id in (
   'aalborg', 'abashiri', 'abeche', 'abuja', 'accra', 'aden', 'aghdam', 'aizu-wakamatsu',
   'akita', 'al-khawr', 'alajuela', 'alberobello', 'alesund', 'alice-springs', 'andijon', 'annaba',
   'antsirabe', 'appenzell', 'ascona', 'asheville', 'aspen', 'astara', 'asuncion', 'atakpame',
   'atami', 'baden-baden', 'bago', 'bahir-dar', 'bamberg', 'bamenda', 'banja-luka', 'banjul',
   'barranquilla', 'basseterre', 'bata', 'beira', 'belmopan', 'belo-horizonte', 'bender', 'berbera',
   'bergamo', 'bharatpur', 'bialystok', 'bitola', 'bloemfontein', 'bo', 'bobo-dioulasso', 'bocaranga',
   'bodo', 'bodrum', 'borama', 'bouake', 'bouar', 'brasov', 'brikama', 'broome',
   'buchanan', 'buon-ma-thuot', 'burgas', 'byron-bay', 'cadiz', 'cali', 'cam-ranh', 'can-tho',
   'canchungo', 'canterbury', 'cao-bang', 'cape-coast', 'capiata', 'carcassonne', 'celje', 'chang-hua',
   'chania', 'charleroi', 'charleston', 'charlottetown', 'chattogram', 'chelyabinsk', 'cheongsong', 'chur',
   'cluj-napoca', 'coban', 'cochabamba', 'codrington', 'colon', 'constanta', 'cordoba-ar', 'cork',
   'cotonou', 'cucuta', 'cuenca', 'curitiba', 'dali', 'damascus', 'dammam', 'darjiling',
   'dasoguz', 'daugavpils', 'david', 'dijon', 'dikhil', 'dodoma', 'dolisie', 'drammen',
   'dumaguete', 'durres', 'east-jerusalem', 'ebebiyin', 'eldoret', 'erdenet', 'esch-sur-alzette', 'esteli',
   'evora', 'fergana', 'fethiye', 'fontvieille', 'fortaleza', 'franceville', 'francistown', 'frederiksberg',
   'fukui-shi', 'funchal', 'gent', 'georgetown', 'gifu', 'girona', 'gisenyi', 'gitarama',
   'gonder', 'gqeberha', 'guiyang', 'gulu', 'gurye', 'ha-giang', 'hadong', 'haenam',
   'hafnarfjoerdur', 'hagi', 'haifa', 'hakuba', 'halifax', 'hamhung', 'hamyang', 'harare',
   'hat-yai', 'hatsukaichi', 'hebron', 'hikone', 'hoa-binh', 'hoefn', 'homs', 'homyel',
   'hongcheon', 'honiara', 'hradec-kralove', 'hrazdan', 'hrodna', 'huambo', 'hvar', 'ibadan',
   'ibb', 'inuyama', 'inverness', 'ise', 'isfahan', 'isfara', 'ismailia', 'istaravshan',
   'ito', 'iwakuni', 'jackson', 'jacmel', 'jaffna', 'janakpur', 'jeongseon', 'jijiga',
   'jindo', 'jodhpur', 'kaedi', 'kaikoura', 'kairouan', 'kalampaka', 'kampot', 'kananga',
   'kankan', 'kano', 'karachi', 'karaj', 'karakol', 'karatsu', 'karbala', 'karuizawa',
   'kas', 'kaunas', 'kazan', 'kelowna', 'kenema', 'keren', 'key-west', 'kharkiv',
   'khartoum', 'khovd', 'khulna', 'kiffa', 'kinshasa', 'kirkuk', 'kitwe', 'kitzbuehel',
   'klaipeda', 'kochi', 'kochi-in', 'kohtla-jaerve', 'kopavogur', 'korhogo', 'koror', 'kosice',
   'koudougou', 'koya', 'kragujevac', 'kuala-belait', 'kumanovo', 'kunduz', 'kurume', 'kusatsu',
   'kushiro', 'kutaisi', 'kutna-hora', 'kyzylorda', 'la-romana', 'lahore', 'larnaca', 'lecce',
   'legaspi', 'leh', 'leon', 'lhasa', 'liberia', 'liege', 'lilongwe', 'limassol',
   'limon', 'lodz', 'lop-buri', 'lospalos', 'lubango', 'luebeck', 'lusaka', 'lviv',
   'madinah', 'madinat-hamad', 'makkah', 'malakal', 'malang', 'malbork', 'maliana', 'manama',
   'manas', 'mansoa', 'manzini', 'maputo', 'maracaibo', 'maradi', 'massawa', 'maun',
   'mawlamyine', 'mazar-e-sharif', 'mbabane', 'mbarara', 'miaoli', 'michie', 'miskolc', 'miyazaki',
   'mombasa', 'montego-bay', 'morioka', 'mosul', 'moundou', 'multan', 'mutare', 'mwanza',
   'mzuzu', 'nafplio', 'nakhon-ratchasima', 'namangan', 'namp-o', 'nan', 'napa', 'nassau',
   'nay-pyi-taw', 'nazare', 'ninh-binh', 'niseko', 'noboribetsu', 'novo-mesto', 'nukus', 'numazu',
   'nunoa', 'nyala', 'nzerekore', 'obidos', 'obihiro', 'odesa', 'odongk', 'oerebro',
   'okugano', 'olomouc', 'omsk', 'onomichi', 'oral', 'oran', 'ozu', 'palikir',
   'palma', 'parma', 'paro', 'pavlodar', 'pecs', 'perugia', 'peshawar', 'petah-tiqva',
   'phuntsholing', 'pietermaritzburg', 'pilsen', 'piura', 'pljevlja', 'plovdiv', 'pocheon', 'podgorica',
   'pointe-noire', 'port-au-prince', 'port-douglas', 'port-gentil', 'port-louis', 'port-moresby', 'port-vila', 'porto-novo',
   'portofino', 'positano', 'poznan', 'praia', 'puerto-princesa', 'pula', 'pyeongchang', 'pyongyang',
   'qormi', 'rangpur', 'ranong', 'recife', 'rethymno', 'rishikesh', 'rosario', 'rosignol',
   'rufisque', 'rundu', 'saga', 'salta', 'salto', 'samara', 'san-ignacio', 'san-marino',
   'san-miguel-de-tucuman', 'santa-ana', 'santa-clara', 'santa-maria', 'santa-tecla', 'santiago-de-los-caballeros', 'sao-tome', 'savannah',
   'schengen', 'sedona', 'segou', 'selfoss', 'seocheon', 'serravalle', 'sfax', 'shimoda',
   'sidon', 'sikasso', 'sohar', 'sokhumi', 'sokode', 'sopot', 'soweto', 'spanish-town',
   'stara-zagora', 'sucre', 'suez', 'sukhothai', 'sur', 'suva', 'szczecin', 'tabriz',
   'tadjoura', 'taean', 'taebaek', 'tallaght', 'tampere', 'taormina', 'taraz', 'tartu',
   'te-anau', 'tegucigalpa', 'tehran', 'tiraspol', 'toamasina', 'toba', 'tokushima', 'torun',
   'touba', 'toyama', 'toyoda', 'trat', 'trier', 'trieste', 'tripoli', 'tripoli-ly',
   'trogir', 'trondheim', 'trujillo', 'trujillo-pe', 'tuerkmenabat', 'turku', 'tuzla', 'udon-thani',
   'ueruemqi', 'uljin', 'umea', 'uppsala', 'valencia-ve', 'vanadzor', 'victoria-sc', 'vina-del-mar',
   'vinh', 'vlore', 'wakayama', 'wakkanai', 'walvis-bay', 'wau', 'wewak', 'wuzhen',
   'yamagata', 'yangshuo', 'yaounde', 'yaren', 'yeongdeok', 'yonago', 'zagazig', 'zakopane',
   'zarqa', 'zemun', 'zenica', 'zilina', 'zinder', 'zliten'
 )
   /* ⚠ 누가 쓰고 있으면 안 지웁니다 — 외래키가 cascade 라 별점·일기가
      같이 사라집니다. 네 표 모두 `city_id` 를 갖고 있습니다(직접 확인). */
   and not exists (select 1 from public.city_ratings   r where r.city_id = c.id)
   and not exists (select 1 from public.trip_legs      l where l.city_id = c.id)
   and not exists (select 1 from public.journal_photos j where j.city_id = c.id)
   and not exists (select 1 from public.trips          t where t.city_id = c.id);


-- ── 확인 ─────────────────────────────────────────────────────────────
-- 1번이 697 이어야 합니다.
select * from (
  select 1 as ord, '도시 전체'::text as 확인, count(*)::text as 결과
    from public.cities
  union all
  select 2, '못 지운 것(누가 쓰는 중)',
         coalesce((select string_agg(name, ' ' order by name) from public.cities
                    where id in ('aalborg', 'abashiri', 'abeche', 'abuja', 'accra', 'aden', 'aghdam', 'aizu-wakamatsu', 'akita', 'al-khawr', 'alajuela', 'alberobello', 'alesund', 'alice-springs', 'andijon', 'annaba', 'antsirabe', 'appenzell', 'ascona', 'asheville', 'aspen', 'astara', 'asuncion', 'atakpame', 'atami', 'baden-baden', 'bago', 'bahir-dar', 'bamberg', 'bamenda', 'banja-luka', 'banjul', 'barranquilla', 'basseterre', 'bata', 'beira', 'belmopan', 'belo-horizonte', 'bender', 'berbera', 'bergamo', 'bharatpur', 'bialystok', 'bitola', 'bloemfontein', 'bo', 'bobo-dioulasso', 'bocaranga', 'bodo', 'bodrum', 'borama', 'bouake', 'bouar', 'brasov', 'brikama', 'broome', 'buchanan', 'buon-ma-thuot', 'burgas', 'byron-bay', 'cadiz', 'cali', 'cam-ranh', 'can-tho', 'canchungo', 'canterbury', 'cao-bang', 'cape-coast', 'capiata', 'carcassonne', 'celje', 'chang-hua', 'chania', 'charleroi', 'charleston', 'charlottetown', 'chattogram', 'chelyabinsk', 'cheongsong', 'chur', 'cluj-napoca', 'coban', 'cochabamba', 'codrington', 'colon', 'constanta', 'cordoba-ar', 'cork', 'cotonou', 'cucuta', 'cuenca', 'curitiba', 'dali', 'damascus', 'dammam', 'darjiling', 'dasoguz', 'daugavpils', 'david', 'dijon', 'dikhil', 'dodoma', 'dolisie', 'drammen', 'dumaguete', 'durres', 'east-jerusalem', 'ebebiyin', 'eldoret', 'erdenet', 'esch-sur-alzette', 'esteli', 'evora', 'fergana', 'fethiye', 'fontvieille', 'fortaleza', 'franceville', 'francistown', 'frederiksberg', 'fukui-shi', 'funchal', 'gent', 'georgetown', 'gifu', 'girona', 'gisenyi', 'gitarama', 'gonder', 'gqeberha', 'guiyang', 'gulu', 'gurye', 'ha-giang', 'hadong', 'haenam', 'hafnarfjoerdur', 'hagi', 'haifa', 'hakuba', 'halifax', 'hamhung', 'hamyang', 'harare', 'hat-yai', 'hatsukaichi', 'hebron', 'hikone', 'hoa-binh', 'hoefn', 'homs', 'homyel', 'hongcheon', 'honiara', 'hradec-kralove', 'hrazdan', 'hrodna', 'huambo', 'hvar', 'ibadan', 'ibb', 'inuyama', 'inverness', 'ise', 'isfahan', 'isfara', 'ismailia', 'istaravshan', 'ito', 'iwakuni', 'jackson', 'jacmel', 'jaffna', 'janakpur', 'jeongseon', 'jijiga', 'jindo', 'jodhpur', 'kaedi', 'kaikoura', 'kairouan', 'kalampaka', 'kampot', 'kananga', 'kankan', 'kano', 'karachi', 'karaj', 'karakol', 'karatsu', 'karbala', 'karuizawa', 'kas', 'kaunas', 'kazan', 'kelowna', 'kenema', 'keren', 'key-west', 'kharkiv', 'khartoum', 'khovd', 'khulna', 'kiffa', 'kinshasa', 'kirkuk', 'kitwe', 'kitzbuehel', 'klaipeda', 'kochi', 'kochi-in', 'kohtla-jaerve', 'kopavogur', 'korhogo', 'koror', 'kosice', 'koudougou', 'koya', 'kragujevac', 'kuala-belait', 'kumanovo', 'kunduz', 'kurume', 'kusatsu', 'kushiro', 'kutaisi', 'kutna-hora', 'kyzylorda', 'la-romana', 'lahore', 'larnaca', 'lecce', 'legaspi', 'leh', 'leon', 'lhasa', 'liberia', 'liege', 'lilongwe', 'limassol', 'limon', 'lodz', 'lop-buri', 'lospalos', 'lubango', 'luebeck', 'lusaka', 'lviv', 'madinah', 'madinat-hamad', 'makkah', 'malakal', 'malang', 'malbork', 'maliana', 'manama', 'manas', 'mansoa', 'manzini', 'maputo', 'maracaibo', 'maradi', 'massawa', 'maun', 'mawlamyine', 'mazar-e-sharif', 'mbabane', 'mbarara', 'miaoli', 'michie', 'miskolc', 'miyazaki', 'mombasa', 'montego-bay', 'morioka', 'mosul', 'moundou', 'multan', 'mutare', 'mwanza', 'mzuzu', 'nafplio', 'nakhon-ratchasima', 'namangan', 'namp-o', 'nan', 'napa', 'nassau', 'nay-pyi-taw', 'nazare', 'ninh-binh', 'niseko', 'noboribetsu', 'novo-mesto', 'nukus', 'numazu', 'nunoa', 'nyala', 'nzerekore', 'obidos', 'obihiro', 'odesa', 'odongk', 'oerebro', 'okugano', 'olomouc', 'omsk', 'onomichi', 'oral', 'oran', 'ozu', 'palikir', 'palma', 'parma', 'paro', 'pavlodar', 'pecs', 'perugia', 'peshawar', 'petah-tiqva', 'phuntsholing', 'pietermaritzburg', 'pilsen', 'piura', 'pljevlja', 'plovdiv', 'pocheon', 'podgorica', 'pointe-noire', 'port-au-prince', 'port-douglas', 'port-gentil', 'port-louis', 'port-moresby', 'port-vila', 'porto-novo', 'portofino', 'positano', 'poznan', 'praia', 'puerto-princesa', 'pula', 'pyeongchang', 'pyongyang', 'qormi', 'rangpur', 'ranong', 'recife', 'rethymno', 'rishikesh', 'rosario', 'rosignol', 'rufisque', 'rundu', 'saga', 'salta', 'salto', 'samara', 'san-ignacio', 'san-marino', 'san-miguel-de-tucuman', 'santa-ana', 'santa-clara', 'santa-maria', 'santa-tecla', 'santiago-de-los-caballeros', 'sao-tome', 'savannah', 'schengen', 'sedona', 'segou', 'selfoss', 'seocheon', 'serravalle', 'sfax', 'shimoda', 'sidon', 'sikasso', 'sohar', 'sokhumi', 'sokode', 'sopot', 'soweto', 'spanish-town', 'stara-zagora', 'sucre', 'suez', 'sukhothai', 'sur', 'suva', 'szczecin', 'tabriz', 'tadjoura', 'taean', 'taebaek', 'tallaght', 'tampere', 'taormina', 'taraz', 'tartu', 'te-anau', 'tegucigalpa', 'tehran', 'tiraspol', 'toamasina', 'toba', 'tokushima', 'torun', 'touba', 'toyama', 'toyoda', 'trat', 'trier', 'trieste', 'tripoli', 'tripoli-ly', 'trogir', 'trondheim', 'trujillo', 'trujillo-pe', 'tuerkmenabat', 'turku', 'tuzla', 'udon-thani', 'ueruemqi', 'uljin', 'umea', 'uppsala', 'valencia-ve', 'vanadzor', 'victoria-sc', 'vina-del-mar', 'vinh', 'vlore', 'wakayama', 'wakkanai', 'walvis-bay', 'wau', 'wewak', 'wuzhen', 'yamagata', 'yangshuo', 'yaounde', 'yaren', 'yeongdeok', 'yonago', 'zagazig', 'zakopane', 'zarqa', 'zemun', 'zenica', 'zilina', 'zinder', 'zliten')), '없음')
  union all
  select 3, '도시가 있는 나라', count(distinct country)::text from public.cities
  union all
  select 4, '도시가 없는 나라',
         coalesce((select string_agg(n.code, ' ' order by n.code)
                     from public.countries n
                    where not exists (select 1 from public.cities x
                                       where x.country = n.code)), '없음')
  union all
  select 5, '북한이 남았나',
         case when exists (select 1 from public.cities where country = 'KP')
              then '★남음' else '없음' end
  union all
  select 6, '몬터레이 고쳐졌나',
         coalesce((select name_en || ' ' || round(center_lat::numeric, 3)
                     from public.cities where id in ('monterey','michie') limit 1), '없음')
) t order by ord;
