use strict; use warnings;
binmode STDOUT, ':encoding(UTF-8)';

# ── 구운 map50/*.js 가 «앱이 읽는 대로» 읽히는지 검사한다 ─────────────
# ⚠ 구운 것을 눈으로 보고 넘어가면 안 됩니다. 앱과 «같은 파서»로 다시 읽어
#   도시가 제자리(땅 위)에 떨어지는지 세어야 합니다.
# 쓰는 법: perl tools/chkmap50.pl

my @T = (
  ['KR','서울',37.5665,126.9780], ['KR','부산',35.1796,129.0756],
  ['KR','제주',33.4996,126.5312], ['KR','서귀포',33.2541,126.5600],
  ['KR','울릉도',37.4845,130.9057], ['KR','완도',34.3110,126.7554],
  ['KR','거제',34.8806,128.6211], ['KR','통영',34.8544,128.4331],
  ['JP','도쿄',35.6762,139.6503], ['JP','나하',26.2124,127.6809],
  ['JP','이시가키',24.3448,124.1572], ['JP','미야코지마',24.8058,125.2811],
  ['JP','사도',38.0186,138.3680],
  ['ID','덴파사르',-8.6705,115.2126], ['US','호놀룰루',21.3069,-157.8583],
  ['SG','싱가포르',1.3521,103.8198],  ['HK','홍콩',22.3193,114.1694],
  ['MO','마카오',22.1987,113.5439],   ['GU','괌',13.4443,144.7937],
  ['MT','발레타',35.8989,14.5146],    ['TW','타이베이',25.0330,121.5654],
  ['MV','말레',4.1755,73.5093],       ['MC','모나코',43.7384,7.4246],
);

sub parse {                        # 앱과 같은 파서: M 절대 + l 상대
  my $d = shift; my @poly;
  while ($d =~ /M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)([^M]*)/g){
    my ($x,$y,$rest) = ($1+0, $2+0, $3);
    my @p = ([$x,$y]);
    my @n = $rest =~ /-?\d*\.?\d+/g;
    for (my $i=0; $i+1 < @n; $i+=2){ $x += $n[$i]; $y += $n[$i+1]; push @p,[$x,$y] }
    push @poly, \@p;
  }
  \@poly;
}
sub inside {
  my ($poly,$x,$y) = @_; my $in = 0;
  for my $p (@$poly){ my $n = @$p;
    for (my $i=0, my $j=$n-1; $i<$n; $j=$i++){
      my ($xi,$yi) = @{$p->[$i]}; my ($xj,$yj) = @{$p->[$j]};
      next if ($yi>$y) == ($yj>$y);
      $in = !$in if $x < ($xj-$xi)*($y-$yi)/($yj-$yi) + $xi;
    } }
  $in ? 1 : 0;
}

my %cache;
sub load {
  my $cc = shift;
  return $cache{$cc} if $cache{$cc};
  my $f = "map50/$cc.js";
  return $cache{$cc} = undef unless -e $f;
  open my $h,'<:raw',$f or die "$f: $!"; local $/; my $s = <$h>; close $h;
  my ($d) = $s =~ /export default "([^"]*)"/s;
  return $cache{$cc} = undef unless defined $d;
  $cache{$cc} = parse($d);
}

my ($ok,$no) = (0,0);
printf "%-3s %-12s %-8s %s\n", '나라','곳','땅 위?','조각';
for my $t (@T){
  my ($cc,$nm,$lat,$lon) = @$t;
  my $poly = load($cc);
  if (!$poly){ printf "%-3s %-12s %-8s\n", $cc, $nm, '파일없음'; $no++; next }
  my $x = ($lon+180)/360*1000; my $y = (90-$lat)/180*500;
  my $in = inside($poly,$x,$y);
  $in ? $ok++ : $no++;
  printf "%-3s %-12s %-8s %d\n", $cc, $nm, ($in ? '있음' : '**없음**'), scalar @$poly;
}
printf "\n%d/%d 곳이 제 나라 땅 위\n", $ok, $ok+$no;

# 전체 파일이 다 읽히는지
opendir my $dh, 'map50' or die $!;
my @f = grep { /\.js$/ } readdir $dh; closedir $dh;
my ($bad,$pts,$subs) = (0,0,0);
for my $f (@f){
  my $cc = $f; $cc =~ s/\.js$//;
  my $p = load($cc);
  if (!$p || !@$p){ print "⚠ 못 읽음: $f\n"; $bad++; next }
  $subs += scalar @$p; $pts += scalar @$_ for @$p;
}
printf "파일 %d개 · 조각 %d · 점 %d · 못 읽은 것 %d\n", scalar @f, $subs, $pts, $bad;
