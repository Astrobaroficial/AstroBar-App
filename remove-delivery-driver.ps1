# Script para eliminar delivery_driver de AstroBar
Write-Host "Eliminando referencias a delivery_driver..." -ForegroundColor Cyan

$files = Get-ChildItem -Path . -Include *.tsx,*.ts -Recurse | 
    Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build" }

$count = 0
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # Eliminar delivery_driver de tipos
        $content = $content -replace '"delivery_driver"', ''
        $content = $content -replace "'delivery_driver'", ''
        $content = $content -replace 'delivery_driver', ''
        
        # Limpiar arrays vacíos resultantes
        $content = $content -replace '\[\s*,', '['
        $content = $content -replace ',\s*,', ','
        $content = $content -replace ',\s*\]', ']'
        $content = $content -replace '\|\s*\|', '|'
        $content = $content -replace '\|\s*;', ';'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            $count++
            Write-Host "OK $($file.Name)" -ForegroundColor Green
        }
    } catch {
        Write-Host "ERROR $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`nArchivos modificados: $count" -ForegroundColor Green
