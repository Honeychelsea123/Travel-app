#!/usr/bin/perl
# ctx 주입 검사 (b785) — 받는 쪽이 `ctx.X` 로 쓰는데 넘기는 쪽(`setXxxCtx({...})`)이
# 한 번도 X 를 안 넘기면 알립니다.
#
# 왜: 안 넘긴 ctx 는 기본값(대개 빈 함수)이 **오류 없이** 돕니다. b453 에 map.js 가
#   `ctx.showApp` 으로 「나온 자리로 돌아가기」를 시작했는데 app.js 는 b322 때 그대로
#   `me · loadCities` 만 넘겨서, 기록 탭 → 「자세히 ›」 → 뒤로 가 **빈 프로필 칸**에
#   떨어졌습니다(사용자 사진, b785 에 잡음). 사람 눈으로 두 파일을 맞춰 보는 검사는
#   세 번째 파일이 끼면 놓칩니다.
#
# 쓰는 법:  perl tools/ctx.pl        (travel-v2 에서)
#   빠진 것이 있으면 목록을 내고 1 로 끝납니다. 없으면 「ctx: ok」.
#
# ⚠ 기본값이 «진짜 값»인 열쇠도 있습니다(예: `appTab: () => ''` 를 정말 그대로 쓰는
#   곳). 그런 것은 아래 %허용 에 «이유와 함께» 적습니다. 이유 없이 적지 마십시오.
use strict;
use warnings;
use utf8;
binmode STDOUT, ':encoding(UTF-8)';

my %허용 = (
  # 'file.js:key' => '이유',
);

opendir my $d, '.' or die;
my @js = sort grep { /\.js$/ && -f $_ } readdir $d;
closedir $d;

my %src;
for my $f (@js){
  open my $h, '<:encoding(UTF-8)', $f or die "$f: $!";
  local $/; $src{$f} = <$h>; close $h;
}

# 주석과 문자열을 비웁니다(길이는 그대로 두어 위치가 안 어긋나게).
sub 비우기 {
  my ($s) = @_;
  $s =~ s{/\*.*?\*/}{ my $m = $&; $m =~ s/[^\n]/ /g; $m }gse;
  $s =~ s{(?<![:\\])//[^\n]*}{ ' ' x length $& }ge;
  return $s;
}

# 여는 괄호 위치에서 짝이 맞는 닫는 괄호까지의 속을 돌려줍니다.
sub 속 {
  my ($s, $at) = @_;           # $at = '{' 의 위치
  my $깊이 = 0; my $q = '';
  for (my $i = $at; $i < length $s; $i++){
    my $c = substr($s, $i, 1);
    if ($q){
      if ($c eq '\\'){ $i++; next }
      $q = '' if $c eq $q;
      next;
    }
    if ($c eq "'" || $c eq '"' || $c eq '`'){ $q = $c; next }
    if ($c eq '{' || $c eq '(' || $c eq '['){ $깊이++ }
    elsif ($c eq '}' || $c eq ')' || $c eq ']'){
      $깊이--;
      return substr($s, $at + 1, $i - $at - 1) if $깊이 == 0;
    }
  }
  return undef;
}

# 객체 글자의 맨 위 열쇠들.
sub 열쇠들 {
  my ($body) = @_;
  my @k; my $깊이 = 0; my $q = ''; my $조각 = '';
  my @조각;
  for my $c (split //, $body){
    if ($q){ $조각 .= $c; $q = '' if $c eq $q; next }
    if ($c eq "'" || $c eq '"' || $c eq '`'){ $q = $c; $조각 .= $c; next }
    if ($c =~ /[\{\(\[]/){ $깊이++ }
    elsif ($c =~ /[\}\)\]]/){ $깊이-- }
    if ($c eq ',' && $깊이 == 0){ push @조각, $조각; $조각 = ''; next }
    $조각 .= $c;
  }
  push @조각, $조각;
  for (@조각){
    next if /^\s*\.\.\./;                       # ...펼침은 셀 수 없음
    push @k, $1 if /^\s*(?:async\s+)?([\p{L}_\$][\p{L}\p{N}_\$]*)\s*(?::|\(|$)/s;
  }
  return @k;
}

my (%기본, %씀, %넘김, %설정자);
for my $f (@js){
  my $s = 비우기($src{$f});
  next unless $s =~ /export\s+function\s+(set\w*Ctx)\s*\(/;
  my $이름 = $1;
  # 한 파일에 set…Ctx 가 둘 이상일 수 있으나 지금은 하나씩입니다.
  next unless $s =~ /\blet\s+ctx\s*=\s*\{/g;
  my $at = pos($s) - 1;
  my $b = 속($s, $at) // next;
  $기본{$f}{$_} = 1 for 열쇠들($b);
  $설정자{$이름} = $f;
  while ($s =~ /\bctx\??\.([\p{L}_\$][\p{L}\p{N}_\$]*)/g){ $씀{$f}{$1}++ }
}

for my $f (@js){
  my $s = 비우기($src{$f});
  for my $이름 (keys %설정자){
    while ($s =~ /\b\Q$이름\E\s*\(\s*\{/g){
      my $at = pos($s) - 1;
      my $b = 속($s, $at) // next;
      $넘김{$설정자{$이름}}{$_} = 1 for 열쇠들($b);
    }
  }
}

if ($ENV{CTX_DEBUG}){                       # 무엇을 읽었는지 — 검사 자체를 볼 때
  for my $f (sort values %설정자){
    printf "%-14s 씀 %-40s 넘김 %s\n", $f, join(',', sort keys %{$씀{$f} || {}}),
      join(',', sort keys %{$넘김{$f} || {}});
  }
}
my @빠짐;
for my $f (sort keys %씀){
  for my $k (sort keys %{$씀{$f}}){
    next if $넘김{$f}{$k};
    next if $허용{"$f:$k"};
    push @빠짐, sprintf "%-14s ctx.%s — 쓰는 곳 %d, 넘기는 곳 0%s", $f, $k, $씀{$f}{$k},
      ($기본{$f}{$k} ? '' : ' (기본값에도 없음 → undefined)');
  }
}
if (@빠짐){
  print "ctx: 넘기지 않는 열쇠 ", scalar(@빠짐), "개\n";
  print "  $_\n" for @빠짐;
  exit 1;
}
print "ctx: ok (", scalar(keys %설정자), " 모듈)\n";
