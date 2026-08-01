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
    [float]$Radius,
    $Fill = $null,
    [int]$FillModulo = 0,
    [bool]$ShowMotif = $false,
    $DimFill = $null,
    [double]$DimChance = 0
  )
  $hexHeight = [Math]::Sqrt(3) * $Radius
  $random = [System.Random]::new(2408)
  $motifFont = if ($ShowMotif) { [System.Drawing.Font]::new("Bahnschrift Condensed", $Radius * 0.18, [System.Drawing.FontStyle]::Bold) } else { $null }
  $motifFormat = if ($ShowMotif) { [System.Drawing.StringFormat]::new() } else { $null }
  if ($null -ne $motifFormat) {
    $motifFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $motifFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
  }
  for ($row = 0; $row -lt $Rows; $row += 1) {
    for ($column = 0; $column -lt $Columns; $column += 1) {
      $centerX = $StartX + ($column * $Radius * 1.5)
      $centerY = $StartY + ($row * $hexHeight) + ($(if ($column % 2) { $hexHeight / 2 } else { 0 }))
      $points = [System.Drawing.PointF[]]::new(6)
      for ($index = 0; $index -lt 6; $index += 1) {
        $angle = ([Math]::PI / 180) * (60 * $index)
        $points[$index] = [System.Drawing.PointF]::new(
          $centerX + ($Radius * [Math]::Cos($angle)),
          $centerY + ($Radius * [Math]::Sin($angle))
        )
      }
      if ($null -ne $Fill -and $FillModulo -gt 0 -and (($row * 3 + $column) % $FillModulo) -eq 0) {
        $cellFill = if ($null -ne $DimFill -and $random.NextDouble() -lt $DimChance) { $DimFill } else { $Fill }
        $Graphics.FillPolygon($cellFill, $points)
      }
      $Graphics.DrawPolygon($Pen, $points)
      if ($ShowMotif) {
        $labelBounds = [System.Drawing.RectangleF]::new($centerX - ($Radius * 0.78), $centerY - ($Radius * 0.14), $Radius * 1.56, $Radius * 0.28)
        $Graphics.DrawString("EMERGENCY", $motifFont, $Pen.Brush, $labelBounds, $motifFormat)
        $triangleSize = $Radius * 0.15
        $topY = $centerY - ($Radius * 0.38)
        $bottomY = $centerY + ($Radius * 0.38)
        $direction = if (($row + $column) % 2) { 1 } else { -1 }
        $topTriangle = [System.Drawing.PointF[]]@(
          [System.Drawing.PointF]::new($centerX, $topY + ($direction * $triangleSize)),
          [System.Drawing.PointF]::new($centerX - $triangleSize, $topY - ($direction * $triangleSize * 0.7)),
          [System.Drawing.PointF]::new($centerX + $triangleSize, $topY - ($direction * $triangleSize * 0.7))
        )
        $bottomTriangle = [System.Drawing.PointF[]]@(
          [System.Drawing.PointF]::new($centerX, $bottomY - ($direction * $triangleSize)),
          [System.Drawing.PointF]::new($centerX - $triangleSize, $bottomY + ($direction * $triangleSize * 0.7)),
          [System.Drawing.PointF]::new($centerX + $triangleSize, $bottomY + ($direction * $triangleSize * 0.7))
        )
        $Graphics.FillPolygon($Pen.Brush, $topTriangle)
        $Graphics.FillPolygon($Pen.Brush, $bottomTriangle)
      }
    }
  }
  if ($null -ne $motifFont) { $motifFont.Dispose() }
  if ($null -ne $motifFormat) { $motifFormat.Dispose() }
}

function Draw-Panel {
  param($Graphics, [float]$X, [float]$Y, [float]$Width, [float]$Height, $Stroke, $Fill, $FillEnd = $null)
  $path = New-ChamferedRectangle $X $Y $Width $Height 14
  $fillBrush = if ($null -ne $FillEnd) {
    [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height),
      $Fill,
      $FillEnd,
      90.0
    )
  } else {
    [System.Drawing.SolidBrush]::new($Fill)
  }
  $strokePen = [System.Drawing.Pen]::new($Stroke, 3)
  $Graphics.FillPath($fillBrush, $path)
  $Graphics.DrawPath($strokePen, $path)
  $fillBrush.Dispose()
  $strokePen.Dispose()
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
  param(
    $Graphics,
    [string]$Text,
    [string]$Family,
    [float]$Size,
    [System.Drawing.FontStyle]$Style,
    $Color,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [System.Drawing.StringAlignment]$Alignment = [System.Drawing.StringAlignment]::Near,
    [System.Drawing.StringAlignment]$LineAlignment = [System.Drawing.StringAlignment]::Near
  )
  $font = [System.Drawing.Font]::new($Family, $Size, $Style)
  $brush = [System.Drawing.SolidBrush]::new($Color)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = $Alignment
  $format.LineAlignment = $LineAlignment
  $Graphics.DrawString($Text, $font, $brush, [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height), $format)
  $font.Dispose()
  $brush.Dispose()
  $format.Dispose()
}

