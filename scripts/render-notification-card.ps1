param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function New-ChamferedRectangle {
  param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Cut)
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $points = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($X + $Cut, $Y),
    [System.Drawing.PointF]::new($X + $Width - $Cut, $Y),
    [System.Drawing.PointF]::new($X + $Width, $Y + $Cut),
    [System.Drawing.PointF]::new($X + $Width, $Y + $Height - $Cut),
    [System.Drawing.PointF]::new($X + $Width - $Cut, $Y + $Height),
    [System.Drawing.PointF]::new($X + $Cut, $Y + $Height),
    [System.Drawing.PointF]::new($X, $Y + $Height - $Cut),
    [System.Drawing.PointF]::new($X, $Y + $Cut)
  )
  $path.AddPolygon($points)
  $path.CloseFigure()
  return $path
}

function New-Color {
  param([string]$Hex, [int]$Alpha = 255)
  $hexValue = $Hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($hexValue.Substring(0, 2), 16),
    [Convert]::ToInt32($hexValue.Substring(2, 2), 16),
    [Convert]::ToInt32($hexValue.Substring(4, 2), 16)
  )
}

function Draw-HexGrid {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Pen]$Pen,
    [float]$StartX,
    [float]$StartY,
    [int]$Columns,
    [int]$Rows,
    [float]$Radius
  )
  $hexWidth = [Math]::Sqrt(3) * $Radius
  for ($row = 0; $row -lt $Rows; $row += 1) {
    for ($column = 0; $column -lt $Columns; $column += 1) {
      $centerX = $StartX + ($column * $hexWidth) + ($(if ($row % 2) { $hexWidth / 2 } else { 0 }))
      $centerY = $StartY + ($row * $Radius * 1.5)
      $points = [System.Drawing.PointF[]]::new(6)
      for ($index = 0; $index -lt 6; $index += 1) {
        $angle = ([Math]::PI / 180) * ((60 * $index) - 30)
        $points[$index] = [System.Drawing.PointF]::new(
          $centerX + ($Radius * [Math]::Cos($angle)),
          $centerY + ($Radius * [Math]::Sin($angle))
        )
      }
      $Graphics.DrawPolygon($Pen, $points)
    }
  }
}

function Draw-Panel {
  param($Graphics, [float]$X, [float]$Y, [float]$Width, [float]$Height, $Stroke, $Fill)
  $path = New-ChamferedRectangle $X $Y $Width $Height 14
  $Graphics.FillPath([System.Drawing.SolidBrush]::new($Fill), $path)
  $Graphics.DrawPath([System.Drawing.Pen]::new($Stroke, 3), $path)
  $path.Dispose()
}

function Draw-WarningStripes {
  param($Graphics, [float]$X, [float]$Y, [float]$Width, [float]$Height, $Warning)
  $Graphics.FillRectangle([System.Drawing.SolidBrush]::new($Warning), $X, $Y, $Width, $Height)
  for ($stripeX = $X - $Height; $stripeX -lt ($X + $Width); $stripeX += 58) {
    $Graphics.FillPolygon([System.Drawing.Brushes]::Black, [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new($stripeX, $Y),
      [System.Drawing.PointF]::new($stripeX + 28, $Y),
      [System.Drawing.PointF]::new($stripeX + 46, $Y + $Height),
      [System.Drawing.PointF]::new($stripeX + 18, $Y + $Height)
    ))
  }
}

function Draw-Text {
  param($Graphics, [string]$Text, [string]$Family, [float]$Size, [System.Drawing.FontStyle]$Style, $Color, [float]$X, [float]$Y, [float]$Width, [float]$Height)
  $font = [System.Drawing.Font]::new($Family, $Size, $Style)
  $brush = [System.Drawing.SolidBrush]::new($Color)
  $Graphics.DrawString($Text, $font, $brush, [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height))
  $font.Dispose()
  $brush.Dispose()
}

$data = Get-Content -Raw -Encoding UTF8 -LiteralPath $InputPath | ConvertFrom-Json
$width = 1600
$height = 700
$bitmap = [System.Drawing.Bitmap]::new($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear((New-Color "030403"))

$accentHex = switch ($data.statusKey) {
  "completed" { "83FF00" }
  "needs_approval" { "FFD52A" }
  "failed" { "FF4D35" }
  "usage_limited" { "B08CFF" }
  default { "63E6FF" }
}
$accent = New-Color $accentHex
$warning = New-Color "FF7400"
$purple = New-Color "632C8B"
$primary = New-Color "F4F7FF"
$leftPanel = New-Color "080704"
$rightPanel = New-Color "050504"

Draw-WarningStripes $graphics 28 18 1544 18 $warning
Draw-WarningStripes $graphics 28 674 1544 14 $warning
Draw-Panel $graphics 28 48 310 620 $warning $leftPanel
Draw-Panel $graphics 365 48 1207 620 $warning $rightPanel

Draw-Text $graphics "AI NOTIFY" "Bahnschrift" 18 ([System.Drawing.FontStyle]::Bold) $warning 72 56 240 40

$avatar = [System.Drawing.Image]::FromFile([string]$data.avatarPath)
$avatarFrame = New-ChamferedRectangle 73 102 220 220 18
$savedState = $graphics.Save()
$graphics.SetClip($avatarFrame)
$graphics.FillRectangle([System.Drawing.Brushes]::Black, 73, 102, 220, 220)
$graphics.DrawImage($avatar, 73, 102, 220, 220)
$graphics.Restore($savedState)
$graphics.DrawPath([System.Drawing.Pen]::new($warning, 4), $avatarFrame)

Draw-Text $graphics ([string]$data.status) "Microsoft JhengHei UI" 34 ([System.Drawing.FontStyle]::Bold) $accent 72 354 230 62
Draw-Text $graphics "PROJECT" "Consolas" 13 ([System.Drawing.FontStyle]::Bold) $warning 72 430 220 30
Draw-Text $graphics ([string]$data.project) "Microsoft JhengHei UI" 22 ([System.Drawing.FontStyle]::Regular) $primary 72 458 230 52
Draw-Text $graphics "AGENT" "Consolas" 13 ([System.Drawing.FontStyle]::Bold) $warning 72 516 220 30
Draw-Text $graphics ([string]$data.agent) "Consolas" 20 ([System.Drawing.FontStyle]::Bold) $accent 72 544 220 42
Draw-Text $graphics "COMPLETED" "Consolas" 12 ([System.Drawing.FontStyle]::Bold) $warning 72 598 220 26
Draw-Text $graphics ([string]$data.completedAt) "Consolas" 16 ([System.Drawing.FontStyle]::Bold) $primary 72 623 235 32

$graphics.FillRectangle([System.Drawing.SolidBrush]::new($warning), 365, 48, 350, 52)
Draw-Text $graphics "COMPLETION REPORT" "Consolas" 17 ([System.Drawing.FontStyle]::Bold) (New-Color "030403") 392 60 320 34
Draw-HexGrid $graphics ([System.Drawing.Pen]::new((New-Color "632C8B" 75), 1)) 1160 125 8 6 25
Draw-Text $graphics ([string]$data.result) "Microsoft JhengHei UI" 30 ([System.Drawing.FontStyle]::Bold) $primary 420 170 1060 300
Draw-Text $graphics "STATUS  100%  //  LOCAL RENDER" "Consolas" 14 ([System.Drawing.FontStyle]::Bold) $accent 420 590 800 34

$outputDirectory = [System.IO.Path]::GetDirectoryName($OutputPath)
if ($outputDirectory) { [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null }
$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$avatar.Dispose()
$avatarFrame.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
