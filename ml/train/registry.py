"""Model registry (lib/ml/registry.json). Append-only by (id, version): re-registering a version with a
different artifact hash is an error, so a production model can never be silently replaced.

    python -m ml.train.registry sync        # (re)build entries from reports + artifacts
"""
from __future__ import annotations

import hashlib
import json
from datetime import date

from .common import META, ROOT

REGISTRY = ROOT / "lib" / "ml" / "registry.json"
REPORTS = ROOT / "ml" / "artifacts" / "reports"
ARTIFACTS = ROOT / "lib" / "ml" / "artifacts"


def load() -> dict:
    return json.loads(REGISTRY.read_text(encoding="utf-8")) if REGISTRY.exists() else {"schema": 1, "models": []}


def sha256_file(p) -> str:
    """Canonical hash: line endings normalised to LF so Windows and Linux checkouts agree."""
    return hashlib.sha256(p.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def register(entry: dict, reg: dict) -> None:
    for i, m in enumerate(reg["models"]):
        if m["id"] == entry["id"] and m["version"] == entry["version"]:
            if m.get("artifactSha256") != entry.get("artifactSha256"):
                raise SystemExit(f"{entry['id']}@{entry['version']} already registered with a different artifact hash: bump the version")
            reg["models"][i] = entry  # same artifact: metadata refresh only
            return
    reg["models"].append(entry)


def sync() -> dict:
    reg = load()
    def vol_entry(version: str, status: str, sel_file: str, hold_file: str, extra: dict) -> dict:
        path = ARTIFACTS / f"volatility-ridge-{version}.json"
        art = json.loads(path.read_text(encoding="utf-8"))
        sel = json.loads((REPORTS / sel_file).read_text(encoding="utf-8"))
        hold = json.loads((REPORTS / hold_file).read_text(encoding="utf-8"))
        ridge = next(r for r in sel["results"] if r["model"] == "ridge_all")
        persist = next(r for r in sel["results"] if r["model"] == "persist_ols")
        return {
            "id": "volatility-ridge", "version": version, "task": "volatility_forecast", "status": status,
            "artifact": f"lib/ml/artifacts/volatility-ridge-{version}.json", "artifactSha256": sha256_file(path),
            "trainedAt": art["trainedAt"], "featureVersion": art["featureVersion"], "datasetSha256": art["datasetSha256"],
            "fitRange": art["fitRange"], "calibRange": art["calibRange"], "hyperparameters": art["hyperparameters"],
            "validation": {"method": "purged expanding-window walk-forward, 14 six-month folds", "range": [sel["firstTest"], sel["selectionEnd"]],
                           "rows": sel["rows"], "r2VsNaive": ridge["r2VsNaive"], "mseVsPersist": ridge["mseVsPersist"],
                           "foldsBeatingPersist": ridge["foldsBeatingPersist"], "folds": ridge["folds"],
                           "interval80Coverage": ridge["interval80Coverage"], "persistR2": persist["r2VsNaive"],
                           "ownVolMonotoneRate": ridge.get("ownVolMonotoneRate")},
            "holdout": {"range": [hold["holdoutStart"], hold["holdoutEnd"]], "rows": hold["rows"], "r2VsNaive": hold["r2VsNaive"],
                        "mseVsPersist": hold["mseVsPersist"], "interval80Coverage": hold["interval80Coverage"],
                        "pristine": hold.get("holdoutPristine", True)},
            "limitations": [
                "Forecasts the size of moves (volatility), NOT their direction.",
                "Trained on 47 current Nifty-50 constituents (survivorship bias); behaviour on small caps is untested.",
                "Log-scale intervals are calibrated on average; coverage can degrade in unprecedented regimes.",
            ], **extra,
        }

    register(vol_entry("1.0.0", "superseded", "volatility_v1.0.json", "volatility_holdout_v1.0.json", {
        "supersededBy": "1.1.0",
        "reason": "Specification defect: raw and log volatility features were collinear, so the forecast FELL when a stock's own "
                  "volatility rose in 18 of 25 sampled cases. Fixed in 1.1.0 (log-only volatility features, monotonicity gate).",
    }), reg)
    register(vol_entry("1.1.0", "production", "volatility.json", "volatility_holdout.json", {
        "notes": "Holdout 2025-10-01.. was first scored on v1.0.0; v1.1.0's holdout is a second look and is NOT pristine.",
    }), reg)

    for rep_name, tgt in (("walkforward.json", "next-5-day return > 0"), ("walkforward_rel.json", "5-day return beats same-day median")):
        rep = json.loads((REPORTS / rep_name).read_text(encoding="utf-8"))
        elig = {d["model"]: d for d in json.loads((REPORTS / "eligibility.json").read_text(encoding="utf-8"))[rep_name]}
        for r in rep["results"]:
            if r["kind"] != "ml":
                continue
            e = elig[r["model"]]
            c = r["classification"]
            register({
                "id": f"direction-{r['model']}-{('rel' if '_rel' in rep_name else 'abs')}", "version": "0.1.0", "task": "direction_classification",
                "status": "rejected", "target": tgt, "artifact": None, "artifactSha256": None,
                "trainedAt": date.today().isoformat(), "featureVersion": rep["featureVersion"], "datasetSha256": rep["datasetSha256"],
                "validation": {"method": "purged expanding-window walk-forward, 14 six-month folds", "range": [rep["firstTest"], rep["selectionEnd"]],
                               "rocAuc": c["rocAuc"], "brierSkill": c["brierSkill"], "ece": c["ece"], "rankIC": r["rankIC"]["ic"],
                               "netSharpe": r["strategy"]["strategy"]["sharpe"], "benchmarkSharpe": r["strategy"]["benchmark"]["sharpe"]},
                "gate": e["checks"], "reason": "Failed the pre-registered deployment gate: " + ", ".join(k for k, v in e["checks"].items() if not v),
            }, reg)
    REGISTRY.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY.write_text(json.dumps(reg, indent=2), encoding="utf-8", newline="\n")
    return reg


if __name__ == "__main__":
    r = sync()
    for m in r["models"]:
        print(f"{m['status']:10s} {m['id']}@{m['version']}")
