# Draws the NSIS installer artwork (sidebar 164x314, header 150x57) as 24-bit BMPs.
# Run from app/src-tauri:  powershell -ExecutionPolicy Bypass -File installer/make-images.ps1
Add-Type -AssemblyName System.Drawing
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$accent = [System.Drawing.Color]::FromArgb(217, 119, 87)
$strong = [System.Drawing.Color]::FromArgb(193, 95, 60)
$paper = [System.Drawing.Color]::FromArgb(250, 249, 245)
$ink = [System.Drawing.Color]::FromArgb(31, 30, 28)

function Draw-Zigzag($g, [float]$x, [float]$y, [float]$w, [float]$h, $color, [float]$width) {
  $pen = New-Object System.Drawing.Pen($color, $width)
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $u = $w / 46.0
  $pts = @(
    (New-Object System.Drawing.PointF($x, $y)),
    (New-Object System.Drawing.PointF(($x + 9 * $u), $y)),
    (New-Object System.Drawing.PointF(($x + 13 * $u), ($y - $h / 2))),
    (New-Object System.Drawing.PointF(($x + 21 * $u), ($y + $h / 2))),
    (New-Object System.Drawing.PointF(($x + 29 * $u), ($y - $h / 2))),
    (New-Object System.Drawing.PointF(($x + 33 * $u), $y)),
    (New-Object System.Drawing.PointF(($x + $w), $y))
  )
  $g.DrawLines($pen, $pts)
  $pen.Dispose()
}

function Save-Bmp($bmp, $name) {
  $bmp.Save((Join-Path $here $name), [System.Drawing.Imaging.ImageFormat]::Bmp)
  $bmp.Dispose()
}

# ---- sidebar (welcome / finish pages) ----
$bmp = New-Object System.Drawing.Bitmap(164, 314, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
$rect = New-Object System.Drawing.Rectangle(0, 0, 164, 314)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $accent, $strong, 90)
$g.FillRectangle($grad, $rect)
# faint circuit traces
$trace = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(45, 255, 255, 255), 2)
$g.DrawLines($trace, @((New-Object System.Drawing.Point(0, 250)), (New-Object System.Drawing.Point(40, 250)), (New-Object System.Drawing.Point(40, 290)), (New-Object System.Drawing.Point(120, 290)), (New-Object System.Drawing.Point(120, 314))))
$g.DrawLines($trace, @((New-Object System.Drawing.Point(164, 220)), (New-Object System.Drawing.Point(110, 220)), (New-Object System.Drawing.Point(110, 262)), (New-Object System.Drawing.Point(70, 262))))
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 255, 255, 255))), 64, 256, 12, 12)
# logo tile
$tile = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
$g.FillRectangle($tile, 42, 40, 80, 80)
Draw-Zigzag $g 50 80 64 28 ([System.Drawing.Color]::White) 6
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = 'Center'
$zh = New-Object System.Drawing.Font('Microsoft JhengHei UI', 15, [System.Drawing.FontStyle]::Bold)
$en = New-Object System.Drawing.Font('Segoe UI', 9.5)
$g.DrawString([string]::Concat([char]0x985E, [char]0x6BD4, [char]0x8A2D, [char]0x8A08, [char]0x5BE6, [char]0x9A57, [char]0x5BA4), $zh, $white, (New-Object System.Drawing.RectangleF(0, 140, 164, 30)), $fmt)
$g.DrawString('Analog Design Lab', $en, $white, (New-Object System.Drawing.RectangleF(0, 172, 164, 20)), $fmt)
$g.Dispose()
Save-Bmp $bmp 'sidebar.bmp'

# ---- header (inner pages, shown at the top right) ----
$bmp = New-Object System.Drawing.Bitmap(150, 57, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::White)
$g.FillRectangle((New-Object System.Drawing.SolidBrush($accent)), 104, 10, 37, 37)
Draw-Zigzag $g 108 28.5 29 14 ([System.Drawing.Color]::White) 3
$g.Dispose()
Save-Bmp $bmp 'header.bmp'
Write-Output 'wrote sidebar.bmp, header.bmp'
