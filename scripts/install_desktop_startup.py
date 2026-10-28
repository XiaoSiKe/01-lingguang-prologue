#!/usr/bin/env python3
"""Package the Zero → One film as a plugin for the installed DSH Desktop."""
from __future__ import annotations

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from install_native_startup import ROOT, stage_package


def pack() -> Path:
    npm = shutil.which("npm")
    if not npm:
        raise RuntimeError("Node.js and npm are required for packaging.")
    output = ROOT / "target" / "desktop-startup-package"
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="rixin-desktop-package-") as temp:
        staged = Path(temp) / "package"
        stage_package(staged)
        for source in (ROOT / "integrations" / "desktop-startup").iterdir():
            if source.is_file():
                shutil.copy2(source, staged / source.name)
        result = subprocess.run([npm, "pack", "--json", "--pack-destination", str(output)], cwd=staged, check=True, capture_output=True, text=True)
        return output / json.loads(result.stdout)[0]["filename"]


def backup(home: Path) -> Path:
    folder = home / "startup-animation" / "backups" / datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    folder.mkdir(parents=True, mode=0o700)
    for name in ("package.json", "cordis.yml", "cordis.patch.yml", "pnpm-workspace.yaml", "pnpm-lock.yaml", "desktop-plugins.lock.json"):
        source = home / "profiles" / "desktop" / name
        if source.is_file():
            shutil.copy2(source, folder / name)
    settings = home / "startup-animation" / "settings.json"
    if settings.is_file():
        shutil.copy2(settings, folder / "startup-settings.json")
    return folder


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack-only", action="store_true")
    parser.add_argument("--cli", type=Path, default=Path("/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"))
    args = parser.parse_args()
    package = pack()
    print(f"Desktop plugin: {package}", flush=True)
    if args.pack_only:
        return
    home = Path(os.environ.get("DSH_HOME", str(Path.home() / ".dsh"))).expanduser().resolve()
    if not args.cli.is_file() or not (home / "profiles" / "desktop" / "package.json").is_file():
        raise RuntimeError("Open the installed DSH Desktop once to initialize its profile, then quit it before installing.")
    saved = backup(home)
    print(f"Profile backup: {saved}", flush=True)
    subprocess.run([str(args.cli), "plugin", "--profile", "desktop", "add", str(package)], check=True)
    target = home / "startup-animation" / "settings.json"
    current = json.loads(target.read_text()) if target.exists() else {}
    current.update(enabled=True, visual_style="rhine")
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.chmod(0o600)
    temporary.replace(target)
    print("Installed and enabled. Open the original DeepSeek Harness desktop application.")


if __name__ == "__main__":
    main()
