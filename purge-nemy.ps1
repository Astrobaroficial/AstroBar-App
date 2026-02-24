# Script para purgar NEMY y convertir a AstroBar
Write-Host "Purgando NEMY y convirtiendo a AstroBar..." -ForegroundColor Cyan

# Archivos a procesar
$files = Get-ChildItem -Path . -Include *.tsx,*.ts,*.json,*.md -Recurse | 
    Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build|purge-nemy" }

$count = 0
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # Reemplazos en orden específico
        $content = $content -replace 'NEMY DELIVERY', 'ASTROBAR PROMO'
        $content = $content -replace 'NEMY Order', 'AstroBar Order'
        $content = $content -replace 'NEMY Background', 'AstroBar Background'
        $content = $content -replace 'NEMY Frontend', 'AstroBar Frontend'
        $content = $content -replace 'NEMY Wallet', 'AstroBar Wallet'
        $content = $content -replace 'NEMY Card', 'AstroBar Card'
        $content = $content -replace 'NEMY Soporte', 'AstroBar Soporte'
        $content = $content -replace 'Soporte NEMY', 'Soporte AstroBar'
        $content = $content -replace 'NEMY v', 'AstroBar v'
        $content = $content -replace 'NEMY -', 'AstroBar -'
        $content = $content -replace 'NEMY app', 'AstroBar app'
        $content = $content -replace 'for NEMY', 'for AstroBar'
        $content = $content -replace 'Configuration for NEMY', 'Configuration for AstroBar'
        $content = $content -replace 'Integration for NEMY', 'Integration for AstroBar'
        $content = $content -replace 'Middleware for NEMY', 'Middleware for AstroBar'
        $content = $content -replace 'Service for NEMY', 'Service for AstroBar'
        $content = $content -replace 'NEMY', 'AstroBar'
        
        $content = $content -replace 'Delivery Local', 'Promociones Nocturnas'
        $content = $content -replace 'delivery local', 'promociones nocturnas'
        $content = $content -replace 'Tu delivery local', 'Tu plataforma de promociones'
        $content = $content -replace 'plataforma de delivery', 'plataforma de promociones'
        $content = $content -replace 'servicio de entrega', 'plataforma de promociones'
        $content = $content -replace 'delivery en', 'promociones en'
        
        $content = $content -replace 'Pide comida y productos', 'Descubre promociones en bares'
        $content = $content -replace 'restaurantes y mercados', 'bares y promociones'
        $content = $content -replace 'Conectando Autlan', 'Conectando Buenos Aires'
        
        $content = $content -replace 'Autlan de Navarro', 'Buenos Aires'
        $content = $content -replace 'Autlan, Jalisco', 'Buenos Aires, Argentina'
        $content = $content -replace 'Autlan', 'Buenos Aires'
        $content = $content -replace 'AUTLAN', 'BUENOSAIRES'
        $content = $content -replace 'autlan', 'buenosaires'
        
        $content = $content -replace 'Jalisco, Mexico', 'Argentina'
        $content = $content -replace 'Jalisco', 'Argentina'
        $content = $content -replace 'Mexico', 'Argentina'
        
        $content = $content -replace 'nemy-app\.replit\.app', 'astrobar-app.railway.app'
        $content = $content -replace 'nemy\.replit\.app', 'astrobar.com.ar'
        $content = $content -replace 'nemy\.app', 'astrobar.com.ar'
        $content = $content -replace '@nemy\.mx', '@astrobar.com.ar'
        $content = $content -replace 'nemy\.mx', 'astrobar.com.ar'
        $content = $content -replace 'nemy://', 'astrobar://'
        
        $content = $content -replace '@nemy_', '@astrobar_'
        $content = $content -replace 'nemy_', 'astrobar_'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            $count++
            Write-Host "OK $($file.Name)" -ForegroundColor Green
        }
    } catch {
        Write-Host "ERROR $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`nPurga completada: $count archivos modificados" -ForegroundColor Green
