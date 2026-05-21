param(
  [string]$SourceDir,
  [string]$GalleryName,
  [int]$ThumbWidth = 360
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$destDir = Join-Path $root "images\galleries\$GalleryName"
$thumbDir = Join-Path $destDir "thumbs"

New-Item -ItemType Directory -Force -Path $destDir, $thumbDir | Out-Null

$files = Get-ChildItem $SourceDir -File | Where-Object {
  $_.Extension -match '\.(jpe?g|png|webp)$'
}

foreach ($f in $files) {
  $dest = Join-Path $destDir $f.Name
  Copy-Item $f.FullName $dest -Force

  $thumbPath = Join-Path $thumbDir $f.Name
  $img = [System.Drawing.Image]::FromFile($dest)
  try {
    $w = $img.Width
    $h = $img.Height
    if ($w -le $ThumbWidth) {
      Copy-Item $dest $thumbPath -Force
    } else {
      $nw = $ThumbWidth
      $nh = [int][Math]::Round($h * ($ThumbWidth / $w))
      $bmp = New-Object System.Drawing.Bitmap $nw, $nh
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($img, 0, 0, $nw, $nh)
      $bmp.Save($thumbPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      $g.Dispose()
      $bmp.Dispose()
    }
  } finally {
    $img.Dispose()
  }
}

Write-Host "Gallery $GalleryName : $($files.Count) images"
