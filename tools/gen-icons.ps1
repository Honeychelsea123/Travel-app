# 앱 아이콘을 **불투명 정사각형**으로 다시 만듭니다.
#
# 왜:
#   홈 화면 아이콘 아래쪽에 검은 조각이 끼어 보였습니다. 재보니 네 아이콘
#   모두 모서리가 투명(알파 0)이었습니다 — 이미 둥글게 깎인 그림이었습니다.
#   iOS 는 아이콘을 **자기가** 둥글게 깎습니다. 그러고 나서 남은 투명한
#   곳을 검정으로 채웁니다. 그래서 우리가 깎아둔 자리와 iOS 가 깎는 자리가
#   어긋난 만큼 검정이 비쳤습니다.
#   보내는 그림은 **모서리까지 꽉 찬 정사각형**이어야 합니다. 깎는 것은
#   운영체제가 합니다.
#
# 어떻게:
#   지금 아이콘(둥근 주황 타일 + 흰 화살표) 을 **주황 정사각형 위에 얹습니다.**
#   투명했던 모서리가 주황으로 메워지고 마크는 그대로입니다.
#
#   maskable 은 다릅니다. 안드로이드는 원·물방울 등 어떤 모양으로도 깎을 수
#   있어서, 마크가 가운데 80% 안에 있어야 안 잘립니다. 그래서 80% 로 줄여
#   가운데 놓습니다.
#
# 쓰는 법:  powershell -File tools/gen-icons.ps1

Add-Type -AssemblyName System.Drawing

$root   = "C:\Users\jinso\OneDrive\바탕 화면\PWA\travel-v2"
$icons  = Join-Path $root "icons"
$brand  = [System.Drawing.ColorTranslator]::FromHtml("#F25E26")

function Flatten($srcName, $outName, $scale) {
  # ⚠ **FromFile 을 쓰면 안 됩니다.** 파일을 연 채로 잡고 있어서, 같은
  #   이름으로 저장할 때 "A generic error occurred in GDI+" 로 실패합니다.
  #   바이트로 통째로 읽어 메모리에서 엽니다.
  $bytes = [System.IO.File]::ReadAllBytes((Join-Path $icons $srcName))
  $ms  = New-Object System.IO.MemoryStream(,$bytes)
  $src = [System.Drawing.Image]::FromStream($ms)
  $w = $src.Width; $h = $src.Height
  $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'
  $g.Clear($brand)
  $d = [int]($w * $scale)
  $o = [int](($w - $d) / 2)
  $g.DrawImage($src, $o, $o, $d, $d)
  $g.Dispose()
  $bmp.Save((Join-Path $icons $outName), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose(); $src.Dispose(); $ms.Dispose()

  # ⚠ **저장한 파일을 다시 읽어서** 확인합니다. 메모리 속 그림을 보면
  #   저장이 실패해도 "알파=255" 라고 통과시킵니다. 실제로 그랬습니다.
  $chkBytes = [System.IO.File]::ReadAllBytes((Join-Path $icons $outName))
  $ms2 = New-Object System.IO.MemoryStream(,$chkBytes)
  $out = [System.Drawing.Image]::FromStream($ms2)
  $ob  = New-Object System.Drawing.Bitmap($out)
  "{0,-26} {1}x{2}  좌상알파={3} 우하알파={4}" -f `
    $outName, $ob.Width, $ob.Height, $ob.GetPixel(0,0).A, $ob.GetPixel($ob.Width-1,$ob.Height-1).A
  $ob.Dispose(); $out.Dispose(); $ms2.Dispose()
}

# iOS 는 apple-touch-icon 을 씁니다. 모서리까지 꽉 채웁니다(scale 1).
Flatten "apple-touch-icon.png"     "apple-touch-icon.png"     1.0
Flatten "keyro-180.png"            "keyro-180.png"            1.0
Flatten "keyro-512.png"            "keyro-512.png"            1.0
# 안드로이드 maskable — 마크를 안전 구역(80%) 안으로.
Flatten "keyro-maskable-512.png"   "keyro-maskable-512.png"   0.8

"끝"
