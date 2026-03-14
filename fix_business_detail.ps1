$file = "C:\Users\rijar\Proyectos\AstroBar_BACKUP\client\screens\BusinessDetailScreen.tsx"
$lines = Get-Content $file
$newLines = @()
$skip = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($i -eq 336 -and $lines[$i] -match "Pressable") {
        $skip = $true
    }
    if ($skip -and $i -eq 588) {
        $skip = $false
        $newLines += "          </>"
        $newLines += "        ) : null}"
        $newLines += "      </ScrollView>"
        continue
    }
    if (-not $skip) {
        $newLines += $lines[$i]
    }
}

$newLines | Set-Content $file
