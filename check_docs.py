"""check_docs -- does CLAUDE.md still describe this repository?

Run it before ending a session:  python check_docs.py

It reads CLAUDE.md and checks the claims that go stale fastest:

  paths       every backticked file path in the doc exists on disk
  constants   every backticked `NAME = value` matches the source
  version     the version the doc quotes is the one in manifest.json / package.json
  tests       the test count the doc quotes is the number pytest / vitest would collect
  services    services.yaml and the doc name the same services
  lines       "N lines" claims are within 10% of the real length (warning only)
  consistency command counts, the minimum HA version, the OVERVIEW version and the
              two string files agree with the source and with each other
  skill       the repo's Claude skill quotes the right version, command count and minimum HA;
              warns when the copy claude.ai syncs back differs (an upload is due)

Exit status 1 when anything fails, so it can gate a commit or a CI job.
The script is deliberately conservative: it only checks what the doc actually
asserts, so a doc that says less is never "wrong", just thinner. A path the doc
mentions as absent ("ships no `package.json`") is skipped when "no" or "not"
appears just before it.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOC = ROOT / "CLAUDE.md"

# ---- per-repository knobs ---------------------------------------------------
# Directories searched for source when resolving `engine/health.py` style paths
# quoted relative to the component, and when looking up constants.
SOURCE_DIRS = ["custom_components", "src", "panel/src", "card", "tests"]
SOURCE_SUFFIXES = {".py", ".js", ".ts", ".mjs", ".yaml", ".yml", ".json", ".css"}
PATH_SUFFIXES = SOURCE_SUFFIXES | {".md", ".ps1", ".ini", ".toml", ".txt", ".html", ".csv", ".cfg"}
# The Home Assistant domain, used to recognise `domain.service` mentions.
# None disables the services check.
DOMAIN: str | None = "entity_manager"
# Files whose "version" the doc is expected to agree with (first that exists).
VERSION_FILES = ["custom_components/*/manifest.json", "package.json"]
# Where the tests are. Python tests are collected with pytest when it is
# installed (parametrised tests count the way the doc counts them); Vitest
# specs are counted by their it()/test() calls.
PY_TEST_DIR = "tests"
JS_TEST_GLOBS = ["**/tests/**/*.test.js", "**/tests/**/*.test.ts", "src/**/*.test.ts"]
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "dist", ".venv", "_from_Z"}
# -----------------------------------------------------------------------------

failures: list[str] = []
warnings: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def _skip(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def walk(base: Path) -> list[Path]:
    """Every file under base, pruning SKIP_DIRS instead of descending into them."""
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        out.extend(Path(dirpath) / f for f in filenames)
    return out


def source_files() -> list[Path]:
    out: list[Path] = []
    for d in SOURCE_DIRS:
        base = ROOT / d
        if base.is_dir():
            out.extend(p for p in walk(base) if p.suffix in SOURCE_SUFFIXES)
    return out


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


# ---- paths -------------------------------------------------------------------

PATH_TOKEN = re.compile(r"`([^`\n]+)`")
NEGATED = re.compile(r"\b(no|not|never|without|removed|gone|deleted)\b[^`\n]{0,40}$", re.I)


def looks_like_path(tok: str) -> bool:
    if any(c in tok for c in " =(){}<>$") or tok.startswith(("http", "/", "Z:", "C:", "D:", "E:", "-", ".")):
        return False
    last = tok.replace("\\", "/").rsplit("/", 1)[-1]
    return Path(last).suffix.lower() in PATH_SUFFIXES


def candidate_dirs() -> list[Path]:
    dirs = [ROOT]
    for d in SOURCE_DIRS:
        base = ROOT / d
        if base.is_dir():
            dirs.append(base)
            dirs.extend(p for p in base.iterdir() if p.is_dir() and not _skip(p))
    return dirs


def check_paths(doc: str) -> None:
    names = {f.name for f in walk(ROOT)}
    dirs = candidate_dirs()
    seen: set[str] = set()
    for m in PATH_TOKEN.finditer(doc):
        tok = m.group(1).strip().rstrip("/").rstrip("\\")
        if tok in seen or not looks_like_path(tok) or "*" in tok:
            continue
        seen.add(tok)
        if NEGATED.search(doc[max(0, m.start() - 60):m.start()]):
            continue
        rel = tok.replace("\\", "/")
        if rel.startswith(".../"):
            rel = rel[4:]
        if any((d / rel).exists() for d in dirs):
            continue
        # A bare filename quoted without its directory: accept it if it exists anywhere.
        if "/" not in rel and rel in names:
            continue
        fail(f"path: `{tok}` does not exist")


# ---- constants ---------------------------------------------------------------

CONST_TOKEN = re.compile(r"`([A-Z][A-Z0-9_]{2,})\s*=\s*([^`]+)`")


def norm(v: str) -> str:
    v = v.strip().rstrip(",;")
    v = re.sub(r"\s+", "", v)
    return v.replace("'", '"')


def check_constants(doc: str) -> None:
    files = source_files()
    cache: dict[Path, str] = {}
    for name, value in CONST_TOKEN.findall(doc):
        want = norm(value)
        found: list[str] = []
        pat = re.compile(rf"^\s*(?:const |let |export const |self\.)?{name}\s*[:=]\s*(.+?)\s*;?\s*(?:#.*|//.*)?$", re.M)
        for f in files:
            text = cache.setdefault(f, read(f))
            found.extend(norm(m.group(1)) for m in pat.finditer(text))
        if not found:
            fail(f"constant: `{name}` quoted in the doc but not defined in source")
            continue
        if want in found or any(want.strip('"') in f for f in found):
            continue
        try:
            if any(float(want) == float(f.strip('"')) for f in found):
                continue
        except ValueError:
            pass
        fail(f"constant: `{name}` doc says {value.strip()!r}, source says {found[0]!r}")


# ---- version -----------------------------------------------------------------

SEMVER = re.compile(r"\bv?(\d+\.\d+\.\d+)\b")
VSEMVER = re.compile(r"\bv(\d+\.\d+\.\d+)\b")


def repo_version() -> tuple[str, Path] | None:
    for pattern in VERSION_FILES:
        for f in sorted(ROOT.glob(pattern)):
            if _skip(f):
                continue
            try:
                v = json.loads(read(f)).get("version")
            except json.JSONDecodeError:
                continue
            if v:
                return str(v), f
    return None


def check_version(doc: str) -> None:
    rv = repo_version()
    if rv is None:
        return
    version, vfile = rv
    quoted: set[str] = set()
    for line in doc.splitlines():
        # "v3.1.0" anywhere counts; a bare "3.1.0" only on a line that talks about versions.
        quoted.update(VSEMVER.findall(line))
        if re.search(r"version|manifest\.json|package\.json", line, re.I):
            quoted.update(SEMVER.findall(line))
    if not quoted:
        warn(f"version: doc never states a version; {vfile.relative_to(ROOT)} says {version}")
    elif version not in quoted:
        fail(f"version: doc says {', '.join(sorted(quoted))}; {vfile.relative_to(ROOT)} says {version}")


# ---- tests -------------------------------------------------------------------

PY_TEST = re.compile(r"^\s*(?:async\s+)?def\s+test_\w+", re.M)
JS_TEST = re.compile(r"^\s*(?:it|test)(?:\.each\([^)]*\))?\s*\(", re.M)
DOC_TEST_COUNT = re.compile(r"\b(\d{2,4})\s+(?:passing\s+|python\s+|vitest\s+|js\s+)?tests?\b", re.I)


def count_py_tests() -> int | None:
    tdir = ROOT / PY_TEST_DIR
    if not tdir.is_dir():
        return None
    env = dict(os.environ, PYTEST_DISABLE_PLUGIN_AUTOLOAD="1")
    try:
        out = subprocess.run(
            [sys.executable, "-m", "pytest", "--collect-only", "-q", "-o", "addopts=", "-p", "no:cacheprovider", str(tdir)],
            cwd=ROOT, env=env, capture_output=True, text=True, timeout=120,
        ).stdout
        m = re.search(r"(\d+) tests? collected", out) or re.search(r"(\d+)/\d+ tests collected", out)
        if m:
            return int(m.group(1))
    except (OSError, subprocess.TimeoutExpired):
        pass
    return sum(len(PY_TEST.findall(read(f))) for f in walk(tdir) if f.name.startswith("test_") and f.suffix == ".py")


def count_js_tests() -> int:
    seen: set[Path] = set()
    for g in JS_TEST_GLOBS:
        seen.update(f for f in ROOT.glob(g) if not _skip(f))
    return sum(len(JS_TEST.findall(read(f))) for f in seen)


def check_tests(doc: str) -> None:
    claims = {int(x) for x in DOC_TEST_COUNT.findall(doc)}
    if not claims:
        return
    py = count_py_tests()
    js = count_js_tests()
    actual = {n for n in (py, js, (py or 0) + js) if n}
    if not claims & actual:
        fail(f"tests: doc says {sorted(claims)} tests; on disk python={py} js={js}")


# ---- services ----------------------------------------------------------------

def check_services(doc: str) -> None:
    if not DOMAIN:
        return
    yamls = list(ROOT.glob(f"custom_components/{DOMAIN}/services.yaml"))
    if not yamls:
        return
    declared = set(re.findall(r"^([a-z_][a-z0-9_]*):\s*$", read(yamls[0]), re.M))
    backticked = set(re.findall(r"`([a-z_][a-z0-9_]*)`", doc))
    dotted = set(re.findall(rf"\b{DOMAIN}\.([a-z_][a-z0-9_]*)\b", doc))
    for s in sorted(declared - backticked - dotted):
        fail(f"services: `{DOMAIN}.{s}` is in services.yaml but the doc never mentions it")
    for s in sorted(dotted - declared):
        if re.search(rf"service[^\n]{{0,60}}{DOMAIN}\.{s}\b|{DOMAIN}\.{s}\b[^\n]{{0,60}}service", doc, re.I):
            fail(f"services: doc calls `{DOMAIN}.{s}` a service but services.yaml does not declare it")


# ---- source version constants ------------------------------------------------

SOURCE_VERSION = re.compile(
    r"""\b([A-Z][A-Z0-9_]*VERSION)\s*[:=]\s*['"](\d+\.\d+\.\d+)['"]"""
)


