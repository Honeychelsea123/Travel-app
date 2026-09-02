# 도시 목록 자료

`tools/citypick.pl` 이 읽는 자료입니다. **여기 있는 셋은 손으로 만든 것**이라
저장소에 둡니다. 나머지(GeoNames 원본 등)는 커서 `/tmp/geo` 에 두고 필요할 때
다시 받습니다 — 아래 「다시 만드는 법」.

| 파일 | 무엇 | 손으로 고칠 곳 |
|---|---|---|
| `ko-country.tsv` | UN 195개국 코드 → 한국어 이름 | 이름이 어색하면 여기 |
| `curated.txt` | 손으로 고른 여행지 (`나라\|영문=한국어\|…`) | 도시를 더 넣으려면 여기 |
| `kr-geo.tsv` | 한국 여행지 37곳 좌표 (OpenStreetMap) | 한국 도시를 더 넣으려면 여기 |

⚠ **`curated.txt` 의 영문 이름은 GeoNames 를 찾는 열쇠입니다.** 좌표·시간대·
인구는 거기서 그대로 옵니다. 못 찾으면 스크립트가 끝에 알려주니 표기를
고치십시오(예: Füssen → `Fuessen`, Göreme → `Goereme` — GeoNames 는 독일식
로마자를 씁니다).

⚠ **한국은 GeoNames 를 못 씁니다.** 표기가 뒤죽박죽이고(「Donghae City」·
「T'aebaek」·「Eisen」·「Jenzan」— 일제강점기 로마자까지 섞여 있습니다)
양양·단양·정선·영월은 아예 없습니다. 그래서 `kr-geo.tsv` 만 씁니다.

## 다시 만드는 법

```bash
mkdir -p /tmp/geo && cd /tmp/geo
cp <repo>/tools/citydata/*.tsv <repo>/tools/citydata/curated.txt .

# ① GeoNames 도시 (CC BY 4.0)
curl -sO https://download.geonames.org/export/dump/cities500.zip && unzip -o cities500.zip
curl -sO https://download.geonames.org/export/dump/countryInfo.txt

# ② 이름으로 찾는 색인 — 나라·별칭·좌표·시간대
awk -F'\t' '$7=="P"{
  key=$9"\t"$1"\t"$3"\t"$15"\t"$5"\t"$6"\t"$18;
  n=split($4,A,",");
  print $9"\t"tolower($2)"\t"key; print $9"\t"tolower($3)"\t"key;
  for(i=1;i<=n;i++){ a=A[i]; if(a ~ /^[ -~]+$/ && length(a)>2) print $9"\t"tolower(a)"\t"key }
}' cities500.txt > alias.tsv

# ③ 한국어 별칭이 있는 도시만 (한글 범위를 «명시»합니다 —
#    \p{Hangul} 은 가타카나까지 걸립니다. 실제로 걸렸습니다.)
perl -CSD -F'\t' -lane 'next unless $F[6] eq "P";
  for my $a (split /,/, $F[3]){ next unless $a =~ /^[\x{AC00}-\x{D7A3} ·]+$/;
    print join("\t", $F[8], $F[0], $F[2], $a, $F[14], $F[4], $F[5], $F[17]); last }' \
  cities500.txt > ko-pool.tsv

# ④ 대륙 — un.js 에서
perl -0777 -ne 'if(/export const UN_BY_CONT = \{(.*?)\n\};/s){ my $b=$1; my $c="";
  for my $l (split /\n/,$b){ if($l=~/^\s*.([^\x27]+).:\s*\[/){$c=$1;next}
    while($l=~/.([A-Z]{2})./g){ print "$1\t$c\n" } } }' <repo>/un.js > un-cont.tsv

# ⑤ 지금 DB 에 무엇이 있나 (익명 키는 db.js 에 있습니다)
K=$(perl -ne "print \$1 if /SUPABASE_KEY\s*=\s*'([^']+)'/" <repo>/db.js)
U=https://qahqqhjleqfrsjiixnas.supabase.co/rest/v1
curl -s -H "apikey: $K" "$U/cities?select=id,name,name_en,country&limit=5000" -o have.json
curl -s -H "apikey: $K" "$U/countries?select=code&limit=500" -o have-cty.json
perl -0777 -CSD -ne 'while(/\{"id":"([^"]*)","name":"([^"]*)","name_en":(?:"([^"]*)"|null),"country":"([^"]*)"\}/gs){
  print "$4\t$1\t$2\t", (defined $3 ? $3 : ""), "\n" }' have.json > have.tsv
perl -0777 -ne 'while(/\{"code":"(..)"/gs){ print "$1\n" }' have-cty.json | sort > have-cty.txt
```

그런 다음 `perl tools/citypick.pl`.

## 한국 좌표를 더 받으려면

```bash
# 1초에 하나씩. User-Agent 를 꼭 붙이십시오(Nominatim 이용 규칙).
curl -s -A "keyro-city-setup/1.0 (contact: <메일>)" \
  "https://nominatim.openstreetmap.org/search?q=<도시>&countrycodes=kr&format=json&limit=1"
```
받은 `lat`/`lon` 을 `kr-geo.tsv` 에 `KR\t한국어\t영문\t위도\t경도` 로 적습니다.
