use strict; use warnings;
# 「쓰는데 안 가져온 이름」 검사. 주석·문자열을 먼저 벗깁니다.
my @files = @ARGV;
my %exp;
for my $f (@files){
  my $s = do { local(@ARGV,$/)=($f); <> };
  my $m = $f; $m =~ s/\.js$//;
  $exp{$m}{$1} = 1 while $s =~ /export\s+(?:async\s+)?(?:function|const|let|class)\s+([\w\$]+)/g;
  while ($s =~ /export\s*\{([^}]+)\}/g){
    for (split /,/, $1){ s/^\s+|\s+$//g; s/.*\bas\s+//; $exp{$m}{$_} = 1 if length }
  }
}
for my $f (@files){
  my $s = do { local(@ARGV,$/)=($f); <> };
  my %imp; my %local;
  while ($s =~ /import\s*\{([^}]+)\}/g){
    for (split /,/, $1){ s/^\s+|\s+$//g; s/.*\bas\s+//; $imp{$_} = 1 if length }
  }
  # 이 파일이 스스로 만든 이름
  $local{$1} = 1 while $s =~ /(?:function|const|let|var|class)\s+([\w\$]+)/g;
  my $c = $s;
  $c =~ s{/\*[\s\S]*?\*/}{ }g;      # 블록 주석
  $c =~ s{`[^`]*`}{ }g;             # 템플릿
  $c =~ s{'[^']*'}{ }g;
  $c =~ s{"[^"]*"}{ }g;
  for my $mod (keys %exp){
    next if $mod eq ($f =~ s/\.js$//r);
    for my $n (keys %{$exp{$mod}}){
      next if $imp{$n} || $local{$n};
      next unless $c =~ /(?:^|[^\w\$.])\Q$n\E\s*[\[(.]/m;
      print "  $f  <- $mod.$n  (씀, 안 가져옴)\n";
    }
  }
}
print "  검사 끝\n";
