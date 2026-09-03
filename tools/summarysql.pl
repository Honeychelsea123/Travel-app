# ── 도시 소개글 SQL 만들기 ───────────────────────────────────────────
#
# 읽는 것: /tmp/geo/summaries.tsv   (id \t 소개글)  — **사람이 쓴 것**
#          /tmp/geo/titles.tsv      (id \t ko|en \t 위키 문서 제목)
# 내는 것: db/080_city_summaries.sql
#
# ⚠⚠ **소개글은 위키백과를 그대로 붙이지 않습니다.** 기존 469곳이 다
#   「앱 말투로 쓴 서너 문장」입니다(db/067). 위키백과는 «재료»이고,
#   글은 우리가 씁니다. 붙여넣으면 말투가 두 가지가 되고, 저작권 표시
#   의무도 생깁니다(CC BY-SA).
#
# 글 모양(기존 469곳에서 뽑은 규칙):
#   ① 한 줄 정체 — 「무엇으로 알려진 어디」. **마침표로 끝나는 명사구**
#   ② 볼거리 한둘 — 구체적인 이름으로
#   ③ 실용 한마디 — 얼마나 걸리는지 · 언제가 한적한지
#   ④ 접근 — 「어디에서 무엇으로 몇 시간」
#   예) 할슈타트: "알프스 호숫가 절벽에 집이 붙어 있는 오스트리아의 작은
#       마을. 7천 년 된 소금 광산에서 이름이 왔고 마을 전체가 세계유산입니다.
#       반나절이면 다 보지만 낮에는 관광객이 몰려 이른 아침이 한적합니다.
#       잘츠부르크에서 기차와 버스로 두세 시간 걸립니다."
#
# ⚠ `summary_url` 은 **위키백과 문서의 canonical 제목**으로 만듭니다.
#   우리 도시 이름으로 만들면 안 됩니다 — 「님」은 문서 제목이 `님_(도시)`
#   이고, 그냥 「님」으로 걸면 **동음이의 문서**로 갑니다.

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G = '/tmp/geo';

my %제목;
open my $t, '<:encoding(UTF-8)', "$G/titles.tsv" or die $!;
while (<$t>){ chomp; my ($id,$w,$ti) = split /\t/; $제목{$id} = [$w,$ti] if $id }
close $t;
# ⚠⚠ **한국 소도시는 좌표로 찾은 문서가 엉뚱합니다.** 작은 군에서 좌표로
#   가까운 문서를 집으면 향토문화유산이 걸립니다 — 강진→「강진 수성당」
#   (경로당), 거창→「거창 심우사 목조아미타여래좌상」, 고창→「고창 교촌리
#   멀구슬나무」, 부안→「부안 서문안 당산」. 동해·남해는 **바다** 문서였습니다.
#   → `title-fix.tsv` 로 손으로 바로잡습니다. 링크는 눈으로 보고 고쳐야 합니다.
if (open my $f, '<:encoding(UTF-8)', "$G/title-fix.tsv"){
  while (<$f>){ chomp; my ($id,$w,$ti) = split /\t/; $제목{$id} = [$w,$ti] if $id }
  close $f;
}

sub 인코딩 {
  my $b = shift; $b =~ s/ /_/g; utf8::encode($b);
  $b =~ s/([^A-Za-z0-9_.~()!*'-])/sprintf('%%%02X', ord $1)/ge;
  $b;
}
sub 따옴 { my $s = shift // ''; $s =~ s/'/''/g; "'$s'" }

my (@줄, $없음);
open my $s, '<:encoding(UTF-8)', "$G/summaries.tsv" or die "$G/summaries.tsv: $!";
while (<$s>){
  chomp; s/\r$//; next unless /\S/; next if /^#/;
  my ($id, $txt) = split /\t/, $_, 2;
  next unless $id && defined $txt && length $txt;
  my $url = '';
  if (my $p = $제목{$id}){
    my ($w, $ti) = @$p;
    $url = "https://$w.wikipedia.org/wiki/" . 인코딩($ti);
  } else { $없음++ }
  push @줄, sprintf("  (%s, %s, %s)", 따옴($id), 따옴($txt), 따옴($url));
}
close $s;
die "쓸 것이 없습니다\n" unless @줄;

open my $o, '>:encoding(UTF-8)', 'db/080_city_summaries.sql' or die $!;
printf $o <<'H', scalar @줄;
-- =====================================================================
-- 도시 소개글 %d곳
--
-- ⚠⚠ **위키백과를 그대로 붙이지 않았습니다.** 기존 469곳이 다 「앱 말투로
--   쓴 서너 문장」입니다(db/067). 위키백과는 «재료»이고 글은 우리가 씁니다.
--   붙여넣으면 말투가 두 가지가 되고 저작권 표시 의무도 생깁니다(CC BY-SA).
--
-- 글 모양: ① 한 줄 정체(명사구) ② 볼거리 ③ 실용 한마디 ④ 접근.
--
-- ⚠ `summary_url` 은 **위키백과 문서의 canonical 제목**으로 만들었습니다.
--   도시 이름으로 만들면 안 됩니다 — 「님」의 문서 제목은 `님_(도시)` 라서
--   그냥 「님」으로 걸면 **동음이의 문서**로 갑니다.
--
-- ⚠ 이미 소개글이 있는 도시는 안 건드립니다(`where summary is null`).
--   손으로 다듬은 글을 덮어쓰면 안 됩니다.
--
-- 여러 번 실행해도 안전합니다.
-- 만든 것: tools/summarysql.pl
-- =====================================================================

update public.cities c set
  summary     = v.summary,
  summary_url = nullif(v.url, '')
from (values
H
print $o join(",\n", @줄), "\n) as v(id, summary, url)\n",
         "where c.id = v.id and c.summary is null;\n\n";
print $o <<'V';
-- ── 확인 ─────────────────────────────────────────────────────────────
select * from (
  select 1 as ord, '소개글이 있는 도시'::text as 확인,
         count(*)::text as 결과 from public.cities where summary is not null
  union all
  select 2, '아직 없는 도시', count(*)::text from public.cities where summary is null
  union all
  select 3, '소개글은 있는데 링크가 없는 곳',
         count(*)::text from public.cities
          where summary is not null and (summary_url is null or summary_url = '')
) t order by ord;
V
close $o;
printf "db/080_city_summaries.sql — %d곳%s\n", scalar @줄,
       $없음 ? " (위키 링크 없는 곳 $없음)" : '';
