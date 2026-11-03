# Sube la carpeta tienda/ al VPS y (re)arranca la tienda con Docker.
# Uso (PowerShell, desde cualquier carpeta):
#   .\deploy.ps1 root@IP_DEL_VPS
# Primera vez: después del script, edita el .env en el servidor:
#   ssh root@IP_DEL_VPS nano /opt/alpha-reset/tienda/.env
#   ssh root@IP_DEL_VPS "cd /opt/alpha-reset/tienda && docker compose restart shop"
param([Parameter(Mandatory = $true)][string]$Server)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$tmp = Join-Path $env:TEMP "alpha-reset-tienda.tgz"

# Empaqueta sin node_modules, sin tu .env local y sin los registros de ventas/leads
tar -czf $tmp -C $here --exclude=node_modules --exclude=.env --exclude="private/*.jsonl" .
scp $tmp "${Server}:/tmp/alpha-reset-tienda.tgz"
ssh $Server "mkdir -p /opt/alpha-reset/tienda && tar -xzf /tmp/alpha-reset-tienda.tgz -C /opt/alpha-reset/tienda && rm /tmp/alpha-reset-tienda.tgz && cd /opt/alpha-reset/tienda && ([ -f .env ] || cp .env.example .env) && docker compose up -d --build && docker compose ps"
Remove-Item $tmp
Write-Host ""
Write-Host "Listo. Si es la primera vez, rellena el .env en el servidor (ver cabecera de este script)." -ForegroundColor Green
