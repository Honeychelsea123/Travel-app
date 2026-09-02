use strict; use warnings; use utf8;
binmode(STDOUT, ':encoding(UTF-8)'); binmode(STDERR, ':encoding(UTF-8)');

# ── 깃발 195개를 «한 파일»로 묶습니다 ────────────────────────────────
# 각 SVG 의 <svg …> 껍데기를 벗기고 <symbol id="f-kr" viewBox="…"> 로 감쌉니다.
# 화면에서는 <svg><use href="#f-kr"/></svg> 하나로 부릅니다.
my $dir = '/tmp/tw';
opendir(my $d, $dir) or die $!;
my @f = sort grep { /\.svg$/ } readdir($d);
closedir $d;

my $out = '';
my ($n, $bytes) = (0, 0);
for my $file (@f){
  my ($code) = $file =~ /^([a-z]{2})\.svg$/ or next;
  open my $h, '<:raw', "$dir/$file" or die $!;
  local $/; my $x = <$h>; close $h;
  $bytes += length $x;

  # viewBox 를 뽑습니다. 없으면 twemoji 기본값(0 0 36 36).
  my ($vb) = $x =~ /viewBox="([^"]+)"/;
  $vb ||= '0 0 36 36';

  # <svg …> 여는 태그와 </svg> 닫는 태그를 벗깁니다.
  $x =~ s/^\s*<\?xml.*?\?>\s*//s;
  $x =~ s/^\s*<!--.*?-->\s*//s;
  $x =~ s/^\s*<svg[^>]*>//s;
  $x =~ s/<\/svg>\s*$//s;
  $x =~ s/\s+$//;

  # id 가 들어 있으면 195개가 한 문서에 모일 때 부딪힙니다 — 앞에 코드를 붙입니다.
  $x =~ s/\bid="([^"]+)"/id="$code-$1"/g;
  $x =~ s/url\(#([^)]+)\)/url(#$code-$1)/g;
  $x =~ s/(href=")#([^"]+)"/$1#$code-$2"/g;

  $out .= qq{<symbol id="f-$code" viewBox="$vb">$x</symbol>};
  $n++;
}

my $head = qq{<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:none">};
open my $o, '>:raw', 'flags.svg' or die $!;
print $o $head, $out, '</svg>';
close $o;

my $size = -s 'flags.svg';
printf STDERR "깃발 %d 개 · 원본 합 %.0f KB · 묶은 파일 %.0f KB\n",
  $n, $bytes/1024, $size/1024;
print STDERR "!! 195 가 아닙니다\n" if $n != 195;