$data = Get-Content -Raw -Encoding UTF8 -LiteralPath $InputPath | ConvertFrom-Json
$width = 1000
$height = 1400
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
$primary = New-Color "F4F7FF"
$transparent = New-Color "000000" 0
$glassTop = New-Color "080808" 245
$glassBottom = New-Color "080000" 225

$backgroundBrush = [System.Drawing.SolidBrush]::new((New-Color "080000"))
$graphics.FillRectangle($backgroundBrush, 0, 0, $width, $height)
$hexBackground = [System.Drawing.Pen]::new((New-Color "050000"), 10)
$hexFill = [System.Drawing.SolidBrush]::new((New-Color "E00000" 225))
$hexDimFill = [System.Drawing.SolidBrush]::new((New-Color "280000" 235))
Draw-HexGrid $graphics $hexBackground -52 -45 15 17 52 $hexFill 1 $true $hexDimFill 0.15
$backgroundBrush.Dispose()
$hexBackground.Dispose()
$hexFill.Dispose()
$hexDimFill.Dispose()

Draw-WarningStripes $graphics 28 18 944 18 $warning
Draw-WarningStripes $graphics 28 1374 944 14 $warning
Draw-Panel $graphics 28 48 944 1320 $warning $transparent

Draw-Text $graphics "AI NOTIFY" "Bahnschrift" 20 ([System.Drawing.FontStyle]::Bold) $warning 72 66 240 40

$avatar = [System.Drawing.Image]::FromFile([string]$data.avatarPath)
$avatarFrame = New-ChamferedRectangle 72 118 170 170 18
$savedState = $graphics.Save()
$graphics.SetClip($avatarFrame)
$graphics.FillRectangle([System.Drawing.Brushes]::Black, 72, 118, 170, 170)
$graphics.DrawImage($avatar, 72, 118, 170, 170)
$graphics.Restore($savedState)
$graphics.DrawPath([System.Drawing.Pen]::new($warning, 4), $avatarFrame)

Draw-Panel $graphics 282 110 205 76 $warning $glassTop $glassBottom
Draw-Text $graphics ([string]$data.status) "Microsoft JhengHei UI" 32 ([System.Drawing.FontStyle]::Bold) $accent 282 110 205 76 Center Center

Draw-Panel $graphics 282 202 205 86 $warning $glassTop $glassBottom
Draw-Text $graphics "AGENT" "Consolas" 11 ([System.Drawing.FontStyle]::Bold) $warning 282 208 205 22 Center Center
Draw-Text $graphics ([string]$data.agent) "Consolas" 28 ([System.Drawing.FontStyle]::Bold) $primary 282 228 205 52 Center Center

Draw-Panel $graphics 510 110 418 178 $warning $glassTop $glassBottom
Draw-Text $graphics "PROJECT" "Consolas" 12 ([System.Drawing.FontStyle]::Bold) $warning 532 120 360 24
Draw-Text $graphics ([string]$data.project) "Microsoft JhengHei UI" 25 ([System.Drawing.FontStyle]::Bold) $primary 532 146 365 48
Draw-Text $graphics "COMPLETED" "Consolas" 12 ([System.Drawing.FontStyle]::Bold) $warning 532 210 360 24
Draw-Text $graphics ([string]$data.completedAt) "Consolas" 16 ([System.Drawing.FontStyle]::Bold) $primary 532 234 365 36

Draw-Panel $graphics 72 330 856 370 $warning $glassTop $glassBottom
$graphics.FillRectangle([System.Drawing.SolidBrush]::new($warning), 72, 330, 300, 58)
Draw-Text $graphics "USER REQUEST" "Consolas" 19 ([System.Drawing.FontStyle]::Bold) (New-Color "030403") 98 344 260 36
Draw-Text $graphics ([string]$data.request) "Microsoft JhengHei UI" 30 ([System.Drawing.FontStyle]::Bold) $primary 112 420 776 230

Draw-Panel $graphics 72 740 856 550 $warning $glassTop $glassBottom
$graphics.FillRectangle([System.Drawing.SolidBrush]::new($warning), 72, 740, 350, 58)
Draw-Text $graphics "COMPLETION REPORT" "Consolas" 19 ([System.Drawing.FontStyle]::Bold) (New-Color "030403") 98 754 310 36
Draw-Text $graphics ([string]$data.result) "Microsoft JhengHei UI" 34 ([System.Drawing.FontStyle]::Bold) $primary 112 840 776 360
Draw-Text $graphics "STATUS  100%  //  LOCAL RENDER" "Consolas" 16 ([System.Drawing.FontStyle]::Bold) $accent 112 1230 800 36

$outputDirectory = [System.IO.Path]::GetDirectoryName($OutputPath)
if ($outputDirectory) { [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null }
$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$avatar.Dispose()
$avatarFrame.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
