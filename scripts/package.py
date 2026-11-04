#!/usr/bin/env python3
"""Package the extension for Chrome and Firefox and archive a signed Safari app."""
import argparse
from copy import deepcopy
import json
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension"
DIST = ROOT / "dist"


def package_web(target, base):
    manifest = deepcopy(base)
    suffix = "zip"
    if target == "firefox":
        suffix = "xpi"
        manifest["content_scripts"][0]["js"][0] = "firefox-client.js"
        manifest["background"] = {"scripts": ["ratings.js", "firefox-background.js"]}
        manifest["host_permissions"].append("https://returnyoutubedislikeapi.com/*")
        manifest["browser_specific_settings"] = {
            "gecko": {
                "id": "yt-dislikes-ps@psalles00.github",
                "strict_min_version": "140.0",
                "data_collection_permissions": {"required": ["browsingActivity"]},
            }
        }
    output = DIST / f"yt-dislikes-ps-{target}.{suffix}"
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        for script in manifest["content_scripts"]:
            for resource in script.get("js", []) + script.get("css", []):
                archive.write(SOURCE / resource, resource)
        for resource in manifest.get("background", {}).get("scripts", []):
            archive.write(SOURCE / resource, resource)
        for resource in manifest["icons"].values():
            archive.write(SOURCE / resource, resource)


def package_safari(app, manifest):
    plugins = list((app / "Contents/PlugIns").glob("*.appex"))
    if len(plugins) != 1:
        raise ValueError("O app deve conter exatamente uma extensão do Safari.")
    resources = plugins[0] / "Contents/Resources"
    installed = json.loads((resources / "manifest.json").read_text())
    if installed["version"] != manifest["version"] or installed["content_scripts"] != manifest["content_scripts"]:
        raise ValueError("O pacote Safari precisa corresponder à versão dos pacotes web.")
    for script in installed["content_scripts"]:
        for resource in script.get("js", []) + script.get("css", []):
            source = (SOURCE / resource).read_text()
            if resource == "ratings.js":
                source = source.replace("(globalThis.browser ?? globalThis.chrome)", "browser")
            if (resources / resource).read_text().rstrip() != source.rstrip():
                raise ValueError(f"O recurso Safari não corresponde ao fonte: {resource}")
    subprocess.run(["codesign", "--verify", "--deep", "--strict", app], check=True)
    output = DIST / "yt-dislikes-ps-safari-macos.zip"
    output.unlink(missing_ok=True)
    subprocess.run(["ditto", "-c", "-k", "--keepParent", app, output], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--safari-app", type=Path, help="Caminho do app Safari já compilado e assinado")
    args = parser.parse_args()
    manifest = json.loads((SOURCE / "manifest.json").read_text())
    manifest["icons"] = {str(size): f"icons/icon-{size}.png" for size in (16, 32, 48, 64, 128, 256, 512)}
    DIST.mkdir(exist_ok=True)
    for target in ("chrome", "firefox"):
        package_web(target, manifest)
    if args.safari_app:
        package_safari(args.safari_app, manifest)


if __name__ == "__main__":
    main()
