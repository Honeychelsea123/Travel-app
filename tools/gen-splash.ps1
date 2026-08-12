# iOS 런치 스크린 PNG 를 만듭니다.
# 화면 안의 스플래시(index.html #splash)와 **똑같이** 그려야
# 두 장이 한 장처럼 이어집니다. 배치를 바꾸면 여기도 같이 바꾸십시오.
#   마크 88 · 사이 18 · 기로 57(Dongle 700) · 사이 18 · 문구 15(Pretendard)
# 단위는 CSS px 이고, 기기 배율(dpr)을 곱해서 그립니다.

# 글꼴 두 개를 먼저 받아 tools/fonts 에 두십시오. 저장소에는 안 넣습니다
# (Dongle 4.4MB · Pretendard 1.5MB — 그림에만 쓰고 앱은 웹폰트로 받습니다):
#   curl -sL -o tools/fonts/Dongle-Bold.ttf \
#     "https://fonts.gstatic.com/s/dongle/v16/sJoG3Ltdjt6VPkqeActrYg.ttf"
#   curl -sL -o tools/fonts/Pretendard-Regular.otf \
#     "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf"

Add-Type -AssemblyName System.Drawing

$root  = "C:\Users\jinso\OneDrive\바탕 화면\PWA\travel-v2"
$fonts = Join-Path $root "tools\fonts"   # 아래 주석 참고. 저장소에는 안 넣습니다
$out   = Join-Path $root "splash"
if (-not (Test-Path $out)) { New-Item -ItemType Directory $out | Out-Null }

$pfc = New-Object System.Drawing.Text.PrivateFontCollection
$pfc.AddFontFile((Join-Path $fonts "Dongle-Bold.ttf"))
$pfc.AddFontFile((Join-Path $fonts "Pretendard-Regular.otf"))
foreach ($f in $pfc.Families) { Write-Host ("글꼴 실림: " + $f.Name) }

$mark = [System.Drawing.Image]::FromFile((Join-Path $root "icons\keyro-512.png"))

# device-width, device-height, dpr, 기기 이름
$devices = @(
  @(440, 956, 3, "16 Pro Max"),
  @(430, 932, 3, "15/14 Pro Max"),
  @(428, 926, 3, "12-14 Pro Max"),
  @(402, 874, 3, "16 Pro"),
  @(393, 852, 3, "15/14 Pro"),
  @(390, 844, 3, "12-14 / 16e"),
  @(375, 812, 3, "X/XS/11 Pro, 13 mini"),
  @(414, 896, 3, "XS Max/11 Pro Max"),
  @(414, 896, 2, "XR/11"),
  @(375, 667, 2, "SE 2/3, 8"),
  @(414, 736, 3, "8 Plus")
)

foreach ($d in $devices) {
  $cw = [int]$d[0]; $ch = [int]$d[1]; $dpr = [int]$d[2]
  $w = $cw * $dpr; $h = $ch * $dpr

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::White)

  # 화면 스플래시와 같은 크기 (CSS px × dpr)
  $markPx = 88 * $dpr
  $gap    = 18 * $dpr
  $wmPx   = 57 * $dpr      # Dongle 700 — 화면에서도 57px
  $tagPx  = 15 * $dpr

  $fWm  = New-Object System.Drawing.Font($pfc.Families[($pfc.Families | ForEach-Object {$_.Name}).IndexOf("Dongle")], $wmPx, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fTag = New-Object System.Drawing.Font($pfc.Families[($pfc.Families | ForEach-Object {$_.Name}).IndexOf("Pretendard")], $tagPx, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

  $sWm  = $g.MeasureString("기로", $fWm)
  $sTag = $g.MeasureString("기록이 길이 되다", $fTag)

  # 화면 스플래시(index.html #splash)와 **같은 상자 높이**로 쌓습니다.
  # 전에는 Dongle 의 잉크 높이(0.42배)로 셌는데, 브라우저는 line-height:1 인
  # **상자 57px** 로 셉니다. 그래서 블록이 196 이어야 하는데 168 이 됐고,
  # 두 장의 로고가 14px 어긋나 iOS 크로스페이드에서 그게 보였습니다.
  $wmBox  = $wmPx
  $tagBox = $tagPx
  $total = $markPx + $gap + $wmBox + $gap + $tagBox
  $y = ($h - $total) / 2

  $g.DrawImage($mark, [int](($w - $markPx)/2), [int]$y, [int]$markPx, [int]$markPx)
  $y += $markPx + $gap

  $brInk = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#11141A"))
  # ── 워드마크는 **글자가 아니라 경로**로 그립니다 ──────────────────
  # 화면 스플래시도 같은 경로(SVG)를 씁니다. 한쪽은 글자로 그리고 한쪽은
  # 경로로 그리면 자리와 두께가 미세하게 달라지고, 홈 화면 앱에서 런치
  # PNG 와 나란히 놓일 때 그 차이가 깜빡임으로 보입니다.
  # 경로를 뽑는 것은 tools/wordmark-path.ps1 이고, 나온 값을 index.html 에
  # 그대로 붙여 씁니다. **여기와 거기가 같은 모양이어야 합니다.**
  $wmPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $sfT = [System.Drawing.StringFormat]::GenericTypographic
  $wmPath.AddString("기로", $pfc.Families[($pfc.Families | ForEach-Object {$_.Name}).IndexOf("Dongle")],
                    [int][System.Drawing.FontStyle]::Bold, $wmPx,
                    (New-Object System.Drawing.PointF(0,0)), $sfT)
  $wb = $wmPath.GetBounds()
  # 잉크를 상자(57×배율) 안에서 가운데에 놓습니다 — 화면 쪽과 같은 규칙.
  $mx = New-Object System.Drawing.Drawing2D.Matrix
  $mx.Translate([single](($w - $wb.Width)/2 - $wb.X), [single]($y + ($wmBox - $wb.Height)/2 - $wb.Y))
  $wmPath.Transform($mx)
  $g.FillPath($brInk, $wmPath)
  $wmPath.Dispose(); $mx.Dispose()
  $y += $wmBox + $gap

  $brTag = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#8A8A8F"))
  $g.DrawString("기록이 길이 되다", $fTag, $brTag, [single](($w - $sTag.Width)/2), [single]($y + ($tagBox - $sTag.Height)/2))

  $name = "{0}x{1}@{2}x.png" -f $cw, $ch, $dpr
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host ("{0,-16} {1,4}x{2,-5} {3}" -f $name, $w, $h, $d[3])
}
$mark.Dispose()
Write-Host "끝"
