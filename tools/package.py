"""Create the Twitch hosted-assets archive without developer metadata or secrets."""
import hashlib
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
source = root / 'frontend'
destination = root / 'dist/game-interaction-client-4.zip'
destination.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(source.rglob('*')):
        if file.is_symlink():
            raise RuntimeError('Unexpected frontend symlink')
        if not file.is_file():
            continue
        if file.suffix not in {'.js', '.html', '.css', '.png'}:
            raise RuntimeError('Unexpected asset type')
        info = zipfile.ZipInfo(file.relative_to(source).as_posix(), (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, file.read_bytes())
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    for required in ('index.html', 'config.html', 'config.css', 'script.js'):
        assert required in archive.namelist(), 'Missing hosted asset: ' + required
    for file in source.rglob('*'):
        if file.is_file():
            assert archive.read(file.relative_to(source).as_posix()) == file.read_bytes()
print(destination.name, hashlib.sha256(destination.read_bytes()).hexdigest())