def check_source_versions() -> None:
    """A hard-coded VERSION constant in source must match manifest.json.

    The panel prints EM_VERSION in its header, so a missed bump ships a build
    that misreports itself.
    """
    rv = repo_version()
    if rv is None:
        return
    version, vfile = rv
    for f in source_files():
        for name, found in SOURCE_VERSION.findall(read(f)):
            if found != version:
                fail(
                    f"version: `{name} = {found}` in {f.relative_to(ROOT).as_posix()}; "
                    f"{vfile.relative_to(ROOT).as_posix()} says {version}"
                )


# ---- line counts -------------------------------------------------------------

LINES_A = re.compile(r"`([^`]+\.(?:py|js|ts|css))`[^|\n]*?\|\s*([\d,]+)\s+lines", re.I)
LINES_B = re.compile(r"([\d,]+)\s+lines[^|\n]*?`([^`]+\.(?:py|js|ts|css))`", re.I)
LINES_C = re.compile(r"`([^`]+\.(?:py|js|ts|css))`\s*\(?~?([\d,]+)k?\s+lines", re.I)


def check_lines(doc: str) -> None:
    by_name = {f.name: f for f in source_files()}
    dirs = candidate_dirs()
    pairs = LINES_A.findall(doc) + [(p, n) for n, p in LINES_B.findall(doc)] + LINES_C.findall(doc)
    for path, n in pairs:
        rel = path.replace("\\", "/").replace(".../", "")
        target = next((d / rel for d in dirs if (d / rel).exists()), by_name.get(Path(rel).name))
        if target is None:
            continue
        claimed = int(n.replace(",", ""))
        actual = len(read(target).splitlines())
        if abs(actual - claimed) > max(10, actual // 10):
            warn(f"lines: `{path}` doc says {claimed:,} lines, file has {actual:,}")


# ---- cross-file consistency (entity-manager specific) -----------------------

WS_COMMAND = re.compile(r'vol\.Required\("type"\):\s*"entity_manager/([a-z_]+)"')
COUNT_CLAIM = re.compile(
    r"\b(?:All\s+)?(\d+)\s+(?:admin-gated\s+)?(?:WS\s+|WebSocket\s+)?"
    r"(?:commands?|handlers?|command handlers?)\b"
)
MIN_HA_DOC = re.compile(r"(?:minimum HA|Home Assistant(?:\*\*)? )(\d{4}\.\d+\.\d+)", re.I)


def check_consistency() -> None:
    """The other docs and config files must agree with the source.

    CLAUDE.md is checked line by line above. These checks cover what the other
    files say about the same facts: how many WebSocket commands there are, which
    Home Assistant version is the minimum, and that the two string files match.
    """
    api = ROOT / "custom_components" / "entity_manager" / "websocket_api.py"
    if api.exists():
        commands = sorted(set(WS_COMMAND.findall(read(api))))
        for name in ("CLAUDE.md", "OVERVIEW.md", "README.md"):
            path = ROOT / name
            if not path.exists():
                continue
            text = read(path)
            for claimed in COUNT_CLAIM.findall(text):
                if int(claimed) != len(commands):
                    fail(f"commands: {name} says {claimed} commands; websocket_api.py has {len(commands)}")
        overview = ROOT / "OVERVIEW.md"
        if overview.exists():
            text = read(overview)
            for cmd in commands:
                if f"entity_manager/{cmd}`" not in text:
                    fail(f"commands: OVERVIEW.md does not list `entity_manager/{cmd}`")
        rv = repo_version()
        if rv is not None and overview.exists():
            quoted = re.search(r"version \*\*(\d+\.\d+\.\d+)\*\*", read(overview))
            if quoted and quoted.group(1) != rv[0]:
                fail(f"version: OVERVIEW.md quotes {quoted.group(1)}; {rv[1].name} says {rv[0]}")

    hacs = ROOT / "hacs.json"
    if hacs.exists():
        declared = json.loads(read(hacs)).get("homeassistant")
        if declared:
            for name in ("CLAUDE.md", "OVERVIEW.md", "README.md"):
                path = ROOT / name
                if not path.exists():
                    continue
                for found in MIN_HA_DOC.findall(read(path)):
                    if found != declared:
                        fail(f"min-ha: {name} says {found}; hacs.json says {declared}")
            badge = re.search(r"Home%20Assistant-(\d{4}\.\d+)\+", read(ROOT / "README.md"))
            if badge and not declared.startswith(badge.group(1) + "."):
                fail(f"min-ha: README badge says {badge.group(1)}+; hacs.json says {declared}")

    comp = ROOT / "custom_components" / "entity_manager"
    strings, en = comp / "strings.json", comp / "translations" / "en.json"
    if strings.exists() and en.exists() and json.loads(read(strings)) != json.loads(read(en)):
        fail("strings: strings.json and translations/en.json differ")


# ---- the Claude skill kept in the repo ---------------------------------------

SKILL_NAME = "entity-manager-dev"
SKILL = ROOT / ".claude" / "skills" / SKILL_NAME / "SKILL.md"


def _skill_signature(text: str) -> tuple[str, str]:
    """(description, body) with line folding and whitespace removed.

    claude.ai writes the description back on one line, so the same skill must compare
    equal however its frontmatter was serialised (`description: >-` folded or not).
    """
    text = text.replace("\r\n", "\n")
    parts = re.match(r"^---\n(.*?)\n---\n(.*)\Z", text, re.S)
    if not parts:
        return "", text.strip()
    desc = re.search(r"^description:\s*(.*?)(?=^[A-Za-z_-]+:|\Z)", parts.group(1), re.S | re.M)
    value = re.sub(r"\s+", " ", desc.group(1)).strip() if desc else ""
    value = re.sub(r"^[>|][-+]?\s*", "", value)
    if len(value) > 1 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    return value, parts.group(2).strip()


def check_skill() -> None:
    """The skill must agree with the source, and claude.ai's copy should not lag it.

    Claude Code loads the skill from the clone. claude.ai and Cowork read their
    own library, which only an upload changes; the app syncs that library back
    under ~/.claude/skills/synced/, so a difference there means an upload is due.
    That one is a warning, because only a person can do the upload.
    """
    if not SKILL.exists():
        fail(f"skill: {SKILL.relative_to(ROOT).as_posix()} is missing")
        return
    text = read(SKILL)
    head = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
    if not head:
        fail("skill: SKILL.md has no frontmatter")
        return
    front = re.sub(r"\s+", " ", head.group(1))
    name = re.search(r"^name:\s*(\S+)", head.group(1), re.M)
    if not name or name.group(1) != SKILL_NAME:
        fail(f"skill: frontmatter name is {name.group(1) if name else 'missing'}, expected {SKILL_NAME}")
    if "description:" not in front:
        fail("skill: frontmatter has no description")
    desc = re.search(r"^description:\s*(.*?)(?=^[A-Za-z_-]+:|\Z)", head.group(1), re.S | re.M)
    if desc:
        value = re.sub(r"\s+", " ", desc.group(1)).strip()
        value = re.sub(r"^[>|][-+]?\s*", "", value)
        if len(value) > 1024:
            fail(f"skill: description is {len(value)} characters; claude.ai accepts at most 1024")

    rv = repo_version()
    quoted = re.search(r"\bv(\d+\.\d+\.\d+)\b", front)
    if rv and quoted and quoted.group(1) != rv[0]:
        fail(f"skill: description says v{quoted.group(1)}; {rv[1].name} says {rv[0]}")

    api = ROOT / "custom_components" / "entity_manager" / "websocket_api.py"
    count = re.search(r"\b(\d+)-command\b", front)
    if api.exists() and count:
        have = len(set(WS_COMMAND.findall(read(api))))
        if int(count.group(1)) != have:
            fail(f"skill: description says {count.group(1)}-command; websocket_api.py has {have}")

    hacs = ROOT / "hacs.json"
    min_ha = re.search(r"Minimum Home Assistant is (\d{4}\.\d+\.\d+)", text)
    if hacs.exists() and min_ha:
        declared = json.loads(read(hacs)).get("homeassistant")
        if declared and declared != min_ha.group(1):
            fail(f"skill: says minimum HA {min_ha.group(1)}; hacs.json says {declared}")

    synced = sorted((Path.home() / ".claude" / "skills" / "synced").glob(f"*/{SKILL_NAME}/SKILL.md"))
    for copy in synced:
        if _skill_signature(read(copy)) != _skill_signature(text):
            warn(
                "skill: the claude.ai copy of entity-manager-dev differs from the repo -- "
                "run `python build_skill.py`, upload dist-skill/entity-manager-dev.skill, "
                "and ask a new chat for the version"
            )
            break


# ---- main --------------------------------------------------------------------

def main() -> int:
    if not DOC.exists():
        print("CLAUDE.md not found")
        return 1
    doc = read(DOC)
    check_paths(doc)
    check_constants(doc)
    check_version(doc)
    check_source_versions()
    check_tests(doc)
    check_services(doc)
    check_lines(doc)
    check_consistency()
    check_skill()
    for w in warnings:
        print(f"WARN  {w}")
    for f in failures:
        print(f"FAIL  {f}")
    print(f"check_docs: {len(failures)} failure(s), {len(warnings)} warning(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
