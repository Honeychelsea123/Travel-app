# ── 만든 SQL 을 «넣기 전에» 검사합니다 (b651) ────────────────────────
#
# ⚠⚠ **왜 있나** — SQL 을 사용자에게 넘겼다가 Supabase 에서 두 번 튕겼습니다:
#     ① 23502 `name_en` 이 NOT NULL 인데 안 넣음
#     ② 23505 `cities_country_name_uniq` — 같은 도시를 두 줄 넣음
#   둘 다 **파일만 열어 보면 알 수 있던 것**입니다. DB 가 거는 규칙을
#   여기서 먼저 돌립니다. 사람을 왕복시키지 않으려고 있는 검사기입니다.
#
# DB 가 거는 규칙(직접 확인한 것):
#   · cities: 기본키 `id`
#   · cities: `create unique index cities_country_name_uniq
#              on public.cities (country, lower(name))`   ← db/017
#   · countries: `name_en` NOT NULL
#   · cities.country → countries.code (join 이라, 없으면 그 줄이 조용히 빠짐)
# ⚠ **제약을 새로 만들면 여기도 늘려야 합니다.** 안 늘리면 다음에 또
#   사용자 화면에서 처음 알게 됩니다.
#
# 쓰는 법: perl tools/citycheck.pl      (citypick.pl 을 돌린 «뒤»)

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G = '/tmp/geo';
my $나쁨 = 0;
sub 탈 { print "!! ", shift, "\n"; $나쁨++ }
sub 좋 { print "   ", shift, "\n" }

# ── 지금 DB ──────────────────────────────────────────────────────────
my (%DB_id, %DB_이름, %DB나라);
{
  open my $h, '<:encoding(UTF-8)', "$G/have.tsv" or die "$G/have.tsv: $!";
  while (<$h>){ chomp; my ($cc,$id,$ko,$en) = split /\t/; next unless $cc;
    $DB_id{$id} = 1; $DB_이름{"$cc|" . lc $ko} = $id }
  close $h;
  open my $c, '<', "$G/have-cty.txt" or die $!;
  while (<$c>){ chomp; s/\r$//; $DB나라{$_} = 1 if /^[A-Z]{2}$/ }
  close $c;
}

# ── 074 가 넣을 나라 ─────────────────────────────────────────────────
my (%새나라, $나라줄수);
$나라줄수 = 0;
{
  open my $h, '<:encoding(UTF-8)', 'db/074_countries_all.sql' or die $!;
  my $안에 = 0;
  while (<$h>){
    $안에 = 1 if /^insert into public\.countries/;
    $안에 = 0 if /^on conflict/;
    next unless $안에;
    next unless /^\s*\('([A-Z]{2})',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',/;
    my ($cc, $ko, $en) = ($1, $2, $3);
    $새나라{$cc} = 1; $나라줄수++;
    탈("074 · $cc 의 name_en 이 비었습니다 (NOT NULL)") unless length $en;
    탈("074 · $cc 의 한국어 이름이 비었습니다")          unless length $ko;
  }
  close $h;
}
좋("074 · 나라 $나라줄수 줄");

# ── 075 가 넣을 도시 ─────────────────────────────────────────────────
my (%새id, %새이름, $도시줄수);
{
  open my $h, '<:encoding(UTF-8)', 'db/075_more_cities.sql' or die $!;
  while (<$h>){
    next unless /^\s*\('([a-z0-9-]+)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'([A-Z]{2})',\s*(-?[\d.]+),\s*(-?[\d.]+),\s*'([^']*)',\s*'([^']*)',\s*(\d)\)/;
    my ($id, $ko, $en, $cc, $lat, $lng, $tz, $grade, $fame)
       = ($1, $2, $3, $4, $5+0, $6+0, $7, $8, $9+0);
    $도시줄수++;
    my $이름키 = "$cc|" . lc $ko;

    # ① 기본키
    탈("075 · id 가 겹칩니다: $id")                       if $새id{$id};
    탈("075 · id 가 이미 DB 에 있습니다: $id ($ko)")       if $DB_id{$id};
    # ② cities_country_name_uniq (country, lower(name))
    탈("075 · 같은 나라에 같은 이름이 두 줄: $cc $ko ($새이름{$이름키} · $id)")
      if $새이름{$이름키};
    탈("075 · 이미 DB 에 있는 이름: $cc $ko (DB id $DB_이름{$이름키} · 새 id $id)")
      if $DB_이름{$이름키};
    # ③ 나라가 준비되나 — join 이라 없으면 «조용히» 빠집니다
    탈("075 · $id 의 나라 $cc 가 countries 에 없습니다") unless $DB나라{$cc} || $새나라{$cc};
    # ④ 비면 안 되는 칸
    탈("075 · $id 의 이름이 비었습니다")     unless length $ko;
    탈("075 · $id 의 영문 이름이 비었습니다") unless length $en;
    탈("075 · $id 의 시간대가 비었습니다")    unless length $tz;
    # ⑤ 값의 범위
    탈("075 · $id 의 좌표가 이상합니다 ($lat, $lng)")
      if $lat > 90 || $lat < -90 || $lng > 180 || $lng < -180;
    탈("075 · $id 의 좌표가 0,0 입니다")      if $lat == 0 && $lng == 0;
    탈("075 · $id 의 등급이 이상합니다: $grade")
      unless $grade =~ /^(?:dense|normal|limited|car)$/;
    탈("075 · $id 의 이름값이 이상합니다: $fame") unless $fame >= 1 && $fame <= 3;

    $새id{$id} = 1; $새이름{$이름키} = $id;
  }
  close $h;
}
좋("075 · 도시 $도시줄수 줄 · 최종 " . (scalar(keys %DB_id) + $도시줄수));

# ── 따옴표 짝 ────────────────────────────────────────────────────────
# ⚠ 이름에 아포스트로피가 있는 곳이 있습니다(N'Djamena · Saint John's).
#   `''` 로 두 번 적혀 있어야 합니다. 한 줄의 따옴표 개수는 «짝수».
for my $f ('db/074_countries_all.sql', 'db/075_more_cities.sql'){
  open my $h, '<:encoding(UTF-8)', $f or die $!;
  my $줄 = 0;
  while (<$h>){
    $줄++;
    next unless /^\s*\(/;
    my $n = () = /'/g;
    탈("$f:$줄 · 따옴표가 홀수(" . $n . ")입니다 — 이스케이프를 보십시오") if $n % 2;
  }
  close $h;
}

print $나쁨 ? "\n★ $나쁨 곳. 넣지 마십시오.\n" : "\n   다 통과. 넣어도 됩니다.\n";
exit($나쁨 ? 1 : 0);
