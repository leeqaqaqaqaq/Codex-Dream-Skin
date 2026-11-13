[CmdletBinding()]
param(
  [string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'),
  [string]$Activate = '',
  [switch]$SkipRuntimeSync
)

$ErrorActionPreference = 'Stop'

$PackRoot = $PSScriptRoot
$RepoRoot = Split-Path -Parent $PackRoot
$SkillRoot = Join-Path $RepoRoot 'windows'
$ThemesSourceRoot = Join-Path $PackRoot 'themes'

. (Join-Path $SkillRoot 'scripts\common-windows.ps1')
. (Join-Path $SkillRoot 'scripts\theme-windows.ps1')

if (-not (Test-Path -LiteralPath $ThemesSourceRoot -PathType Container)) {
  throw "Custom themes folder was not found: $ThemesSourceRoot"
}

$themePaths = Get-DreamSkinThemePaths -StateRoot $StateRoot
Ensure-DreamSkinManagedDirectory -Path $themePaths.Root -Root $themePaths.Root
Ensure-DreamSkinManagedDirectory -Path $themePaths.Saved -Root $themePaths.Root

if (-not $SkipRuntimeSync) {
  $engine = Install-DreamSkinRuntimeEngine -SkillRoot $SkillRoot -StateRoot $StateRoot
  $null = Initialize-DreamSkinThemeStore -SkillRoot $engine.Root -StateRoot $StateRoot
} else {
  $null = Initialize-DreamSkinThemeStore -SkillRoot $SkillRoot -StateRoot $StateRoot
}

$installed = New-Object System.Collections.Generic.List[object]
$mutex = New-DreamSkinThemeImportMutex
$acquired = $false
try {
  try { $acquired = $mutex.WaitOne(15000) } catch [System.Threading.AbandonedMutexException] { $acquired = $true }
  if (-not $acquired) {
    throw 'Another Dream Skin theme operation is currently running; try again shortly.'
  }

  foreach ($sourceDir in (Get-ChildItem -LiteralPath $ThemesSourceRoot -Directory | Sort-Object Name)) {
    $loaded = Read-DreamSkinTheme -ThemeDirectory $sourceDir.FullName
    $id = "$($loaded.Theme.id)"
    if (-not $id -or $id -cnotmatch '^custom-[A-Za-z0-9_-]{1,72}$') {
      throw "Unexpected custom theme id '$id' in $($sourceDir.FullName)"
    }

    $destDir = Join-Path $themePaths.Saved $id
    $stageDir = Join-Path $themePaths.Saved ('.custom-stage-' + [guid]::NewGuid().ToString('N'))
    $backupDir = Join-Path $themePaths.Saved ('.custom-backup-' + [guid]::NewGuid().ToString('N'))
    Ensure-DreamSkinManagedDirectory -Path $stageDir -Root $themePaths.Root
    try {
      foreach ($file in (Get-ChildItem -LiteralPath $sourceDir.FullName -File)) {
        $targetFile = Join-Path $stageDir $file.Name
        Assert-DreamSkinNoReparseComponents -Path $targetFile
        Copy-Item -LiteralPath $file.FullName -Destination $targetFile -Force
      }
      $null = Read-DreamSkinTheme -ThemeDirectory $stageDir

      Assert-DreamSkinNoReparseComponents -Path $destDir
      if (Test-Path -LiteralPath $destDir -PathType Container) {
        [System.IO.Directory]::Move($destDir, $backupDir)
      }
      [System.IO.Directory]::Move($stageDir, $destDir)
      if (Test-Path -LiteralPath $backupDir -PathType Container) {
        Remove-DreamSkinManagedDirectoryVerified -Path $backupDir -Root $themePaths.Root
      }
      $installed.Add([pscustomobject]@{
        Id = $id
        Name = "$($loaded.Theme.name)"
        CustomPack = if ($loaded.Theme.PSObject.Properties['customPack']) { "$($loaded.Theme.customPack)" } else { 'artist-v1' }
        Path = $destDir
      }) | Out-Null
    } finally {
      if (Test-Path -LiteralPath $stageDir -PathType Container) {
        Remove-Item -LiteralPath $stageDir -Recurse -Force -ErrorAction SilentlyContinue
      }
      if ((Test-Path -LiteralPath $backupDir -PathType Container) -and
        -not (Test-Path -LiteralPath $destDir -PathType Container)) {
        try { [System.IO.Directory]::Move($backupDir, $destDir) } catch {}
      }
    }
  }
} finally {
  if ($acquired) { try { $mutex.ReleaseMutex() } catch {} }
  $mutex.Dispose()
}

if ($Activate) {
  $activateDir = Join-Path $themePaths.Saved $Activate
  if (-not (Test-Path -LiteralPath $activateDir -PathType Container)) {
    throw "Requested theme to activate was not installed: $Activate"
  }
  $null = Use-DreamSkinSavedTheme -ThemeDirectory $activateDir -StateRoot $StateRoot
}

$installed.ToArray()
