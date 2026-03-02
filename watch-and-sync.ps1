# watch-and-sync.ps1
# Watches custom_components/entity_manager for file changes and auto-syncs to Z: drive

$source = "$PSScriptRoot\custom_components\entity_manager"
$dest   = "Z:\custom_components\entity_manager"

if (-not (Test-Path $source)) { Write-Error "Source not found: $source"; exit 1 }
if (-not (Test-Path "Z:\"))   { Write-Error "Z: drive not accessible.";  exit 1 }

Write-Host ""
Write-Host "Entity Manager - Watch & Auto-Sync" -ForegroundColor Cyan
Write-Host "  Watching: $source" -ForegroundColor Gray
Write-Host "  Syncing to: $dest" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

function Invoke-Sync {
    $rc = 0
    robocopy $source $dest `
        /MIR `
        /XD "__pycache__" ".claude" "tests" ".git" `
        /XF "*.pyc" "*.pyo" "settings.local.json" `
        /NP /NDL /NFL /NJS /NJH | Out-Null
    $rc = $LASTEXITCODE
    if ($rc -ge 8) {
        Write-Host "  [$(Get-Date -f 'HH:mm:ss')] Sync FAILED (robocopy exit $rc)" -ForegroundColor Red
    } elseif ($rc -eq 0) {
        # Nothing changed (shouldn't normally happen right after a change event)
    } else {
        Write-Host "  [$(Get-Date -f 'HH:mm:ss')] Synced" -ForegroundColor Green
    }
}

# Set up watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $source
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName

# Debounce: track last sync time to avoid firing multiple times per save
$script:lastSync = [DateTime]::MinValue
$debounceMs = 500

$onChange = {
    $name = $Event.SourceEventArgs.Name
    # Skip excluded files/dirs
    if ($name -match '\\__pycache__\\|\\\.git\\|\.pyc$|\.pyo$|settings\.local\.json') { return }
    $now = [DateTime]::Now
    if (($now - $script:lastSync).TotalMilliseconds -lt $debounceMs) { return }
    $script:lastSync = $now
    Write-Host "  [$(Get-Date -f 'HH:mm:ss')] Changed: $name" -ForegroundColor DarkGray
    Invoke-Sync
}

Register-ObjectEvent $watcher Changed -Action $onChange | Out-Null
Register-ObjectEvent $watcher Created -Action $onChange | Out-Null
Register-ObjectEvent $watcher Deleted -Action $onChange | Out-Null
Register-ObjectEvent $watcher Renamed -Action $onChange | Out-Null

# Initial sync on start
Write-Host "  [$(Get-Date -f 'HH:mm:ss')] Initial sync..." -ForegroundColor DarkGray
Invoke-Sync

Write-Host "  Watching for changes..." -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Get-EventSubscriber | Unregister-Event
    Write-Host "Watcher stopped." -ForegroundColor Yellow
}
