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

  # flex 는 각 줄의 실제 높이로 쌓습니다. Dongle 은 아주 납작해서
  # 글자 상자(MeasureString)가 실제 잉크보다 훨씬 큽니다 — 그래서
  # 워드마크만 상자가 아니라 **눈에 보이는 높이(약 0.42배)** 로 셉니다.
  $wmInk  = $wmPx * 0.42
  $tagInk = $sTag.Height

  $total = $markPx + $gap + $wmInk + $gap + $tagInk
  $y = ($h - $total) / 2

  $g.DrawImage($mark, [int](($w - $markPx)/2), [int]$y, [int]$markPx, [int]$markPx)
  $y += $markPx + $gap

  $brInk = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#11141A"))
  # Dongle 은 상자 위쪽이 크게 비어 있어 그대로 그리면 아래로 처집니다.
  $g.DrawString("기로", $fWm, $brInk, [single](($w - $sWm.Width)/2), [single]($y - $wmPx*0.30))
  $y += $wmInk + $gap

  $brTag = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#8A8A8F"))
  $g.DrawString("기록이 길이 되다", $fTag, $brTag, [single](($w - $sTag.Width)/2), [single]$y)

  $name = "{0}x{1}@{2}x.png" -f $cw, $ch, $dpr
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host ("{0,-16} {1,4}x{2,-5} {3}" -f $name, $w, $h, $d[3])
}
$mark.Dispose()
Write-Host "끝"
