#!/usr/bin/env python3
"""Package source without dependency trees, runtime output or environment secrets."""
import argparse
import os
from pathlib import Path
import zipfile

EXCLUDED_DIRS = {
    'node_modules', '.git', '.bun', '.cache', '.turbo', '.vite', '.next',
    'dist', 'build', 'out', 'coverage', 'playwright-report', 'test-results',
    '__pycache__',
}

def source_files(root):
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(name for name in dirs if name not in EXCLUDED_DIRS and not (Path(directory) / name).is_symlink())
        for name in sorted(files):
            path = Path(directory) / name
            if path.is_symlink():
                continue
            if (name == '.env' or name.startswith('.env.')) and name not in {'.env.example', '.env.template'}:
                continue
            if name.endswith(('.log', '.tsbuildinfo', '.zip')) or name == '.DS_Store':
                continue
            yield path

def package_source(root, output):
    root, output = Path(root).resolve(), Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in source_files(root):
            if path.resolve() != output:
                archive.write(path, path.relative_to(root))
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise RuntimeError('Source archive integrity check failed')
    return output

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=root / 'dist/servora-source.zip')
    args = parser.parse_args()
    print(package_source(root, args.output))
