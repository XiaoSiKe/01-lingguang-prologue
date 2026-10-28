#!/usr/bin/env python3
"""Build the member source/preview ZIP, Desktop plugin and SHA-256 manifest."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from zipfile import ZIP_DEFLATED, ZipFile

from install_desktop_startup import pack

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    desktop = json.loads((ROOT / "integrations/desktop-startup/package.json").read_text(encoding="utf-8"))
    if desktop["version"] != version:
        raise RuntimeError("The release and Desktop plugin versions must match.")
    output = ROOT / "target" / "releases" / f"v{version}"
    output.mkdir(parents=True, exist_ok=True)
    plugin = pack()
    shutil.copy2(plugin, output / plugin.name)
    files = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT, check=True, capture_output=True,
    ).stdout.decode("utf-8").split("\0")
    archive = output / f"lingguang-prologue-v{version}.zip"
    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
        for relative in sorted(set(filter(None, files))):
            source = ROOT / relative
            if source.is_symlink():
                raise RuntimeError(f"Release files must not link outside the source tree: {relative}")
            if source.is_file():
                bundle.write(source, f"lingguang-prologue-v{version}/{relative}")
    artifacts = [archive, output / plugin.name]
    manifest = output / "SHA256SUMS.txt"
    manifest.write_text("".join(
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n" for path in artifacts
    ), encoding="utf-8")
    for path in [*artifacts, manifest]:
        print(path)


if __name__ == "__main__":
    main()
