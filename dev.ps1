param(
    [Parameter(Position = 0)]
    [string]$Target = 'help'
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'

function Invoke-InDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [scriptblock]$ScriptBlock
    )

    Push-Location $Path
    try {
        & $ScriptBlock
    }
    finally {
        Pop-Location
    }
}

function Show-Help {
    Write-Host 'Available targets:'
    Write-Host '  setup            Install frontend dependencies'
    Write-Host '  backend-run      Run the Go backend'
    Write-Host '  backend-test     Run Go tests'
    Write-Host '  backend-build    Build Go packages'
    Write-Host '  migrate          Apply database migration'
    Write-Host '  migrate-seed     Apply migration and import seed data'
    Write-Host '  frontend-install Install frontend dependencies'
    Write-Host '  frontend-dev     Start the Vite dev server'
    Write-Host '  frontend-test    Run frontend tests'
    Write-Host '  frontend-build   Build the frontend'
    Write-Host '  clean            Remove common build artifacts'
}

function Start-Backend {
    Invoke-InDirectory $BackendDir { go run ./cmd/api }
}

function Test-Backend {
    Invoke-InDirectory $BackendDir { go test ./... }
}

function Build-Backend {
    Invoke-InDirectory $BackendDir { go build ./... }
}

function Invoke-Migration {
    Invoke-InDirectory $BackendDir { go run ./cmd/migrate }
}

function Invoke-MigrationSeed {
    Invoke-InDirectory $BackendDir { go run ./cmd/migrate -seed }
}

function Install-Frontend {
    Invoke-InDirectory $FrontendDir { corepack pnpm install }
}

function Start-Frontend {
    Invoke-InDirectory $FrontendDir { corepack pnpm dev }
}

function Test-Frontend {
    Invoke-InDirectory $FrontendDir { corepack pnpm test }
}

function Build-Frontend {
    Invoke-InDirectory $FrontendDir { corepack pnpm build }
}

function Remove-Artifacts {
    $BackendExe = Join-Path $BackendDir 'main.exe'
    $FrontendDist = Join-Path $FrontendDir 'dist'

    if (Test-Path $BackendExe) {
        Remove-Item $BackendExe -Force
    }

    if (Test-Path $FrontendDist) {
        Remove-Item $FrontendDist -Recurse -Force
    }
}

switch ($Target) {
    'help' { Show-Help }
    'setup' { Install-Frontend }
    'backend-run' { Start-Backend }
    'backend-test' { Test-Backend }
    'backend-build' { Build-Backend }
    'migrate' { Invoke-Migration }
    'migrate-seed' { Invoke-MigrationSeed }
    'frontend-install' { Install-Frontend }
    'frontend-dev' { Start-Frontend }
    'frontend-test' { Test-Frontend }
    'frontend-build' { Build-Frontend }
    'clean' { Remove-Artifacts }
    default {
        Write-Error "Unknown target: $Target"
        Show-Help
        exit 1
    }
}
