param(
    [Parameter(Mandatory = $true)]
    [string]$UnityWebBuild,

    [string]$NpcData
)

$ErrorActionPreference = 'Stop'
$siteRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$sourceRoot = [System.IO.Path]::GetFullPath($UnityWebBuild)
$sourceBuild = Join-Path $sourceRoot 'Build'
$targetBuild = Join-Path $siteRoot 'Build'

if (-not (Test-Path -LiteralPath $sourceBuild -PathType Container)) {
    throw "Unity build folder was not found: $sourceBuild"
}

$requiredFiles = @(
    'Neoto.loader.js',
    'Neoto.data.unityweb',
    'Neoto.framework.js.unityweb',
    'Neoto.wasm.unityweb'
)

foreach ($fileName in $requiredFiles) {
    $sourceFile = Join-Path $sourceBuild $fileName
    if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
        throw "Required build file is missing: $sourceFile. Keep the Unity product name set to Neoto."
    }
}

if (-not (Test-Path -LiteralPath $targetBuild -PathType Container)) {
    New-Item -ItemType Directory -Path $targetBuild | Out-Null
}

foreach ($fileName in $requiredFiles) {
    Copy-Item -LiteralPath (Join-Path $sourceBuild $fileName) -Destination (Join-Path $targetBuild $fileName) -Force
}

if ([string]::IsNullOrWhiteSpace($NpcData)) {
    $automaticNpcData = Join-Path $sourceRoot 'NpcData'
    if (Test-Path -LiteralPath $automaticNpcData -PathType Container) {
        $NpcData = $automaticNpcData
    }
}

if (-not [string]::IsNullOrWhiteSpace($NpcData)) {
    $npcSource = [System.IO.Path]::GetFullPath($NpcData)
    if (-not (Test-Path -LiteralPath $npcSource -PathType Container)) {
        throw "NPC data folder was not found: $npcSource"
    }
    $npcTarget = Join-Path $siteRoot 'NpcData'
    if (-not (Test-Path -LiteralPath $npcTarget -PathType Container)) {
        New-Item -ItemType Directory -Path $npcTarget | Out-Null
    }
    Get-ChildItem -LiteralPath $npcSource -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $npcTarget -Recurse -Force
    }
}

Write-Host 'Neoto game files updated.' -ForegroundColor Green
Write-Host 'The website wrapper, policy pages and ad configuration were preserved.'
