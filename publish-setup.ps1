# Выкладка нового установщика на hydrogeolab.app.
# Запуск из папки hydrogeolab-site:
#   powershell -ExecutionPolicy Bypass -File publish-setup.ps1 -Server <IP сервера>
# Что делает:
#   1. берёт ..\HydroGeoLab-CSharp\installer\Output\setup.exe и кладёт в downloads\setup.exe;
#   2. версию (из свойств setup.exe) и размер подставляет во все строки «Версия x.y.z · … · N,N МБ»
#      страниц сайта и шаблонов docsgen\*.js;
#   3. отправляет на сервер setup.exe и изменённые страницы (одним архивом) в /var/www/hydrogeolab-site.
# Параметры: -Server (обязательно), -User (root), -Setup (путь к другому setup.exe), -NoUpload (только правка файлов).
param(
    [Parameter(Mandatory = $true)][string]$Server,
    [string]$User = "root",
    [string]$Setup = "",
    [switch]$NoUpload
)
$ErrorActionPreference = "Stop"
$site = $PSScriptRoot
if (-not $Setup) { $Setup = Join-Path $site "..\HydroGeoLab-CSharp\installer\Output\setup.exe" }
if (-not (Test-Path $Setup)) { throw "Не найден установщик: $Setup" }
$Setup = (Resolve-Path $Setup).Path

function Step($text) { Write-Host ""; Write-Host "==> $text" -ForegroundColor Cyan }
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what завершилось с ошибкой (код $LASTEXITCODE)" } }

# ---------- Версия и размер ----------
$info = (Get-Item $Setup).VersionInfo
$parts = ($info.FileVersion -split '\.')
if ($parts.Count -lt 3) { throw "Не удалось прочитать версию из $Setup (FileVersion = '$($info.FileVersion)')" }
$version = "$($parts[0]).$($parts[1]).$($parts[2])"
$mb = [Math]::Round((Get-Item $Setup).Length / 1MB, 1).ToString("0.0", [Globalization.CultureInfo]::InvariantCulture).Replace('.', ',')
Step "Установщик $version, $mb МБ"

# ---------- Файлы сайта ----------
Copy-Item $Setup (Join-Path $site "downloads\setup.exe") -Force
$changed = New-Object System.Collections.Generic.List[string]
$changed.Add("downloads/setup.exe")

$utf8 = New-Object System.Text.UTF8Encoding($false)
$files = @(Get-ChildItem $site -Recurse -Filter *.html | Where-Object { $_.FullName -notmatch '\\(\.git|node_modules)\\' })
$files += @(Get-ChildItem (Join-Path $site "docsgen") -Filter *.js)
foreach ($f in $files) {
    $text = [IO.File]::ReadAllText($f.FullName, $utf8)
    $new = [regex]::Replace($text, 'Версия \d+\.\d+\.\d+', "Версия $version")
    $new = [regex]::Replace($new, '(64 бит\) · )\d+(?:,\d+)? МБ', "`${1}$mb МБ")
    if ($new -ne $text) {
        [IO.File]::WriteAllText($f.FullName, $new, $utf8)
        $rel = $f.FullName.Substring($site.Length + 1).Replace('\', '/')
        if ($rel -like "*.html") { $changed.Add($rel) }
        Write-Host "  обновлено: $rel"
    }
}

if ($NoUpload) { Step "Файлы обновлены, на сервер не отправлялись (-NoUpload)"; exit 0 }

# ---------- Отправка ----------
Step "Отправка на $Server ($($changed.Count) файлов)"
$list = Join-Path $env:TEMP "hgl-site-files.txt"
$archive = Join-Path $env:TEMP "hgl-site-update.tgz"
[IO.File]::WriteAllText($list, ($changed -join "`n") + "`n", $utf8)
tar -czf $archive -C $site -T $list
Check "tar"
$target = "$User@$Server"
$sudo = if ($User -eq "root") { "" } else { "sudo " }
scp -q $archive "${target}:/tmp/hgl-site-update.tgz"
Check "scp"
ssh $target "${sudo}tar -xzf /tmp/hgl-site-update.tgz --no-same-owner -C /var/www/hydrogeolab-site && ${sudo}chmod -R a+rX /var/www/hydrogeolab-site && rm -f /tmp/hgl-site-update.tgz && ls -la --time-style=long-iso /var/www/hydrogeolab-site/downloads/"
Check "ssh"
Remove-Item $list, $archive -Force -ErrorAction SilentlyContinue

Step "Готово"
Write-Host "Проверьте: https://hydrogeolab.app/ — на кнопке «Скачать» должна быть версия $version (Ctrl+F5)."
Write-Host "Не забудьте закоммитить изменения сайта: git add -A; git commit -m `"Установщик $version`"; git push"
