"""Reject private environment files in the Git index without reading secrets."""

import subprocess
import sys
from pathlib import PurePosixPath


def is_private_env(path):
    name = PurePosixPath(path).name.lower()
    if name == ".env.example":
        return False
    return name == ".env" or name.startswith(".env.") or name.endswith(".env") or ".env." in name


def main():
    result = subprocess.run(
        ["git", "ls-files", "-z"], check=True, stdout=subprocess.PIPE
    )
    paths = result.stdout.decode("utf-8", errors="surrogateescape").split("\0")
    blocked = sorted(path for path in paths if path and is_private_env(path))
    if blocked:
        print("Remove private environment files from the Git index:", file=sys.stderr)
        for path in blocked:
            print(f"  {path}", file=sys.stderr)
        return 1
    print("Environment file check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
