"""Command-line boundary for offline anatomical asset pipelines."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any, Sequence

from .common import (
    ContractError,
    DEFAULT_MANIFEST,
    DEFAULT_SCHEMA,
    require_empty_output_root,
    resolve_inputs,
    sha256_file,
    tree_records_sha256,
    validate_manifest,
    verify_current,
    verify_environment,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m tools.assets")
    subparsers = parser.add_subparsers(dest="command", required=True)

    check = subparsers.add_parser("check-manifest", help="validate the offline asset manifest")
    check.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    check.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    check.add_argument("--json", action="store_true")

    current = subparsers.add_parser("verify-current", help="verify checked runtime assets without regenerating them")
    current.add_argument("--repo", type=Path, required=True)
    current.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    current.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    current.add_argument("--json", action="store_true")

    environment = subparsers.add_parser("environment-preflight", help="verify the byte-exact Python build environment")
    environment.add_argument("--uv", type=Path, required=True)
    environment.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    environment.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    environment.add_argument("--json", action="store_true")

    build = subparsers.add_parser("build", help="run one verified offline builder")
    build_subparsers = build.add_subparsers(dest="asset", required=True)
    for asset in ("cortex", "regions", "association"):
        asset_parser = build_subparsers.add_parser(asset)
        _add_heavy_common_arguments(asset_parser)

    prepare = subparsers.add_parser("prepare", help="derive verified tracking inputs")
    prepare_subparsers = prepare.add_subparsers(dest="asset", required=True)
    for asset in ("optic-radiation", "swm"):
        asset_parser = prepare_subparsers.add_parser(asset)
        _add_heavy_common_arguments(asset_parser)

    postprocess = subparsers.add_parser("postprocess", help="post-process a verified tracked intermediate")
    postprocess_subparsers = postprocess.add_subparsers(dest="asset", required=True)
    optic_radiation = postprocess_subparsers.add_parser("optic-radiation")
    _add_postprocess_common_arguments(optic_radiation)
    swm = postprocess_subparsers.add_parser("swm")
    _add_postprocess_common_arguments(swm)
    swm.add_argument("--inputs", type=Path, required=True)

    dsi_command = subparsers.add_parser("dsi-command", help="print a verified DSI replay wrapper without executing it")
    dsi_subparsers = dsi_command.add_subparsers(dest="asset", required=True)
    for asset in ("optic-radiation", "swm"):
        asset_parser = dsi_subparsers.add_parser(asset)
        _add_dsi_identity_arguments(asset_parser)
        asset_parser.add_argument("--output", type=Path, required=True)
        asset_parser.add_argument("--log", type=Path, required=True)

    verify_replay = subparsers.add_parser("verify-replay", help="classify a retained user-run DSI replay")
    verify_subparsers = verify_replay.add_subparsers(dest="asset", required=True)
    for asset in ("optic-radiation", "swm"):
        asset_parser = verify_subparsers.add_parser(asset)
        _add_dsi_identity_arguments(asset_parser)
        asset_parser.add_argument("--tracked", type=Path, required=True)
        asset_parser.add_argument("--log", type=Path, required=True)
        asset_parser.add_argument("--script", type=Path, required=True)
        asset_parser.add_argument("--evidence", type=Path, required=True)
        asset_parser.add_argument("--human-outcome", choices=("completed", "failed"), required=True)
        asset_parser.add_argument("--json", action="store_true")
        if asset == "swm":
            asset_parser.add_argument("--postprocess-inputs", type=Path, required=True)
    return parser


def _emit(report: dict[str, Any], as_json: bool) -> None:
    if as_json:
        print(json.dumps(report, sort_keys=True, separators=(",", ":")))
    else:
        print(f"{report['command']}: {report['status']}")


def _add_heavy_common_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--inputs", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--uv", type=Path, default=Path(shutil.which("uv") or "uv"))
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--json", action="store_true")


def _add_dsi_identity_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--inputs", type=Path, required=True)
    parser.add_argument("--prepared", type=Path, required=True)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--uv", type=Path, default=Path(shutil.which("uv") or "uv"))
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)


def _add_postprocess_common_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--tracked", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--allow-replay", action="store_true")
    parser.add_argument("--uv", type=Path, default=Path(shutil.which("uv") or "uv"))
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--json", action="store_true")


def _record_by_id(records: list[dict[str, Any]], record_id: str) -> dict[str, Any]:
    return next(record for record in records if record["id"] == record_id)


def _run_builder(args: argparse.Namespace, manifest: dict[str, Any]) -> dict[str, Any]:
    verify_environment(args.uv, manifest)
    pipeline = _record_by_id(manifest["pipelines"], args.asset)
    sources = [_record_by_id(manifest["sources"], source_id) for source_id in pipeline["sourceIds"]]
    inputs = resolve_inputs(args.inputs, sources)
    output_root = require_empty_output_root(args.output, Path.cwd())

    if args.asset == "cortex":
        from .cortex import build_cortex_from_image

        output = output_root / "brain_mni.glb"
        details = build_cortex_from_image(inputs["templateflow-brain-mask"], output)
        expected = _record_by_id(manifest["outputs"], "cortical-shell")
        if output.stat().st_size != expected["bytes"] or sha256_file(output) != expected["sha256"]:
            raise ContractError("generated cortical shell differs from the checked output")
        generated = [output.name]
    elif args.asset == "regions":
        from .regions import build_regions_from_image

        parameters = pipeline["parameters"]
        details = build_regions_from_image(
            inputs["julich-mpm"],
            output_root,
            parameters["regions"],
            parameters["streams"],
        )
        expected_manifest = _record_by_id(manifest["outputs"], "region-manifest")
        region_manifest = output_root / "regions.json"
        if region_manifest.stat().st_size != expected_manifest["bytes"] or sha256_file(region_manifest) != expected_manifest["sha256"]:
            raise ContractError("generated region manifest differs from the checked output")
        obj_entries = [(path.name, path.read_bytes()) for path in output_root.glob("*.obj")]
        expected_tree = _record_by_id(manifest["outputs"], "region-mesh-tree")
        if len(obj_entries) != expected_tree["fileCount"] or sum(len(payload) for _, payload in obj_entries) != expected_tree["bytes"]:
            raise ContractError("generated region mesh tree shape differs from the checked output")
        if tree_records_sha256(obj_entries) != expected_tree["sha256"]:
            raise ContractError("generated region mesh tree differs from the checked output")
        generated = sorted(path.name for path in output_root.iterdir())
    else:
        from .association import build_association_from_archive

        output = output_root / "tracts.json"
        parameters = pipeline["parameters"]
        details = build_association_from_archive(
            inputs["hcp1065-tract-archive"],
            output,
            parameters["tracts"],
            fibres_per_group=parameters["fibresPerTractHemisphere"],
            points_per_fibre=parameters["pointsPerFibre"],
            seed=parameters["seed"],
        )
        expected = _record_by_id(manifest["outputs"], "association-tracts")
        if output.stat().st_size != expected["bytes"] or sha256_file(output) != expected["sha256"]:
            raise ContractError("generated association tracts differ from the checked output")
        generated = [output.name]

    return {
        "command": "build",
        "asset": args.asset,
        "generated": generated,
        "details": details,
        "status": "ok",
    }


def _run_preparation(args: argparse.Namespace, manifest: dict[str, Any]) -> dict[str, Any]:
    verify_environment(args.uv, manifest)
    pipeline = _record_by_id(manifest["pipelines"], args.asset)
    sources = [_record_by_id(manifest["sources"], source_id) for source_id in pipeline["preparationSourceIds"]]
    inputs = resolve_inputs(args.inputs, sources)
    output_root = require_empty_output_root(args.output, Path.cwd())

    if args.asset == "optic-radiation":
        from .optic_radiation import prepare_or_masks

        details = prepare_or_masks(inputs["julich-v1-left"], inputs["julich-lgn-left"], output_root)
        intermediate_ids = ("or-v1-mask", "or-lgn-mask")
    else:
        from .swm import prepare_swm_seed

        details = prepare_swm_seed(inputs["templateflow-wm"], inputs["templateflow-gm"], output_root)
        intermediate_ids = ("swm-seed",)

    generated = []
    for intermediate_id in intermediate_ids:
        expected = _record_by_id(manifest["intermediates"], intermediate_id)
        path = output_root / expected["filename"]
        if path.stat().st_size != expected["bytes"] or sha256_file(path) != expected["sha256"]:
            raise ContractError(f"derived input differs from registered {intermediate_id}")
        generated.append(path.name)
    return {
        "command": "prepare",
        "asset": args.asset,
        "generated": generated,
        "details": details,
        "status": "ok",
    }


def _verify_tracked_identity(path: Path, expected: list[dict[str, Any]], allow_replay: bool) -> str:
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise ContractError("tracked input must be a regular nonsymlink file")
    byte_count = path.stat().st_size
    digest = sha256_file(path)
    for record in expected:
        if byte_count == record["bytes"] and digest == record["sha256"]:
            return record["id"]
    if not allow_replay:
        raise ContractError("tracked input does not match a registered recovered intermediate")
    return "fresh-replay"


def _run_postprocess(args: argparse.Namespace, manifest: dict[str, Any]) -> dict[str, Any]:
    verify_environment(args.uv, manifest)
    output_root = require_empty_output_root(args.output, Path.cwd())
    if args.asset == "optic-radiation":
        from .optic_radiation import postprocess_or_trackvis

        expected_inputs = [_record_by_id(manifest["intermediates"], "or-recovered-trk")]
        tracked_identity = _verify_tracked_identity(args.tracked, expected_inputs, args.allow_replay)
        output = output_root / "or_fibres.json"
        details = postprocess_or_trackvis(args.tracked, output)
        expected_output = _record_by_id(manifest["outputs"], "optic-radiation")
    else:
        from .swm import postprocess_swm_trackvis

        source = _record_by_id(manifest["sources"], "templateflow-gm")
        inputs = resolve_inputs(args.inputs, [source])
        expected_inputs = [
            _record_by_id(manifest["intermediates"], "swm-recovered-trk-gzip"),
            _record_by_id(manifest["intermediates"], "swm-recovered-trk-plain"),
        ]
        tracked_identity = _verify_tracked_identity(args.tracked, expected_inputs, args.allow_replay)
        output = output_root / "swm_fibres.json"
        details = postprocess_swm_trackvis(inputs["templateflow-gm"], args.tracked, output)
        expected_output = _record_by_id(manifest["outputs"], "swm")
    if output.stat().st_size != expected_output["bytes"] or sha256_file(output) != expected_output["sha256"]:
        raise ContractError(f"post-processed {args.asset} output differs from the checked asset")
    return {
        "command": "postprocess",
        "asset": args.asset,
        "trackedIdentity": tracked_identity,
        "generated": [output.name],
        "details": details,
        "status": "ok",
    }


def _build_dsi_command_context(
    args: argparse.Namespace,
    manifest: dict[str, Any],
    *,
    require_empty_replay: bool,
) -> dict[str, Any]:
    from .dsi import render_dsi_wrapper

    verify_environment(args.uv, manifest)
    explicit_paths = (args.inputs, args.prepared, args.output, args.log, args.binary)
    if any(not path.is_absolute() for path in explicit_paths):
        raise ContractError("DSI command paths must be absolute")
    for path in explicit_paths:
        try:
            str(path).encode("utf-8", "strict")
        except UnicodeEncodeError as error:
            raise ContractError("DSI command path is not UTF-8") from error
    if args.output == args.log or args.output.parent != args.log.parent:
        raise ContractError("DSI output and log must be distinct paths in one replay directory")
    replay_root = args.output.parent
    if replay_root.is_symlink() or not replay_root.is_dir():
        raise ContractError("DSI replay directory must be an existing nonsymlink directory")
    if require_empty_replay and (any(replay_root.iterdir()) or args.output.exists() or args.log.exists()):
        raise ContractError("DSI replay directory must be new and empty")

    tool = _record_by_id(manifest["tools"], "dsi-studio")
    if args.binary.is_symlink() or not args.binary.is_file():
        raise ContractError("DSI binary must be a regular nonsymlink file")
    if args.binary.stat().st_size != tool["bytes"] or sha256_file(args.binary) != tool["sha256"]:
        raise ContractError("DSI binary identity does not match the manifest")
    fib_record = _record_by_id(manifest["sources"], "hcp1065-fib")
    fib = resolve_inputs(args.inputs, [fib_record])["hcp1065-fib"]

    pipeline = _record_by_id(manifest["pipelines"], args.asset)
    if args.asset == "optic-radiation":
        prepared_records = [
            _record_by_id(manifest["intermediates"], "or-v1-mask"),
            _record_by_id(manifest["intermediates"], "or-lgn-mask"),
        ]
        prepared = resolve_inputs(args.prepared, prepared_records)
        substitutions = {
            "<FIB>": str(fib),
            "<V1_MASK>": str(prepared["or-v1-mask"]),
            "<LGN_MASK>": str(prepared["or-lgn-mask"]),
            "<OUTPUT>": str(args.output),
        }
    else:
        prepared_records = [_record_by_id(manifest["intermediates"], "swm-seed")]
        prepared = resolve_inputs(args.prepared, prepared_records)
        substitutions = {
            "<FIB>": str(fib),
            "<SWM_SEED>": str(prepared["swm-seed"]),
            "<OUTPUT>": str(args.output),
        }
    argv = [str(args.binary)]
    for template in pipeline["parameters"]["dsiArgv"]:
        token = template
        for marker, value in substitutions.items():
            token = token.replace(marker, value)
        if "<" in token or ">" in token:
            raise ContractError(f"unresolved DSI argv token: {token}")
        argv.append(token)
    checks = [(tool["sha256"], args.binary), (fib_record["sha256"], fib)]
    checks.extend((record["sha256"], prepared[record["id"]]) for record in prepared_records)
    return {
        "argv": argv,
        "checks": checks,
        "script": render_dsi_wrapper(argv, checks, args.output, args.log),
        "pipeline": pipeline,
    }


def _run_dsi_command(args: argparse.Namespace, manifest: dict[str, Any]) -> str:
    return _build_dsi_command_context(args, manifest, require_empty_replay=True)["script"]


def _run_verify_replay(args: argparse.Namespace, manifest: dict[str, Any]) -> dict[str, Any]:
    from .replay import verify_replay

    context_args = argparse.Namespace(**vars(args))
    context_args.output = args.tracked
    context = _build_dsi_command_context(context_args, manifest, require_empty_replay=False)
    swm_gm_path = None
    if args.asset == "swm":
        gm_record = _record_by_id(manifest["sources"], "templateflow-gm")
        swm_gm_path = resolve_inputs(args.postprocess_inputs, [gm_record])["templateflow-gm"]
    evidence = verify_replay(
        asset=args.asset,
        manifest=manifest,
        context=context,
        tracked_path=args.tracked,
        log_path=args.log,
        script_path=args.script,
        evidence_path=args.evidence,
        human_outcome=args.human_outcome,
        repo=Path.cwd(),
        swm_gm_path=swm_gm_path,
    )
    return {
        "command": "verify-replay",
        "asset": args.asset,
        "classification": evidence["classification"],
        "evidence": str(args.evidence),
        "status": "ok",
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = _parser()
    args = parser.parse_args(argv)
    try:
        manifest = validate_manifest(args.manifest, args.schema)
        if args.command == "check-manifest":
            report = {
                "command": "check-manifest",
                "manifest": args.manifest.relative_to(args.manifest.parents[2]).as_posix(),
                "schemaVersion": manifest["schemaVersion"],
                "sources": len(manifest["sources"]),
                "intermediates": len(manifest["intermediates"]),
                "pipelines": len(manifest["pipelines"]),
                "outputs": len(manifest["outputs"]),
                "rights": len(manifest["rights"]),
                "status": "ok",
            }
        elif args.command == "verify-current":
            current = verify_current(args.repo, manifest)
            report = {
                "command": "verify-current",
                "repo": str(args.repo.resolve()),
                **current,
                "status": "ok",
            }
        elif args.command == "environment-preflight":
            environment = verify_environment(args.uv, manifest)
            report = {
                "command": "environment-preflight",
                "mode": "byte-exact",
                "packages": len(environment["distributionTreeSha256"]),
                "status": "ok",
            }
        elif args.command == "dsi-command":
            sys.stdout.write(_run_dsi_command(args, manifest))
            return 0
        elif args.command == "verify-replay":
            report = _run_verify_replay(args, manifest)
        elif args.command == "build":
            report = _run_builder(args, manifest)
        elif args.command == "prepare":
            report = _run_preparation(args, manifest)
        else:
            report = _run_postprocess(args, manifest)
        _emit(report, args.json)
        return 0
    except (ContractError, FileNotFoundError, json.JSONDecodeError, OSError, ValueError) as error:
        print(f"asset pipeline contract error: {error}", file=sys.stderr)
        return 1
