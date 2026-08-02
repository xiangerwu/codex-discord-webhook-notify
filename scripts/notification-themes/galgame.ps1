param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function New-Color {
  param([string]$Hex, [int]$Alpha = 255)
  $value = $Hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($value.Substring(0, 2), 16),
    [Convert]::ToInt32($value.Substring(2, 2), 16),
    [Convert]::ToInt32($value.Substring(4, 2), 16)
  )
}

function New-RoundedRectangle {
  param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-RoundedPanel {
  param(
    $Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    $Fill,
    $Stroke,
    [float]$StrokeWidth = 2
  )
  $path = New-RoundedRectangle $X $Y $Width $Height 24
  $fillBrush = [System.Drawing.SolidBrush]::new($Fill)
  $strokePen = [System.Drawing.Pen]::new($Stroke, $StrokeWidth)
  $Graphics.FillPath($fillBrush, $path)
  $Graphics.DrawPath($strokePen, $path)
  $fillBrush.Dispose()
  $strokePen.Dispose()
  $path.Dispose()
}

function Draw-Text {
  param(
    $Graphics,
    [string]$Text,
    [float]$Size,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [bool]$Bold = $false,
    $Color = $null,
    [System.Drawing.StringAlignment]$Alignment = [System.Drawing.StringAlignment]::Near
  )
  $style = if ($Bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = [System.Drawing.Font]::new("Microsoft JhengHei UI", $Size, $style)
  $brush = [System.Drawing.SolidBrush]::new($(if ($null -ne $Color) { $Color } else { New-Color "51445F" }))
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = $Alignment
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $Graphics.DrawString($Text, $font, $brush, [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height), $format)
  $font.Dispose()
  $brush.Dispose()
  $format.Dispose()
}

function Draw-FitText {
  param(
    $Graphics,
    [string]$Text,
    [float]$PreferredSize,
    [float]$MinimumSize,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [bool]$Bold,
    $Color,
    [System.Drawing.StringAlignment]$Alignment = [System.Drawing.StringAlignment]::Near,
    $OutlineColor = $null,
    [int]$OutlineWidth = 0
  )
  $style = if ($Bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $format = [System.Drawing.StringFormat]::new()
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
  $format.Alignment = $Alignment
  $size = $PreferredSize
  while ($size -gt $MinimumSize) {
    $measureFont = [System.Drawing.Font]::new("Microsoft JhengHei UI", $size, $style)
    $measured = $Graphics.MeasureString($Text, $measureFont, [System.Drawing.SizeF]::new($Width, $Height), $format)
    $measureFont.Dispose()
    if ($measured.Height -le $Height -and $measured.Width -le $Width) { break }
    $size -= 1
  }
  $font = [System.Drawing.Font]::new("Microsoft JhengHei UI", $size, $style)
  $brush = [System.Drawing.SolidBrush]::new($Color)
  if ($null -ne $OutlineColor -and $OutlineWidth -gt 0) {
    $outlineBrush = [System.Drawing.SolidBrush]::new($OutlineColor)
    for ($dx = -$OutlineWidth; $dx -le $OutlineWidth; $dx += $OutlineWidth) {
      for ($dy = -$OutlineWidth; $dy -le $OutlineWidth; $dy += $OutlineWidth) {
        if ($dx -eq 0 -and $dy -eq 0) { continue }
        $Graphics.DrawString($Text, $font, $outlineBrush, [System.Drawing.RectangleF]::new($X + $dx, $Y + $dy, $Width, $Height), $format)
      }
    }
    $outlineBrush.Dispose()
  }
  $Graphics.DrawString($Text, $font, $brush, [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height), $format)
  $font.Dispose()
  $brush.Dispose()
  $format.Dispose()
}

function Draw-ChatBubble {
  param($Graphics, [float]$X, [float]$Y, [float]$Width, [float]$Height)
  $radius = 24
  $diameter = $radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.StartFigure()
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddLine($X + $radius, $Y, $X + $Width - $radius, $Y)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddLine($X + $Width, $Y + $radius, $X + $Width, $Y + $Height - 48)
  $path.AddBezier($X + $Width, $Y + $Height - 48, $X + $Width + 1, $Y + $Height - 22, $X + $Width + 17, $Y + $Height + 6, $X + $Width + 42, $Y + $Height + 23)
  $path.AddBezier($X + $Width + 42, $Y + $Height + 23, $X + $Width + 12, $Y + $Height + 16, $X + $Width - 15, $Y + $Height + 4, $X + $Width - 38, $Y + $Height)
  $path.AddLine($X + $Width - 38, $Y + $Height, $X + $radius, $Y + $Height)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.AddLine($X, $Y + $Height - $radius, $X, $Y + $radius)
  $path.CloseFigure()
  $fillBrush = [System.Drawing.SolidBrush]::new((New-Color "FFFFFF" 247))
  $strokePen = [System.Drawing.Pen]::new((New-Color "B9C9F2"), 3)
  $Graphics.FillPath($fillBrush, $path)
  $Graphics.DrawPath($strokePen, $path)
  $fillBrush.Dispose()
  $strokePen.Dispose()
  $path.Dispose()
}

function Draw-DialogueGradient {
  param($Graphics, [int]$Width)
  for ($row = 0; $row -lt 650; $row += 1) {
    $ratio = $row / 649.0
    $ease = [Math]::Pow($ratio, 1.4)
    $red = [int](143 + ((53 - 143) * $ratio))
    $green = [int](124 + ((36 - 124) * $ratio))
    $blue = [int](232 + ((96 - 232) * $ratio))
    $alpha = [int](252 * $ease)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($alpha, $red, $green, $blue))
    $Graphics.FillRectangle($brush, 0, 750 + $row, $Width, 1)
    $brush.Dispose()
  }
}

function Draw-ReplyFrame {
  param($Graphics)
  $path = New-RoundedRectangle 50 790 900 430 28
  $fillBrush = [System.Drawing.SolidBrush]::new((New-Color "332252" 0))
  $strokePen = [System.Drawing.Pen]::new((New-Color "EEE8FF" 0), 2)
  $Graphics.FillPath($fillBrush, $path)
  $Graphics.DrawPath($strokePen, $path)
  $fillBrush.Dispose()
  $strokePen.Dispose()
  $path.Dispose()
}

$data = Get-Content -Raw -Encoding UTF8 -LiteralPath $InputPath | ConvertFrom-Json
$heart = [char]0x2661
$music = [char]0x266A
$next = [char]0x25BC
$userLabel = ([string][char]0x54E5) + " " + ([char]0x54E5) + " " + ([char]0x5927) + " " + ([char]0x4EBA)
$riceName = ([string][char]0x5C0F) + ([char]0x7C73) + ([char]0x6D74)
$width = 1000
$height = 1400
$bitmap = [System.Drawing.Bitmap]::new($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.Rectangle]::new(0, 0, $width, $height),
  (New-Color "FFF1F7"),
  (New-Color "EEE9FF"),
  90
)
$graphics.FillRectangle($background, 0, 0, $width, $height)
$background.Dispose()

$dotBrush = [System.Drawing.SolidBrush]::new((New-Color "E2C9F4" 60))
for ($dotY = 130; $dotY -lt 1100; $dotY += 86) {
  for ($dotX = 62; $dotX -lt 960; $dotX += 88) {
    $offset = (($dotY / 86) % 2) * 18
    $graphics.FillEllipse($dotBrush, $dotX + $offset, $dotY, 7, 7)
  }
}
$dotBrush.Dispose()

Draw-RoundedPanel $graphics 42 34 300 68 (New-Color "FFF9FC" 248) (New-Color "D5BDEA") 2
Draw-FitText $graphics ([string]$data.project) 22 16 62 42 260 52 $true (New-Color "8166B0") Center
Draw-RoundedPanel $graphics 668 34 290 68 (New-Color "FFF9FC" 248) (New-Color "B8ABF1") 2
Draw-Text $graphics ([string]$data.completedAt) 19 683 42 260 52 $true (New-Color "6957AA") Center

$avatar = [System.Drawing.Image]::FromFile([string]$data.avatarPath)
$avatarCircle = [System.Drawing.Drawing2D.GraphicsPath]::new()
$avatarCircle.AddEllipse(350, 150, 300, 300)
$savedState = $graphics.Save()
$graphics.SetClip($avatarCircle)
$avatarBackground = [System.Drawing.SolidBrush]::new((New-Color "241C2B"))
$graphics.FillEllipse($avatarBackground, 350, 150, 300, 300)
$graphics.DrawImage($avatar, 367, 167, 266, 266)
$avatarBackground.Dispose()
$graphics.Restore($savedState)
$avatarOuterPen = [System.Drawing.Pen]::new((New-Color "FFFFFF"), 9)
$avatarAccentPen = [System.Drawing.Pen]::new((New-Color "8F7CE8"), 4)
$graphics.DrawEllipse($avatarOuterPen, 350, 150, 300, 300)
$graphics.DrawEllipse($avatarAccentPen, 344, 144, 312, 312)
$avatarOuterPen.Dispose()
$avatarAccentPen.Dispose()

Draw-RoundedPanel $graphics 500 128 300 76 (New-Color "8F7CE8") (New-Color "FFFFFF") 3
Draw-FitText $graphics ([string]$data.status + " " + $music) 30 22 514 139 272 52 $true (New-Color "FFFFFF") Center

Draw-ChatBubble $graphics 50 500 900 220
Draw-RoundedPanel $graphics 72 468 290 68 (New-Color "8F7CE8") (New-Color "FFFFFF" 220) 2
Draw-FitText $graphics ($heart + "  " + $userLabel) 27 20 84 476 266 52 $true (New-Color "FFFFFF") Center
Draw-FitText $graphics ([string]$data.request) 25 16 85 553 800 145 $true (New-Color "514869")

Draw-DialogueGradient $graphics $width
Draw-ReplyFrame $graphics
$speaker = ([string]$data.agent) + " " + $riceName
Draw-RoundedPanel $graphics 72 758 560 72 (New-Color "8F7CE8") (New-Color "FFFFFF" 220) 2
Draw-FitText $graphics ($heart + "  " + $speaker) 30 20 86 768 532 52 $true (New-Color "FFFFFF") Center
Draw-FitText $graphics ([string]$data.result) 32 18 82 855 830 280 $true (New-Color "FFFFFF") Near (New-Color "211B2A" 230) 2
Draw-Text $graphics ([string]$next) 18 880 1140 40 36 $true (New-Color "FFFFFF") Center

$separatorPen = [System.Drawing.Pen]::new((New-Color "D9D0FF" 46), 1)
foreach ($separatorX in 143, 286, 429, 572, 715, 858) {
  $graphics.DrawLine($separatorPen, $separatorX, 1304, $separatorX, 1340)
}
$separatorPen.Dispose()
Draw-Text $graphics "PAUSE" 16 0 1292 143 56 $true (New-Color "FFFFFF") Center
Draw-Text $graphics "SKIP" 16 143 1292 143 56 $true (New-Color "FFFFFF") Center
Draw-Text $graphics "AUTO" 16 286 1292 143 56 $true (New-Color "FFFFFF") Center
Draw-Text $graphics "LOG" 16 429 1292 143 56 $true (New-Color "FFFFFF") Center
Draw-Text $graphics "SAVE" 16 572 1292 143 56 $true (New-Color "FFFFFF") Center
Draw-Text $graphics "LOAD" 16 715 1292 143 56 $true (New-Color "FFFFFF") Center
Draw-Text $graphics "SYSTEM" 15 858 1292 142 56 $true (New-Color "FFFFFF") Center

$outputDirectory = [System.IO.Path]::GetDirectoryName($OutputPath)
if ($outputDirectory) { [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null }
$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$avatar.Dispose()
$avatarCircle.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
