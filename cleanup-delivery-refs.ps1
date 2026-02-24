# Eliminar referencias a delivery_driver
$files = @(
    "client\screens\ProfileScreen.tsx",
    "client\screens\PaymentMethodsScreen.tsx",
    "client\components\admin\tabs\UsersTab.tsx",
    "client\components\admin\UserEditModal.tsx",
    "client\components\SmartOrderButton.tsx",
    "client\utils\orderStateValidation.ts",
    "server\authMiddleware.ts",
    "server\financeService.ts",
    "server\financialIntegrity.ts",
    "server\routes\adminRoutes.ts",
    "server\routes\authRoutes.ts",
    "server\routes\stripePaymentRoutes.ts",
    "server\unifiedFinancialService.ts"
)

foreach ($file in $files) {
    $path = "C:\Users\rijar\Proyectos\AstroBar\$file"
    if (Test-Path $path) {
        $content = Get-Content $path -Raw -Encoding UTF8
        $original = $content
        
        # Eliminar delivery_driver de arrays y tipos
        $content = $content -replace "'delivery_driver',?\s*", ""
        $content = $content -replace '"delivery_driver",?\s*', ""
        $content = $content -replace '\|\s*"delivery_driver"', ""
        $content = $content -replace '"delivery_driver"\s*\|', ""
        
        # Limpiar sintaxis
        $content = $content -replace '\[\s*,', '['
        $content = $content -replace ',\s*,', ','
        $content = $content -replace ',\s*\]', ']'
        $content = $content -replace '\(\s*,', '('
        $content = $content -replace ',\s*\)', ')'
        
        if ($content -ne $original) {
            Set-Content -Path $path -Value $content -Encoding UTF8 -NoNewline
            Write-Host "OK $file" -ForegroundColor Green
        }
    }
}

Write-Host "`nCompletado" -ForegroundColor Cyan
