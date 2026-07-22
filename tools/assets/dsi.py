"""Canonical printer-only DSI Studio replay wrappers."""

from __future__ import annotations

import hashlib
import shlex
import struct
from pathlib import Path
from typing import Iterable

from .common import ContractError


def dsi_invocation_sha256(argv: list[str]) -> str:
    digest = hashlib.sha256(b"brain-atlas/dsi-argv/v1\0")
    digest.update(struct.pack(">Q", len(argv)))
    for token in argv:
        try:
            encoded = token.encode("utf-8", "strict")
        except UnicodeEncodeError as error:
            raise ContractError("DSI argv contains non-UTF-8 text") from error
        digest.update(struct.pack(">Q", len(encoded)))
        digest.update(encoded)
    return digest.hexdigest()


def render_dsi_wrapper(
    argv: list[str],
    checks: Iterable[tuple[str, Path]],
    output_path: Path,
    log_path: Path,
) -> str:
    output_path = Path(output_path)
    log_path = Path(log_path)
    check_list = list(checks)
    lines = [
        "#!/bin/bash",
        "set -u",
        "check_sha() {",
        "  expected=$1",
        "  path=$2",
        '  actual=$(/usr/bin/shasum -a 256 -- "$path") || exit 74',
        "  actual=${actual%% *}",
        '  [ "$actual" = "$expected" ] || { printf \'%s\\n\' "SHA-256 mismatch: $path" >&2; exit 74; }',
        "}",
        "receipt_value() {",
        "  key=$1",
        "  value=$2",
        "  case $value in",
        "    *$'\\n'*|*$'\\r'*) printf '%s\\n' \"Unsafe replay receipt value: $key\" >&2; exit 74 ;;",
        "  esac",
        "  printf '%s=%s\\n' \"$key\" \"$value\"",
        "}",
        f"[ ! -e {shlex.quote(str(output_path))} ] || {{ printf '%s\\n' 'Replay output already exists' >&2; exit 73; }}",
        f"[ ! -e {shlex.quote(str(log_path))} ] || {{ printf '%s\\n' 'Replay log already exists' >&2; exit 73; }}",
    ]
    for expected, path in check_list:
        if len(expected) != 64 or any(character not in "0123456789abcdef" for character in expected):
            raise ContractError("DSI check has an invalid SHA-256")
        lines.append(f"check_sha {shlex.quote(expected)} {shlex.quote(str(path))}")
    lines.extend((
        "start_utc=$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ') || exit 74",
        "working_directory=$(/bin/pwd -P) || exit 74",
        "os_version=$(/usr/bin/sw_vers -productVersion) || exit 74",
        "kernel=$(/usr/bin/uname -sr) || exit 74",
        "machine=$(/usr/bin/uname -m) || exit 74",
        "{",
        "  printf '%s\\n' 'BRAIN_ATLAS_REPLAY_RECEIPT_V2_START'",
        "  receipt_value BRAIN_ATLAS_STARTED_UTC \"$start_utc\"",
        "  receipt_value BRAIN_ATLAS_WORKING_DIRECTORY \"$working_directory\"",
        "  receipt_value BRAIN_ATLAS_OS_VERSION \"$os_version\"",
        "  receipt_value BRAIN_ATLAS_KERNEL \"$kernel\"",
        "  receipt_value BRAIN_ATLAS_MACHINE \"$machine\"",
        "  receipt_value BRAIN_ATLAS_BASH_VERSION \"$BASH_VERSION\"",
        "  receipt_value BRAIN_ATLAS_THREAD_ENV_OMP_NUM_THREADS \"${OMP_NUM_THREADS-<unset>}\"",
        "  receipt_value BRAIN_ATLAS_THREAD_ENV_OPENBLAS_NUM_THREADS \"${OPENBLAS_NUM_THREADS-<unset>}\"",
        "  receipt_value BRAIN_ATLAS_THREAD_ENV_VECLIB_MAXIMUM_THREADS \"${VECLIB_MAXIMUM_THREADS-<unset>}\"",
        "  receipt_value BRAIN_ATLAS_THREAD_ENV_MKL_NUM_THREADS \"${MKL_NUM_THREADS-<unset>}\"",
        "  receipt_value BRAIN_ATLAS_THREAD_ENV_NUMEXPR_NUM_THREADS \"${NUMEXPR_NUM_THREADS-<unset>}\"",
        f"  printf '%s\\n' 'BRAIN_ATLAS_CHECK_COUNT={len(check_list)}'",
    ))
    for index, (expected, _) in enumerate(check_list):
        lines.append(f"  printf '%s\\n' 'BRAIN_ATLAS_CHECK_{index}_SHA256={expected}'")
    lines.extend((
        "  printf '%s\\n' 'BRAIN_ATLAS_REPLAY_RECEIPT_V2_BODY'",
        f"}} > {shlex.quote(str(log_path))}",
        f"{shlex.join(argv)} >> {shlex.quote(str(log_path))} 2>&1",
        "status=$?",
        "end_utc=$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ') || exit 74",
        "{",
        "  printf '\\n%s\\n' 'BRAIN_ATLAS_REPLAY_RECEIPT_V2_END'",
        "  receipt_value BRAIN_ATLAS_ENDED_UTC \"$end_utc\"",
        "  receipt_value BRAIN_ATLAS_EXIT_STATUS \"$status\"",
        f"}} >> {shlex.quote(str(log_path))}",
        f"if /usr/bin/grep -Fq -- 'not used/recognized' {shlex.quote(str(log_path))}; then",
        "  printf '%s\\n' 'DSI Studio ignored or did not recognize an option' >&2",
        "  exit 64",
        "fi",
        'exit "$status"',
    ))
    return "\n".join(lines) + "\n"
