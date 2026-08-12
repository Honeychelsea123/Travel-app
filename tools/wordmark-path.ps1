# '기로' 를 Dongle 글자 모양 그대로 **벡터 경로**로 뽑습니다.
#
# 왜:
#   스플래시의 워드마크가 홈 화면 앱에서 자꾸 깜빡였습니다. 런치 PNG 에는
#   Dongle 이 이미 찍혀 있는데 화면 쪽은 매번 웹폰트를 기다렸기 때문입니다.
#   숨겼다 보여주든 load() 를 기다리든, **글꼴에 매달려 있는 한** 언젠가는
#   어긋납니다. 세 번 고쳐도 안 됐습니다.
#   글자 모양을 경로로 박아두면 받아올 것이 없어 깜빡일 수가 없습니다.
#
# 나오는 것: SVG path 의 d 와 보기창(viewBox). index.html 에 그대로 붙입니다.
# 크기는 Dongle 57px 로 그린 것과 같습니다(스플래시·런치 PNG 와 같은 값).

Add-Type -AssemblyName System.Drawing

$fonts = "C:\Users\jinso\OneDrive\바탕 화면\PWA\travel-v2\tools\fonts"
$pfc = New-Object System.Drawing.Text.PrivateFontCollection
$pfc.AddFontFile((Join-Path $fonts "Dongle-Bold.ttf"))
$fam = $pfc.Families[0]

$EM = 57
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$sf = [System.Drawing.StringFormat]::GenericTypographic
$path.AddString("기로", $fam, [int][System.Drawing.FontStyle]::Bold, $EM,
                (New-Object System.Drawing.PointF(0,0)), $sf)

$pts = $path.PathPoints
$typ = $path.PathTypes
$sb = New-Object System.Text.StringBuilder
$i = 0
while ($i -lt $pts.Length) {
  $t = $typ[$i] -band 0x7
  if ($t -eq 0) {
    [void]$sb.Append(("M{0:0.##} {1:0.##}" -f $pts[$i].X, $pts[$i].Y))
    $i++
  } elseif ($t -eq 1) {
    [void]$sb.Append((" L{0:0.##} {1:0.##}" -f $pts[$i].X, $pts[$i].Y))
    $i++
  } elseif ($t -eq 3) {
    [void]$sb.Append((" C{0:0.##} {1:0.##} {2:0.##} {3:0.##} {4:0.##} {5:0.##}" -f `
      $pts[$i].X,$pts[$i].Y,$pts[$i+1].X,$pts[$i+1].Y,$pts[$i+2].X,$pts[$i+2].Y))
    $i += 3
  } else { $i++ }
  # 닫는 표시(0x80)가 붙어 있으면 그 자리에서 닫습니다.
  if ($i -gt 0 -and ($typ[$i-1] -band 0x80)) { [void]$sb.Append(" Z") }
}

$b = $path.GetBounds()
"viewBox: {0:0.##} {1:0.##} {2:0.##} {3:0.##}" -f $b.X, $b.Y, $b.Width, $b.Height
"width x height (px): {0:0.##} x {1:0.##}" -f $b.Width, $b.Height
""
"d="
$sb.ToString()
$path.Dispose()
