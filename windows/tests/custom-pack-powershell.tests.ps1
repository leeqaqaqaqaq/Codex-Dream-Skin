$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$WindowsRoot = Join-Path $RepoRoot 'windows'
$CustomInstaller = Join-Path $RepoRoot 'custom-themes\Install-Custom-Themes.ps1'

. (Join-Path $WindowsRoot 'scripts\common-windows.ps1')
. (Join-Path $WindowsRoot 'scripts\theme-windows.ps1')

$TempStateRoot = Join-Path $env:TEMP ('dream-skin-custom-ps-test-' + [guid]::NewGuid().ToString('N'))

try {
  $installed = & $CustomInstaller -StateRoot $TempStateRoot -SkipRuntimeSync
  if (@($installed).Count -ne 5) {
    throw "Expected 5 installed custom themes, got $(@($installed).Count)"
  }

  $paths = Get-DreamSkinThemePaths -StateRoot $TempStateRoot
  foreach ($officialId in @('preset-arina-hashimoto', 'preset-gothic-void-crusade')) {
    $presetPath = Join-Path $paths.Saved $officialId
    if (-not (Test-Path -LiteralPath $presetPath -PathType Container)) {
      throw "Official preset '$officialId' was missing after installing custom themes"
    }
    $loadedPreset = Read-DreamSkinTheme -ThemeDirectory $presetPath
    if ("$($loadedPreset.Theme.id)" -cne $officialId) {
      throw "Official preset '$officialId' metadata mismatch"
    }
  }

  # 1. Switch to multi-page artist-v2 theme (AURORA Soft Ascension)
  $softSavedDir = Join-Path $paths.Saved 'custom-aurora-soft-ascension'
  $activatedSoft = Use-DreamSkinSavedTheme -ThemeDirectory $softSavedDir -StateRoot $TempStateRoot
  if ("$($activatedSoft.Theme.customPack)" -cne 'artist-v2') {
    throw "Expected artist-v2 customPack on active theme, got '$($activatedSoft.Theme.customPack)'"
  }
  foreach ($role in @('home', 'task', 'settings', 'utility')) {
    $stagedPage = Join-Path $paths.Active "page-$role.jpg"
    if (-not (Test-Path -LiteralPath $stagedPage -PathType Leaf)) {
      throw "Expected staged page image '$stagedPage' in active theme directory"
    }
  }
  if (-not (Test-DreamSkinThemeDirectoryHasOnlyRuntimeFiles -ThemeDirectory $paths.Active)) {
    throw 'Active artist-v2 directory failed Test-DreamSkinThemeDirectoryHasOnlyRuntimeFiles'
  }

  # 2. Save current active theme and verify pageImages remain intact on cloned saved theme
  $cloned = Save-DreamSkinCurrentTheme -Name 'AURORA Soft Copy' -StateRoot $TempStateRoot
  foreach ($role in @('home', 'task', 'settings', 'utility')) {
    $clonedPage = Join-Path $cloned.Directory "page-$role.jpg"
    if (-not (Test-Path -LiteralPath $clonedPage -PathType Leaf)) {
      throw "Saved clone missed page-$role.jpg"
    }
  }

  # 3. Switch back to official preset-arina-hashimoto and confirm zero leftover page-* files
  $officialDir = Join-Path $paths.Saved 'preset-arina-hashimoto'
  $activatedOfficial = Use-DreamSkinSavedTheme -ThemeDirectory $officialDir -StateRoot $TempStateRoot
  if ($activatedOfficial.Theme.PSObject.Properties['customPack']) {
    throw 'Official theme unexpectedly retained customPack property'
  }
  $leftoverPages = @(Get-ChildItem -LiteralPath $paths.Active -File -Filter 'page-*' -ErrorAction SilentlyContinue)
  if ($leftoverPages.Count -ne 0) {
    throw "Expected 0 stale page-* files in active-theme after switching to official theme, found $($leftoverPages.Count)"
  }
  if (-not (Test-DreamSkinThemeDirectoryHasOnlyRuntimeFiles -ThemeDirectory $paths.Active)) {
    throw 'Active official directory failed Test-DreamSkinThemeDirectoryHasOnlyRuntimeFiles'
  }

  Write-Output 'PASS: custom-pack-powershell coexistence tests passed (5 custom themes, official presets preserved, page-* staged & cleaned).'
} finally {
  if (Test-Path -LiteralPath $TempStateRoot) {
    Remove-Item -LiteralPath $TempStateRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
