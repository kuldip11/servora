import tempfile
import unittest
import zipfile
from pathlib import Path
import importlib.util
spec = importlib.util.spec_from_file_location("package_source", Path(__file__).with_name("package-source.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
package_source = module.package_source

class SourceArchiveTest(unittest.TestCase):
    def test_excludes_partial_installs_and_secrets_at_every_workspace_depth(self):
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as directory:
            root = Path(directory)
            keep = ['package.json', 'bun.lock', 'packages/contracts/src/index.ts', '.env.example', 'apps/api/.env.template']
            omit = ['node_modules/x/index.js', 'packages/realtime/node_modules/@pos/contracts/src/index.ts', '.env', 'apps/api/.env.local', 'apps/api/dist/index.js', '.cache/stale.json']
            for name in keep + omit:
                path = root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_text('fixture')
            (root / 'dependency-link').symlink_to(root / 'node_modules', target_is_directory=True)
            output = package_source(root, root / 'dist/source.zip')
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(set(archive.namelist()), set(keep))

if __name__ == '__main__':
    unittest.main()
