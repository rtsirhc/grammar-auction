"""Build the LAN download from an explicit file list; includes no secrets."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
files = ['index.html', 'offline.html', 'teacher-bakery-guide.html', 'LOCAL.md',
         'iniciar-local.sh', 'iniciar-local.bat', 'local/server.cjs', 'local/transport.js']
with ZipFile(root / 'grammar-rush-local.zip', 'w', compression=ZIP_DEFLATED) as bundle:
    for filename in files:
        item = ZipInfo('Grammar-Rush-Local/' + filename, date_time=(2026, 10, 21, 0, 0, 0))
        item.compress_type = ZIP_DEFLATED
        item.external_attr = (0o100755 if filename.endswith('.sh') else 0o100644) << 16
        bundle.writestr(item, (root / filename).read_bytes())
print('Created grammar-rush-local.zip')
