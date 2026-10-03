Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $projectRoot 'extension\icons'
foreach ($size in @(16, 32, 48, 128)) {
  $scale = $size / 128.0
  $canvas = [System.Drawing.Bitmap]::new($size * 4, $size * 4)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.ScaleTransform([single]($scale * 4), [single]($scale * 4))
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc(0, 0, 58, 58, 180, 90)
  $path.AddArc(70, 0, 58, 58, 270, 90)
  $path.AddArc(70, 70, 58, 58, 0, 90)
  $path.AddArc(0, 70, 58, 58, 90, 90)
  $path.CloseFigure()
  $background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(24, 61, 134))
  $white = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 15)
  $white.StartCap = $white.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mint = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(86, 230, 186))
  $blue = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(101, 164, 255))
  try {
    $graphics.FillPath($background, $path)
    $graphics.DrawArc($white, 26, 26, 76, 76, 45, 270)
    $graphics.FillEllipse($mint, 83, 29, 16, 16)
    $graphics.FillEllipse($blue, 83, 83, 16, 16)
    $small = [System.Drawing.Bitmap]::new($size, $size)
    $smallGraphics = [System.Drawing.Graphics]::FromImage($small)
    try {
      $smallGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $smallGraphics.DrawImage($canvas, 0, 0, $size, $size)
      $small.Save((Join-Path $outputDirectory "$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $smallGraphics.Dispose(); $small.Dispose() }
  } finally { $graphics.Dispose(); $canvas.Dispose(); $path.Dispose(); $background.Dispose(); $white.Dispose(); $mint.Dispose(); $blue.Dispose() }
}
