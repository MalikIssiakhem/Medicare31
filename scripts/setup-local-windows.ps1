# ============================================================================
# Medicare31 — Setup local Windows
# ============================================================================
# À exécuter depuis PowerShell dans le dossier racine du projet :
#
#   .\scripts\setup-local-windows.ps1
#
# Si PowerShell refuse l'exécution :
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#
# Ce script :
#   1. Vérifie que Docker tourne
#   2. Propose de copier .env.example en .env (si .env n'existe pas)
#   3. Construit et démarre tous les services
#   4. Attend que tous les services soient "Up"
#   5. Lance le diagnostic SMTP
#   6. Ouvre les URLs utiles dans le navigateur
# ============================================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Medicare31 — Setup local pour présentation" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------- 1. Docker
Write-Host "[1/6] Vérification de Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "      OK : $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ERREUR : Docker n'est pas installé ou pas démarré." -ForegroundColor Red
    Write-Host "         Télécharger Docker Desktop : https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
    Write-Host "         Puis relancer ce script." -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------- 2. .env
Write-Host ""
Write-Host "[2/6] Vérification du fichier .env..." -ForegroundColor Yellow

Set-Location $ProjectRoot

if (-not (Test-Path ".env")) {
    Write-Host "      .env absent. Copie de .env.example..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env" -Force
    Write-Host ""
    Write-Host "      ⚠️  Le fichier .env a été créé avec les valeurs par défaut (MailHog)." -ForegroundColor Yellow
    Write-Host "         Pour utiliser Brevo (envoi réel d'emails), édite .env maintenant :" -ForegroundColor Yellow
    Write-Host "         notepad .env" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "      Appuie sur Entrée pour continuer avec MailHog, ou tape 'n' pour annuler"
    if ($response -eq "n") {
        Write-Host "Annulé. Édite .env puis relance le script." -ForegroundColor Yellow
        exit 0
    }
}
else {
    Write-Host "      OK : .env présent" -ForegroundColor Green
}

# ---------------------------------------------------------------- 3. Build
Write-Host ""
Write-Host "[3/6] Construction des images Docker (première fois : ~2-5 min)..." -ForegroundColor Yellow
docker compose build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR : docker compose build a échoué." -ForegroundColor Red
    exit 1
}
Write-Host "      OK" -ForegroundColor Green

# ---------------------------------------------------------------- 4. Démarrage
Write-Host ""
Write-Host "[4/6] Démarrage des services..." -ForegroundColor Yellow
docker compose up -d 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR : docker compose up a échoué." -ForegroundColor Red
    exit 1
}
Write-Host "      OK" -ForegroundColor Green

# ---------------------------------------------------------------- 5. Attente
Write-Host ""
Write-Host "[5/6] Attente que tous les services soient Up (max 60s)..." -ForegroundColor Yellow
$maxWait = 60
$elapsed = 0
while ($elapsed -lt $maxWait) {
    $services = docker compose ps --format json 2>$null | ConvertFrom-Json
    $unhealthy = $services | Where-Object { $_.State -ne "running" }
    if (-not $unhealthy) {
        Write-Host "      Tous les services tournent." -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 5
    $elapsed += 5
    Write-Host "      ... ${elapsed}s" -ForegroundColor Gray
}

if ($elapsed -ge $maxWait) {
    Write-Host ""
    Write-Host "ATTENTION : certains services ne sont pas 'Up' après ${maxWait}s." -ForegroundColor Yellow
    Write-Host "           Lance 'docker compose ps' pour voir l'état." -ForegroundColor Yellow
}

# ---------------------------------------------------------------- 6. SMTP diag
Write-Host ""
Write-Host "[6/6] Diagnostic SMTP..." -ForegroundColor Yellow
docker compose exec -T backend python scripts/diagnose_smtp.py
Write-Host ""

# ---------------------------------------------------------------- Récap
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Medicare31 est prêt !" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  URLs à ouvrir :"
Write-Host "    Application :  http://localhost" -ForegroundColor White
Write-Host "    Swagger API :  http://localhost/docs" -ForegroundColor White
Write-Host "    Health SMTP :  http://localhost/api/health/smtp" -ForegroundColor White
Write-Host "    MailHog :      http://localhost:8025" -ForegroundColor White
Write-Host ""

$openBrowser = Read-Host "Ouvrir ces URLs dans le navigateur ? (O/n)"
if ($openBrowser -ne "n") {
    Start-Process "http://localhost"
    Start-Process "http://localhost/docs"
    Start-Process "http://localhost:8025"
}

Write-Host ""
Write-Host "Commandes utiles :" -ForegroundColor Cyan
Write-Host "  docker compose ps              # état des services"
Write-Host "  docker compose logs -f backend # logs en direct"
Write-Host "  docker compose down            # arrêter tout"
Write-Host ""
