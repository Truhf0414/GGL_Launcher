param(
  [string]$FromVersion = "",
  [string]$ToVersion = "",
  [string]$SiteRoot = "H:\Caddy_sitebuild",
  [string]$DomainBase = "https://ggl.leaharmonic.com",
  [string]$FromZip = "",
  [string]$ToZip = "",
  [string]$ForceConfigPaths = "",
  [switch]$DryRun,
  [switch]$Verify,
  [int]$VerifySample = 50
)

$ErrorActionPreference = "Stop"

if (-not $FromVersion) { $FromVersion = Read-Host "FromVersion (例如 GGL3.0.01)" }
if (-not $ToVersion)   { $ToVersion   = Read-Host "ToVersion   (例如 GGL3.0.02)" }

if (-not $FromZip) { $FromZip = Join-Path $SiteRoot ("instance-{0}.zip" -f $FromVersion) }
if (-not $ToZip)   { $ToZip   = Join-Path $SiteRoot ("instance-{0}.zip" -f $ToVersion) }

$args = @(
  "scripts/release-v2.js",
  "--siteRoot", $SiteRoot,
  "--domainBase", $DomainBase,
  "--fromVersion", $FromVersion,
  "--toVersion", $ToVersion,
  "--fromZip", $FromZip,
  "--toZip", $ToZip
)

if ($ForceConfigPaths) {
  $args += @("--forceConfigPaths", $ForceConfigPaths)
}
if ($DryRun) {
  $args += @("--dryRun")
}
if ($Verify) {
  $args += @("--verify", "--verifySample", "$VerifySample")
}

Write-Host "Running: node $($args -join ' ')" -ForegroundColor Cyan
node @args

