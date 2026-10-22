Add-Type -AssemblyName System.Drawing
$srcPath = "d:\NF Tech\FairExit\public\fairexit-wordmark.png"
$dstPath = "d:\NF Tech\FairExit\public\fairexit-wordmark-dark.png"

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$dst = New-Object System.Drawing.Bitmap($src.Width, $src.Height)

for ($x = 0; $x -lt $src.Width; $x++) {
    for ($y = 0; $y -lt $src.Height; $y++) {
        $c = $src.GetPixel($x, $y)
        if ($c.A -gt 15) {
            # Check if this pixel is the teal/green part
            # Green in the logo has high G (> 110) and G is higher than R by at least 25
            if ($c.G -gt 110 -and $c.G -gt ($c.R + 25)) {
                $dst.SetPixel($x, $y, $c)
            } else {
                # Dark navy/grey parts -> change to white while preserving alpha antialiasing
                $dst.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($c.A, 255, 255, 255))
            }
        } else {
            $dst.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$src.Dispose()
$dst.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()

# Also copy to fairexitlogo-dark.png for consistency
Copy-Item -Path $dstPath -Destination "d:\NF Tech\FairExit\public\fairexitlogo-dark.png" -Force

Write-Output "Successfully generated dark logo!"
