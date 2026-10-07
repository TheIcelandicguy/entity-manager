"""build_skill -- package the Claude skills kept in this repo for upload to claude.ai.

Run it after changing anything under .claude/skills/:  python build_skill.py

Claude Code loads .claude/skills/<name>/SKILL.md straight from the clone, but
claude.ai and Cowork read their own skill library and nothing pushes a change
there. This script zips each skill into dist-skill/<name>.skill, the file the
claude.ai upload takes, and says what to do with it. check_docs.py warns when
the copy claude.ai has synced back to this machine differs from the repo.

  python build_skill.py                      every skill under .claude/skills/
  python build_skill.py entity-manager-dev   just that one
  python build_skill.py --out DIR            write the .skill files to DIR instead
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKILLS = ROOT / ".claude" / "skills"
OUT = ROOT / "dist-skill"


def frontmatter(text: str) -> dict[str, str]:
    """The `name:` and `description:` of a SKILL.md, without needing a YAML library."""
    block = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
    if not block:
        raise ValueError("no frontmatter between --- lines")
    found: dict[str, str] = {}
    key = None
    for line in block.group(1).splitlines():
        top = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if top:
            key = top.group(1)
            value = top.group(2).strip()
            found[key] = "" if value in (">", ">-", "|", "|-") else value
        elif key and line.startswith((" ", "\t")):
            found[key] = (found[key] + " " + line.strip()).strip()
    return found


def build(name: str, out: Path = OUT) -> Path:
    folder = SKILLS / name
    skill_md = folder / "SKILL.md"
    if not skill_md.is_file():
        raise SystemExit(f"{name}: {skill_md.relative_to(ROOT)} not found")
    meta = frontmatter(skill_md.read_text(encoding="utf-8"))
    if meta.get("name") != name:
        raise SystemExit(f"{name}: frontmatter name is {meta.get('name')!r}, expected {name!r}")
    if not meta.get("description"):
        raise SystemExit(f"{name}: frontmatter has no description")
    out.mkdir(parents=True, exist_ok=True)
    target = out / f"{name}.skill"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(folder.rglob("*")):
            if path.is_file():
                z.write(path, f"{name}/{path.relative_to(folder).as_posix()}")
    return target


def main(argv: list[str]) -> int:
    args = list(argv)
    out = OUT
    if "--out" in args:
        at = args.index("--out")
        if at + 1 >= len(args):
            print("--out needs a folder")
            return 1
        out = Path(args[at + 1]).resolve()
        del args[at : at + 2]
    names = args
    if not names and SKILLS.is_dir():
        names = sorted(p.name for p in SKILLS.iterdir() if (p / "SKILL.md").is_file())
    if not names:
        print("no skills under .claude/skills/")
        return 1
    for name in names:
        target = build(name, out)
        shown = target.relative_to(ROOT) if target.is_relative_to(ROOT) else target
        print(f"built {shown} ({target.stat().st_size:,} bytes)")
    print()
    print("To update claude.ai and Cowork (they share one library): upload each file under")
    print("Customize > Skills, replacing the old one, then ask a NEW chat which version it")
    print("is, because a chat reads a skill as it was when the chat started.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
