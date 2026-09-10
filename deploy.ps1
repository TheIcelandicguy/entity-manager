# Thin wrapper - the real logic lives in E:\tools\deploy-to-ha.ps1
# Usage:  .\deploy.ps1          deploy
#         .\deploy.ps1 -DryRun  show what would change
param([switch]$DryRun)
& 'E:\tools\deploy-to-ha.ps1' -Domain 'entity_manager' -Source "$PSScriptRoot\custom_components\entity_manager" -DryRun:$DryRun
exit $LASTEXITCODE
