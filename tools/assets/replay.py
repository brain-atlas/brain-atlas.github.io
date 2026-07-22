"""Frozen DSI replay classification and evidence helpers."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import platform
import re
import sys
import tempfile
from pathlib import Path
from typing import Any

from .common import (
    ContractError,
    sha256_file,
    trackvis_multiset_sha256,
    trackvis_order_sha256,
)
from .dsi import dsi_invocation_sha256
from .optic_radiation import load_trackvis, postprocess_or_trackvis
from .swm import postprocess_swm_trackvis

_SHA256 = re.compile(r"^[0-9a-f]{64}$")
_ANSI = re.compile(r"\x1b\[[0-9;]*m")


def classify_replay(
    byte_exact: bool,
    decoded_order_exact: bool,
    decoded_multiset_exact: bool,
    postprocess_byte_exact: bool,
    hard_predicates_satisfied: bool,
) -> dict[str, Any]:
    """Apply the pre-replay closeout classes without numeric promotion."""
    if not hard_predicates_satisfied:
        return {"id": 4, "name": "materially-different", "closeout": "blocked"}
    if byte_exact and decoded_order_exact and postprocess_byte_exact:
        return {"id": 1, "name": "byte-exact", "closeout": "allowed-without-new-decision"}
    if decoded_multiset_exact and postprocess_byte_exact:
        return {"id": 2, "name": "decoded-exact-order-drift", "closeout": "human-decision-required"}
    return {"id": 3, "name": "metric-only", "closeout": "human-decision-required"}


def _record_by_id(records: list[dict[str, Any]], record_id: str) -> dict[str, Any]:
    for record in records:
        if record["id"] == record_id:
            return record
    raise ContractError(f"unknown manifest record: {record_id}")


def _git_head(repo: Path) -> str:
    git = repo / ".git"
    if git.is_file():
        marker = git.read_text(encoding="utf-8").strip()
        if not marker.startswith("gitdir: "):
            raise ContractError("unsupported .git indirection")
        git = (repo / marker.removeprefix("gitdir: ")).resolve()
    head = (git / "HEAD").read_text(encoding="utf-8").strip()
    if not head.startswith("ref: "):
        if re.fullmatch(r"[0-9a-f]{40}", head):
            return head
        raise ContractError("Git HEAD is not a commit")
    reference = head.removeprefix("ref: ")
    candidates = [git / reference]
    common_dir_file = git / "commondir"
    if common_dir_file.is_file():
        candidates.append((git / common_dir_file.read_text(encoding="utf-8").strip()) / reference)
    for candidate in candidates:
        if candidate.is_file():
            commit = candidate.read_text(encoding="utf-8").strip()
            if re.fullmatch(r"[0-9a-f]{40}", commit):
                return commit
    raise ContractError("Git HEAD reference is unavailable")


def _explicit_parameters(argv: list[str]) -> dict[str, dict[str, str | bool | None]]:
    def parameter(name: str) -> dict[str, str | bool | None]:
        prefix = f"--{name}="
        values = [token.removeprefix(prefix) for token in argv if token.startswith(prefix)]
        if len(values) > 1:
            raise ContractError(f"DSI argv repeats --{name}")
        return {"passed": bool(values), "value": values[0] if values else None}

    return {
        "randomSeed": parameter("random_seed"),
        "threadCount": parameter("thread_count"),
    }


def _receipt_mapping(lines: list[str], label: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in lines:
        if "=" not in line:
            raise ContractError(f"DSI replay {label} has an invalid receipt line")
        key, value = line.split("=", 1)
        if not key or key in result:
            raise ContractError(f"DSI replay {label} repeats or omits a receipt key")
        result[key] = value
    return result


def _parse_execution_receipt(path: Path, expected_check_sha256: list[str]) -> dict[str, Any]:
    text = _ANSI.sub("", path.read_text(encoding="utf-8", errors="strict"))
    lines = text.splitlines()
    start_marker = "BRAIN_ATLAS_REPLAY_RECEIPT_V2_START"
    body_marker = "BRAIN_ATLAS_REPLAY_RECEIPT_V2_BODY"
    end_marker = "BRAIN_ATLAS_REPLAY_RECEIPT_V2_END"
    if not lines or lines[0] != start_marker or lines.count(body_marker) != 1 or lines.count(end_marker) != 1:
        raise ContractError("DSI replay log lacks one complete v2 execution receipt")
    body_index = lines.index(body_marker)
    end_index = lines.index(end_marker)
    if body_index <= 1 or end_index <= body_index or len(lines) != end_index + 3:
        raise ContractError("DSI replay v2 receipt boundaries are invalid")
    header = _receipt_mapping(lines[1:body_index], "header")
    footer = _receipt_mapping(lines[end_index + 1:], "footer")
    required_header = {
        "BRAIN_ATLAS_STARTED_UTC", "BRAIN_ATLAS_WORKING_DIRECTORY",
        "BRAIN_ATLAS_OS_VERSION", "BRAIN_ATLAS_KERNEL", "BRAIN_ATLAS_MACHINE",
        "BRAIN_ATLAS_BASH_VERSION", "BRAIN_ATLAS_THREAD_ENV_OMP_NUM_THREADS",
        "BRAIN_ATLAS_THREAD_ENV_OPENBLAS_NUM_THREADS",
        "BRAIN_ATLAS_THREAD_ENV_VECLIB_MAXIMUM_THREADS",
        "BRAIN_ATLAS_THREAD_ENV_MKL_NUM_THREADS",
        "BRAIN_ATLAS_THREAD_ENV_NUMEXPR_NUM_THREADS", "BRAIN_ATLAS_CHECK_COUNT",
    }
    try:
        check_count = int(header["BRAIN_ATLAS_CHECK_COUNT"])
    except (KeyError, ValueError) as error:
        raise ContractError("DSI replay receipt has an invalid check count") from error
    check_keys = {f"BRAIN_ATLAS_CHECK_{index}_SHA256" for index in range(check_count)}
    if set(header) != required_header | check_keys:
        raise ContractError("DSI replay receipt header contract mismatch")
    observed_checks = [header[f"BRAIN_ATLAS_CHECK_{index}_SHA256"] for index in range(check_count)]
    if observed_checks != expected_check_sha256 or any(not _SHA256.fullmatch(value) for value in observed_checks):
        raise ContractError("DSI replay execution-time input hashes differ from the invocation")
    if set(footer) != {"BRAIN_ATLAS_ENDED_UTC", "BRAIN_ATLAS_EXIT_STATUS"}:
        raise ContractError("DSI replay receipt footer contract mismatch")
    try:
        started = datetime.strptime(header["BRAIN_ATLAS_STARTED_UTC"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        ended = datetime.strptime(footer["BRAIN_ATLAS_ENDED_UTC"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        exit_status = int(footer["BRAIN_ATLAS_EXIT_STATUS"])
    except ValueError as error:
        raise ContractError("DSI replay receipt has an invalid time or exit status") from error
    if ended < started or not 0 <= exit_status <= 255:
        raise ContractError("DSI replay receipt time ordering or exit status is invalid")
    thread_environment = {
        name: header[f"BRAIN_ATLAS_THREAD_ENV_{name}"]
        for name in (
            "OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "VECLIB_MAXIMUM_THREADS",
            "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS",
        )
    }
    return {
        "version": 2,
        "startedUtc": header["BRAIN_ATLAS_STARTED_UTC"],
        "endedUtc": footer["BRAIN_ATLAS_ENDED_UTC"],
        "exitStatus": exit_status,
        "workingDirectory": header["BRAIN_ATLAS_WORKING_DIRECTORY"],
        "osVersion": header["BRAIN_ATLAS_OS_VERSION"],
        "kernel": header["BRAIN_ATLAS_KERNEL"],
        "machine": header["BRAIN_ATLAS_MACHINE"],
        "bashVersion": header["BRAIN_ATLAS_BASH_VERSION"],
        "threadEnvironment": thread_environment,
        "checkSha256": observed_checks,
    }


def _parse_log(path: Path, tracked: Path) -> tuple[dict[str, Any], list[str]]:
    text = _ANSI.sub("", path.read_text(encoding="utf-8", errors="strict"))
    if "not used/recognized" in text:
        raise ContractError("DSI log reports an unused or unrecognized option")
    if "action=trk" not in text or str(tracked) not in text or "tracts are generated" not in text:
        raise ContractError("DSI log lacks required tracking completion evidence")
    keys = (
        "thread_count", "source", "otsu_threshold", "fa_threshold", "dt_threshold",
        "turning_angle", "step_size", "smoothing", "min_length", "max_length",
        "track_voxel_ratio", "random_seed", "method", "check_ending", "tip_iteration",
        "seed_count", "tract_count", "seed", "end", "output",
    )
    parameters: dict[str, Any] = {}
    for key in keys:
        matches = re.findall(rf"(?<![A-Za-z0-9_]){re.escape(key)}=([^\s]+)", text, flags=re.MULTILINE)
        if matches:
            parameters[key] = matches[-1]
    generated = re.search(r"(\d+) tracts are generated using (\d+) seeds", text)
    if generated:
        parameters["generatedTracts"] = int(generated.group(1))
        parameters["usedSeeds"] = int(generated.group(2))
    identity = next(
        (line for line in text.splitlines() if line.startswith("DSI Studio") or line == "DSI identity"),
        "",
    )
    if identity:
        parameters["emittedIdentity"] = identity
    warnings = []
    for line in text.splitlines():
        normalized = line.strip(" │├└─┬")
        if any(marker in normalized for marker in (
            "different dimension", "need transformation or warping", "assume ",
            "applying ", "likely wrong",
        )) and normalized not in warnings:
            warnings.append(normalized)
    return parameters, warnings


def _validate_evidence(evidence: dict[str, Any]) -> None:
    expected_top = {
        "schemaVersion", "asset", "classification", "environment", "invocation",
        "execution", "trackvis", "postprocess", "retention",
    }
    if set(evidence) != expected_top or evidence["schemaVersion"] != 2:
        raise ContractError("replay evidence top-level contract mismatch")
    classification = evidence["classification"]
    expected_classes = {
        1: ("byte-exact", "allowed-without-new-decision"),
        2: ("decoded-exact-order-drift", "human-decision-required"),
        3: ("metric-only", "human-decision-required"),
        4: ("materially-different", "blocked"),
    }
    if expected_classes.get(classification.get("id")) != (
        classification.get("name"), classification.get("closeout")
    ):
        raise ContractError("replay evidence classification is inconsistent")

    def walk(value: Any, key: str = "") -> None:
        if isinstance(value, dict):
            for child_key, child in value.items():
                walk(child, child_key)
        elif isinstance(value, list):
            for child in value:
                walk(child, key)
        elif key.lower().endswith("sha256") and (not isinstance(value, str) or not _SHA256.fullmatch(value)):
            raise ContractError(f"replay evidence has invalid SHA-256 at {key}")

    walk(evidence)
    invocation = evidence["invocation"]
    if invocation.get("wrapperVersion") != 2:
        raise ContractError("replay evidence wrapper version mismatch")
    input_checks = invocation.get("inputChecks", [])
    if not input_checks or any(
        item.get("expectedSha256") != item.get("executionSha256") for item in input_checks
    ):
        raise ContractError("replay evidence execution-time input identity mismatch")
    executable = invocation.get("executable", {})
    if not input_checks or any(
        executable.get(field) != input_checks[0].get(field if field != "sha256" else "expectedSha256")
        for field in ("path", "bytes", "sha256")
    ):
        raise ContractError("replay evidence executable identity mismatch")
    execution = evidence["execution"]
    if execution.get("receiptVersion") != 2 or execution.get("unusedOrUnrecognizedOptions") is not False:
        raise ContractError("replay evidence execution receipt mismatch")
    if (execution.get("humanReportedOutcome") == "completed") != (execution.get("exitStatus") == 0):
        raise ContractError("replay evidence human outcome and exit status disagree")
    explicit = invocation.get("explicitParameters", {})
    effective = execution.get("effectiveParameters", {})
    for explicit_name, effective_name in (("randomSeed", "random_seed"), ("threadCount", "thread_count")):
        parameter = explicit.get(explicit_name, {})
        if parameter.get("passed"):
            if parameter.get("value") != effective.get(effective_name):
                raise ContractError(f"replay explicit and effective {explicit_name} disagree")
        elif parameter.get("value") is not None:
            raise ContractError(f"replay omitted {explicit_name} has a value")
    try:
        json.dumps(evidence, allow_nan=False)
    except (TypeError, ValueError) as error:
        raise ContractError("replay evidence is not finite JSON") from error


def verify_replay(
    *,
    asset: str,
    manifest: dict[str, Any],
    context: dict[str, Any],
    tracked_path: Path,
    log_path: Path,
    script_path: Path,
    evidence_path: Path,
    human_outcome: str,
    repo: Path,
    swm_gm_path: Path | None = None,
) -> dict[str, Any]:
    tracked_path = Path(tracked_path)
    log_path = Path(log_path)
    script_path = Path(script_path)
    evidence_path = Path(evidence_path)
    for path in (tracked_path, log_path, script_path):
        if path.is_symlink() or not path.is_file():
            raise ContractError(f"replay evidence input must be a regular nonsymlink file: {path}")
    if not evidence_path.is_absolute() or evidence_path.exists() or evidence_path.parent.is_symlink() or not evidence_path.parent.is_dir():
        raise ContractError("evidence output must be a new absolute file in an existing nonsymlink directory")
    if (repo / "public").resolve() in evidence_path.resolve().parents:
        raise ContractError("replay evidence may not be written under public/")
    script = script_path.read_text(encoding="utf-8", errors="strict")
    if script != context["script"]:
        raise ContractError("executed replay wrapper differs from the canonical generated script")
    receipt = _parse_execution_receipt(log_path, [expected for expected, _ in context["checks"]])
    effective_parameters, warnings = _parse_log(log_path, tracked_path)
    loaded = load_trackvis(tracked_path, require_registered_header=True)
    order_hash = trackvis_order_sha256(loaded.streamlines)
    multiset_hash = trackvis_multiset_sha256(loaded.streamlines)

    generated_path = tracked_path.with_suffix(".postprocessed.json")
    temporary = tempfile.TemporaryDirectory() if generated_path.exists() else None
    postprocess_target = Path(temporary.name) / generated_path.name if temporary else generated_path
    if asset == "optic-radiation":
        details = postprocess_or_trackvis(tracked_path, postprocess_target)
        reference_records = [_record_by_id(manifest["intermediates"], "or-recovered-trk")]
        decoded_reference = reference_records[0]
        required_shape = "220x64x3"
        generated_payload = json.loads(postprocess_target.read_text(encoding="utf-8"))
        required_shape_satisfied = (
            generated_payload.get("n") == 220
            and generated_payload.get("np") == 64
            and len(generated_payload.get("fibres", [])) == 220
            and all(len(fibre) == 64 and all(len(point) == 3 for point in fibre) for fibre in generated_payload.get("fibres", []))
        )
        checked_output = _record_by_id(manifest["outputs"], "optic-radiation")
    else:
        if swm_gm_path is None:
            raise ContractError("SWM replay verification requires the exact GM parent")
        details = postprocess_swm_trackvis(swm_gm_path, tracked_path, postprocess_target)
        reference_records = [
            _record_by_id(manifest["intermediates"], "swm-recovered-trk-gzip"),
            _record_by_id(manifest["intermediates"], "swm-recovered-trk-plain"),
        ]
        decoded_reference = reference_records[1]
        required_shape = "15000x8x3 with 15000 len and lloc"
        generated_payload = json.loads(postprocess_target.read_text(encoding="utf-8"))
        fibres = generated_payload.get("fibres", [])
        required_shape_satisfied = (
            generated_payload.get("n") == 15_000
            and generated_payload.get("np") == 8
            and len(fibres) == len(generated_payload.get("len", [])) == len(generated_payload.get("lloc", [])) == 15_000
            and all(len(fibre) == 8 and all(len(point) == 3 for point in fibre) for fibre in fibres)
        )
        checked_output = _record_by_id(manifest["outputs"], "swm")

    if temporary:
        if (
            postprocess_target.stat().st_size != generated_path.stat().st_size
            or sha256_file(postprocess_target) != sha256_file(generated_path)
        ):
            temporary.cleanup()
            raise ContractError("retained replay post-processing output is not reproducible")
        temporary.cleanup()
    tracked_sha = sha256_file(tracked_path)
    post_sha = sha256_file(generated_path)
    byte_exact = tracked_sha in {record["sha256"] for record in reference_records}
    order_exact = order_hash == decoded_reference["decodedOrderSha256"]
    multiset_exact = multiset_hash == decoded_reference["decodedMultisetSha256"]
    post_exact = generated_path.stat().st_size == checked_output["bytes"] and post_sha == checked_output["sha256"]
    classification = classify_replay(
        byte_exact,
        order_exact,
        multiset_exact,
        post_exact,
        required_shape_satisfied,
    )
    input_checks = [
        {
            "path": str(path),
            "bytes": path.stat().st_size,
            "expectedSha256": expected,
            "executionSha256": receipt["checkSha256"][index],
        }
        for index, (expected, path) in enumerate(context["checks"])
    ]
    executable_expected, executable_path = context["checks"][0]
    evidence = {
        "schemaVersion": 2,
        "asset": asset,
        "classification": classification,
        "environment": {
            "platform": platform.platform(),
            "machine": platform.machine(),
            "python": sys.version.split()[0],
            "verifierGitHead": _git_head(repo),
            "execution": {
                "workingDirectory": receipt["workingDirectory"],
                "osVersion": receipt["osVersion"],
                "kernel": receipt["kernel"],
                "machine": receipt["machine"],
                "bashVersion": receipt["bashVersion"],
                "threadEnvironment": receipt["threadEnvironment"],
            },
        },
        "invocation": {
            "wrapperVersion": 2,
            "argv": context["argv"],
            "argvSha256": dsi_invocation_sha256(context["argv"]),
            "executable": {
                "path": str(executable_path),
                "bytes": executable_path.stat().st_size,
                "sha256": executable_expected,
            },
            "explicitParameters": _explicit_parameters(context["argv"]),
            "scriptPath": str(script_path),
            "scriptBytes": script_path.stat().st_size,
            "scriptSha256": sha256_file(script_path),
            "inputChecks": input_checks,
        },
        "execution": {
            "receiptVersion": 2,
            "humanReportedOutcome": human_outcome,
            "startedUtc": receipt["startedUtc"],
            "endedUtc": receipt["endedUtc"],
            "exitStatus": receipt["exitStatus"],
            "unusedOrUnrecognizedOptions": False,
            "logPath": str(log_path),
            "logBytes": log_path.stat().st_size,
            "logSha256": sha256_file(log_path),
            "outputMtimeNs": tracked_path.stat().st_mtime_ns,
            "logMtimeNs": log_path.stat().st_mtime_ns,
            "effectiveParameters": effective_parameters,
            "warnings": warnings,
        },
        "trackvis": {
            "path": str(tracked_path),
            "bytes": tracked_path.stat().st_size,
            "sha256": tracked_sha,
            "gzip": loaded.compressed,
            "streamlines": len(loaded.streamlines),
            "decodedOrderSha256": order_hash,
            "decodedMultisetSha256": multiset_hash,
            "effectiveAffine": loaded.effective_affine.tolist(),
            "reference": {
                "acceptedByteSha256": [record["sha256"] for record in reference_records],
                "streamlines": decoded_reference["streamlines"],
                "decodedOrderSha256": decoded_reference["decodedOrderSha256"],
                "decodedMultisetSha256": decoded_reference["decodedMultisetSha256"],
            },
        },
        "postprocess": {
            "generatedPath": str(generated_path),
            "bytes": generated_path.stat().st_size,
            "sha256": post_sha,
            "details": details,
            "requiredShape": required_shape,
            "requiredShapeSatisfied": required_shape_satisfied,
            "checkedOutputSha256": checked_output["sha256"],
            "checkedOutputByteExact": post_exact,
        },
        "retention": {
            "rawOutput": str(tracked_path),
            "log": str(log_path),
            "evidence": str(evidence_path),
            "replacementAuthorized": False,
        },
    }
    _validate_evidence(evidence)
    evidence_path.write_text(
        json.dumps(evidence, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return evidence
