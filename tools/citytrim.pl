# ── 나라별 상한을 다시 잡습니다 (b655) ───────────────────────────────
#
# 사용자: 「다 조금씩 줄이자 한국인 아무도 안가는데도 많이 들어간거 같은데」
#
# ⚠⚠ **기존 469곳은 안 건드립니다.** 그것들은 사진과 소개글이 손으로
#   채워져 있고(469/469), 그 자체가 「넣을 만한 곳」이라는 증거입니다.
#   자르는 것은 **이번에 들어간 682곳뿐**입니다. 상한은 «최종 합계»이므로,
#   기존만으로 이미 상한을 넘는 나라는 아무것도 안 뺍니다(줄이지도 않습니다).
#
# ⚠ 상한은 **한국인 출국 통계**를 따릅니다(Downloads/CITY-LIST-EXPANSION.md).
#   그 외 나라는 **1곳** — 「가봤다」고 말할 자리 하나면 됩니다. 애초에
#   도시를 늘린 이유가 그것이었습니다(「간 나라도 평가를 못해서 갔다고
#   할 수 없을 것 같은데」). 두 곳째부터는 아무도 안 누릅니다.
#
# ⚠ 무엇을 남길지는 **유명한 순**(fame › pop_rank › 이름)입니다. 이 판에서
#   fame 은 인구로 매겨졌으므로 사실상 큰 도시가 남습니다 — 수도가 대개
#   먼저 남는다는 뜻이라 「한 곳만 남긴다」는 규칙과 잘 맞습니다.

use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)');
my $G = '/tmp/geo';

# 최종 합계 상한. 없는 나라는 $기본.
my $기본 = 1;
my %상한 = (
  # 압도적으로 많이 가는 곳
  JP=>50, KR=>50, CN=>24, VN=>18, TH=>16, TW=>12, PH=>10, ID=>10, US=>28, HK=>2, MO=>2, SG=>2,
  # 유럽 — 한 번 갈 때 여러 도시를 돕니다
  IT=>24, FR=>16, ES=>16, DE=>13, GB=>11, CH=>12, AT=>8, PT=>8, GR=>8, NL=>7, BE=>5,
  CZ=>6, HR=>7, PL=>6, HU=>4, IE=>3, IS=>4, NO=>5, SE=>4, DK=>4, FI=>4,
  # 그 밖에 실제로 가는 곳
  TR=>10, AE=>4, IN=>10, NP=>4, LK=>4, MY=>8, KH=>5, LA=>4, MM=>3, MN=>3,
  CA=>11, MX=>6, AU=>11, NZ=>10, BR=>4, AR=>4, PE=>4, CL=>4, CO=>3,
  EG=>4, MA=>5, ZA=>4, TN=>2, KE=>2, TZ=>2,
  UZ=>4, KZ=>4, GE=>3, AZ=>2, AM=>2, KG=>2, RU=>4, IL=>3, JO=>3, SA=>2, QA=>2, OM=>2,
  GU=>1, MP=>1, PF=>1, MV=>2, BN=>1, CU=>3, CR=>3, GT=>2, PA=>2, EC=>3, BO=>2, UY=>2,
  RO=>2, BG=>2, RS=>2, SI=>2, SK=>2, EE=>2, LV=>2, LT=>2, UA=>2, MT=>2, LU=>1, FJ=>2,
);

sub tsv {
  my $f = shift;
  open my $h, '<:encoding(UTF-8)', $f or die "$f: $!";
  my @r; while (<$h>){ chomp; s/\r$//; next unless /\S/; push @r, [split /\t/, $_, -1] }
  close $h; \@r;
}

# 기존 469 — 나라별로 몇인지만 셉니다(안 건드립니다)
my %기존;
$기존{$_->[0]}++ for @{ tsv("$G/have.tsv") };

# 이번에 들어간 682 중, 앞선 검사(DELETE.txt)를 이미 통과한 것만 후보입니다
my %이미삭제 = map { $_->[0] => 1 } @{ tsv("$G/DELETE.txt") };
my %fame;
{ # fame 은 만들어 둔 SQL 에서 읽습니다
  open my $h, '<:encoding(UTF-8)', 'db/075_more_cities.sql' or die $!;
  while (<$h>){ $fame{$1} = $2 if /^\s*\('([a-z0-9-]+)',.*,\s*'[^']*',\s*(\d)\)/ }
  close $h;
}
my %후보;
for my $r (@{ tsv("$G/new682.tsv") }){
  my ($id, $ko, $en, $cc) = @$r;
  next if $이미삭제{$id};
  push @{ $후보{$cc} }, { id=>$id, ko=>$ko, fame=>($fame{$id} // 0) };
}

my (@뺄것, @표);
for my $cc (sort keys %후보){
  my $cap = $상한{$cc} // $기본;
  my $남길수 = $cap - ($기존{$cc} // 0);
  $남길수 = 0 if $남길수 < 0;
  my @s = sort { $b->{fame} <=> $a->{fame} || $a->{ko} cmp $b->{ko} } @{ $후보{$cc} };
  my @남김 = @s[0 .. ($남길수 - 1)] if $남길수 > 0;
  my @뺌   = $남길수 < @s ? @s[$남길수 .. $#s] : ();
  push @뺄것, map { $_->{id} } @뺌;
  push @표, [$cc, ($기존{$cc} // 0), scalar @s, scalar @뺌,
             ($기존{$cc} // 0) + ($남길수 > @s ? @s : $남길수)] if @뺌;
}

open my $o, '>:encoding(UTF-8)', "$G/TRIM.txt" or die $!;
print $o "$_\n" for @뺄것;
close $o;

my $기존합 = 0; $기존합 += $_ for values %기존;
my $남는새것 = (scalar @{ tsv("$G/new682.tsv") }) - (scalar keys %이미삭제) - scalar @뺄것;
printf "앞서 뺀 것 %d · 이번에 더 뺄 것 %d\n", scalar(keys %이미삭제), scalar @뺄것;
printf "→ 최종 도시 %d (기존 %d + 새것 %d)\n", $기존합 + $남는새것, $기존합, $남는새것;
print "→ $G/TRIM.txt\n\n";
print "많이 잘리는 나라(기존/후보/뺌/최종):\n";
for my $r (sort { $b->[3] <=> $a->[3] } @표){
  printf "  %s %d/%d/-%d → %d\n", @$r[0,1,2,3,4];
}
