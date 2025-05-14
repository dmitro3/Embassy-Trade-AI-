# TradeForce AI Log Monitor
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "TradeForce AI Log Monitor" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will monitor log files for errors." -ForegroundColor White
Write-Host ""

# Define log file paths
$clientErrorLog = Join-Path $PSScriptRoot "logs\client-errors.log"
$serverErrorLog = Join-Path $PSScriptRoot "logs\server-errors.log"
$apiErrorLog = Join-Path $PSScriptRoot "logs\api-errors.log"

# Create logs directory if it doesn't exist
$logsDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "Created logs directory: $logsDir" -ForegroundColor Yellow
}

# Create log files if they don't exist
if (-not (Test-Path $clientErrorLog)) {
    New-Item -ItemType File -Path $clientErrorLog | Out-Null
    Write-Host "Created client error log: $clientErrorLog" -ForegroundColor Yellow
}

if (-not (Test-Path $serverErrorLog)) {
    New-Item -ItemType File -Path $serverErrorLog | Out-Null
    Write-Host "Created server error log: $serverErrorLog" -ForegroundColor Yellow
}

if (-not (Test-Path $apiErrorLog)) {
    New-Item -ItemType File -Path $apiErrorLog | Out-Null
    Write-Host "Created API error log: $apiErrorLog" -ForegroundColor Yellow
}

# Function to monitor a log file
function Monitor-LogFile {
    param(
        [string]$LogFile,
        [string]$LogType,
        [System.ConsoleColor]$Color
    )

    $lastLength = 0
    $fileExists = Test-Path $LogFile

    if ($fileExists) {
        $lastLength = (Get-Item $LogFile).Length
    }

    while ($true) {
        Start-Sleep -Seconds 1

        if (-not (Test-Path $LogFile)) {
            continue
        }

        $currentLength = (Get-Item $LogFile).Length

        if ($currentLength -gt $lastLength) {
            $content = Get-Content $LogFile -Tail 10
            $newLines = $content | Select-Object -Skip ($content.Count - ($currentLength - $lastLength) / 100)

            foreach ($line in $newLines) {
                if ($line -match "error|exception|fail|critical|crash") {
                    Write-Host "[$LogType] $line" -ForegroundColor $Color
                }
            }

            $lastLength = $currentLength
        }
    }
}

# Start monitoring each log file in the background
$clientJob = Start-Job -ScriptBlock {
    param($logFile)
    while ($true) {
        if (Test-Path $logFile) {
            $content = Get-Content $logFile -Tail 5 -Wait
            foreach ($line in $content) {
                if ($line -match "error|exception|fail|critical|crash") {
                    Write-Host "[CLIENT] $line" -ForegroundColor Red
                }
            }
        }
        Start-Sleep -Seconds 1
    }
} -ArgumentList $clientErrorLog

$serverJob = Start-Job -ScriptBlock {
    param($logFile)
    while ($true) {
        if (Test-Path $logFile) {
            $content = Get-Content $logFile -Tail 5 -Wait
            foreach ($line in $content) {
                if ($line -match "error|exception|fail|critical|crash") {
                    Write-Host "[SERVER] $line" -ForegroundColor Yellow
                }
            }
        }
        Start-Sleep -Seconds 1
    }
} -ArgumentList $serverErrorLog

$apiJob = Start-Job -ScriptBlock {
    param($logFile)
    while ($true) {
        if (Test-Path $logFile) {
            $content = Get-Content $logFile -Tail 5 -Wait
            foreach ($line in $content) {
                if ($line -match "error|exception|fail|critical|crash") {
                    Write-Host "[API] $line" -ForegroundColor Magenta
                }
            }
        }
        Start-Sleep -Seconds 1
    }
} -ArgumentList $apiErrorLog

Write-Host "Log monitoring started. Press Ctrl+C to stop." -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        if ($clientJob.State -ne "Running") {
            Write-Host "Client log monitor stopped. Restarting..." -ForegroundColor Yellow
            Remove-Job -Job $clientJob -Force
            $clientJob = Start-Job -ScriptBlock {
                param($logFile)
                while ($true) {
                    if (Test-Path $logFile) {
                        $content = Get-Content $logFile -Tail 5 -Wait
                        foreach ($line in $content) {
                            if ($line -match "error|exception|fail|critical|crash") {
                                Write-Host "[CLIENT] $line" -ForegroundColor Red
                            }
                        }
                    }
                    Start-Sleep -Seconds 1
                }
            } -ArgumentList $clientErrorLog
        }
        
        if ($serverJob.State -ne "Running") {
            Write-Host "Server log monitor stopped. Restarting..." -ForegroundColor Yellow
            Remove-Job -Job $serverJob -Force
            $serverJob = Start-Job -ScriptBlock {
                param($logFile)
                while ($true) {
                    if (Test-Path $logFile) {
                        $content = Get-Content $logFile -Tail 5 -Wait
                        foreach ($line in $content) {
                            if ($line -match "error|exception|fail|critical|crash") {
                                Write-Host "[SERVER] $line" -ForegroundColor Yellow
                            }
                        }
                    }
                    Start-Sleep -Seconds 1
                }
            } -ArgumentList $serverErrorLog
        }
        
        if ($apiJob.State -ne "Running") {
            Write-Host "API log monitor stopped. Restarting..." -ForegroundColor Yellow
            Remove-Job -Job $apiJob -Force
            $apiJob = Start-Job -ScriptBlock {
                param($logFile)
                while ($true) {
                    if (Test-Path $logFile) {
                        $content = Get-Content $logFile -Tail 5 -Wait
                        foreach ($line in $content) {
                            if ($line -match "error|exception|fail|critical|crash") {
                                Write-Host "[API] $line" -ForegroundColor Magenta
                            }
                        }
                    }
                    Start-Sleep -Seconds 1
                }
            } -ArgumentList $apiErrorLog
        }
    }
}
finally {
    # Clean up jobs when script is terminated
    if ($clientJob) { Remove-Job -Job $clientJob -Force -ErrorAction SilentlyContinue }
    if ($serverJob) { Remove-Job -Job $serverJob -Force -ErrorAction SilentlyContinue }
    if ($apiJob) { Remove-Job -Job $apiJob -Force -ErrorAction SilentlyContinue }
    
    Write-Host "Log monitoring stopped." -ForegroundColor Yellow
}
