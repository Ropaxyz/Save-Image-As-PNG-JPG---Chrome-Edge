# generate-icons.ps1
# One-shot script: produces icons/icon16.png, icon48.png, icon128.png.
# The icons are intentionally simple and high-contrast so they look good
# at small sizes in Chrome/Edge.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out  = Join-Path $here 'icons'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }

$bg1 = [System.Drawing.Color]::FromArgb(255, 32, 88, 214)     # deep blue
$bg2 = [System.Drawing.Color]::FromArgb(255, 94, 194, 255)    # light blue
$fg  = [System.Drawing.Color]::White
$fg2 = [System.Drawing.Color]::FromArgb(255, 235, 247, 255)   # slightly off-white

foreach ($size in 16, 48, 128) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $bg1, $bg2, ([System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
    $g.FillRectangle($brushBg, $rect)
    $brushBg.Dispose()

    # Rounded card outline (subtle)
    $penBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 255, 255, 255)), ([single]([Math]::Max(1, [int]($size * 0.03))))
    $g.DrawRectangle($penBorder, 0, 0, ($size - 1), ($size - 1))
    $penBorder.Dispose()

    # Draw a simple "image -> file" glyph (works at 16px too).
    $thick = [single]([Math]::Max(1, [int]($size * 0.08)))
    $pen   = New-Object System.Drawing.Pen $fg, $thick
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round

    # Left: small picture frame
    $pad = [int]([Math]::Round($size * 0.18))
    $frame = New-Object System.Drawing.Rectangle $pad, $pad, ([int]([Math]::Round($size * 0.34))), ([int]([Math]::Round($size * 0.28)))
    $g.DrawRectangle($pen, $frame)
    # mountain line
    $g.DrawLine($pen,
      ($frame.Left + [int]($frame.Width * 0.12)), ($frame.Bottom - [int]($frame.Height * 0.20)),
      ($frame.Left + [int]($frame.Width * 0.42)), ($frame.Top + [int]($frame.Height * 0.55))
    )
    $g.DrawLine($pen,
      ($frame.Left + [int]($frame.Width * 0.42)), ($frame.Top + [int]($frame.Height * 0.55)),
      ($frame.Left + [int]($frame.Width * 0.78)), ($frame.Bottom - [int]($frame.Height * 0.18))
    )

    # Arrow
    $ax1 = $frame.Right + [int]([Math]::Round($size * 0.06))
    $ay  = $frame.Top + [int]([Math]::Round($frame.Height * 0.55))
    $ax2 = $ax1 + [int]([Math]::Round($size * 0.18))
    $g.DrawLine($pen, $ax1, $ay, $ax2, $ay)
    # arrow head
    $g.DrawLine($pen, $ax2, $ay, ($ax2 - [int]($size * 0.06)), ($ay - [int]($size * 0.06)))
    $g.DrawLine($pen, $ax2, $ay, ($ax2 - [int]($size * 0.06)), ($ay + [int]($size * 0.06)))

    # Right: file shape
    $fx = $ax2 + [int]([Math]::Round($size * 0.05))
    $fy = $pad + [int]([Math]::Round($size * 0.02))
    $fw = [int]([Math]::Round($size * 0.26))
    $fh = [int]([Math]::Round($size * 0.34))
    $g.DrawRectangle($pen, $fx, $fy, $fw, $fh)
    # corner fold
    $g.DrawLine($pen, ($fx + $fw - [int]($size * 0.09)), $fy, ($fx + $fw), ($fy + [int]($size * 0.09)))

    # Bottom label (only for 48/128; too cramped at 16)
    if ($size -ge 48) {
        $label = 'PNG/JPG'
        $fontSize = [single]([Math]::Round($size * 0.16))
        $font = New-Object System.Drawing.Font 'Segoe UI', $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
        $brush = New-Object System.Drawing.SolidBrush $fg2
        $fmt = New-Object System.Drawing.StringFormat
        $fmt.Alignment     = [System.Drawing.StringAlignment]::Center
        $fmt.LineAlignment = [System.Drawing.StringAlignment]::Near
        $rectF = New-Object System.Drawing.RectangleF 0, ([single]([Math]::Round($size * 0.70))), ([single]$size), ([single]([Math]::Round($size * 0.30)))
        $g.DrawString($label, $font, $brush, $rectF, $fmt)
        $brush.Dispose(); $font.Dispose(); $fmt.Dispose()
    }

    $pen.Dispose()

    $g.Dispose()

    $path = Join-Path $out ("icon{0}.png" -f $size)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Wrote $path"
}
