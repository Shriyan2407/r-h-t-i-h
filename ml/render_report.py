"""Render docs/MODEL_EVALUATION.md tables from the recorded reports, so documentation cannot drift from results.

    python -m ml.render_report
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
R = ROOT / "ml" / "artifacts" / "reports"
BEGIN, END = "<!-- BEGIN GENERATED: ml/render_report.py -->", "<!-- END GENERATED -->"


def f(v, d=3):
    return "n/a" if v is None else f"{v:.{d}f}"


def p(v, d=1):
    return "n/a" if v is None else f"{v * 100:.{d}f}%"


def direction_table(rep: dict) -> str:
    rows = ["| Model | Kind | ROC-AUC | PR-AUC | Brier | Brier skill | ECE | Accuracy | Precision | Recall | F1 | Rank IC (t) | Net Sharpe | Max DD | Win rate | Bench. Sharpe |",
            "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in rep["results"]:
        c, s, ic = r["classification"], r["strategy"], r["rankIC"]
        rows.append("| {m} | {k} | {auc} | {pr} | {b} | {bs} | {ece} | {acc} | {pre} | {rec} | {f1} | {ic} ({t}) | {sh} | {dd} | {wr} | {bsh} |".format(
            m=r["model"], k=r["kind"], auc=f(c.get("rocAuc")), pr=f(c.get("prAuc")), b=f(c.get("brier"), 4), bs=f(c.get("brierSkill"), 4),
            ece=f(c.get("ece")), acc=p(c.get("accuracy")), pre=p(c.get("precision")), rec=p(c.get("recall")), f1=f(c.get("f1")),
            ic=f(ic.get("ic"), 4), t=f(ic.get("icTStat"), 2), sh=f(s["strategy"]["sharpe"], 2), dd=p(s["strategy"]["maxDrawdown"]),
            wr=p(s["strategy"]["winRate"]), bsh=f(s["benchmark"]["sharpe"], 2)))
    return "\n".join(rows)


def main():
    abs_ = json.loads((R / "walkforward.json").read_text(encoding="utf-8"))
    rel = json.loads((R / "walkforward_rel.json").read_text(encoding="utf-8"))
    vol = json.loads((R / "volatility.json").read_text(encoding="utf-8"))
    vol10 = json.loads((R / "volatility_v1.0.json").read_text(encoding="utf-8"))
    hold = json.loads((R / "volatility_holdout.json").read_text(encoding="utf-8"))
    hold10 = json.loads((R / "volatility_holdout_v1.0.json").read_text(encoding="utf-8"))
    elig = json.loads((R / "eligibility.json").read_text(encoding="utf-8"))

    out = [BEGIN, "",
           f"### Direction, target `next-5-day return > 0` ({abs_['folds']} folds, {abs_['firstTest']} to {abs_['selectionEnd']}, costs {abs_['costBpsPerSide']} bps/side)", "",
           direction_table(abs_), "",
           "### Direction, target `5-day return beats the same-day universe median`", "", direction_table(rel), "",
           "Accuracy/precision/recall/F1 use a 0.5 threshold on calibrated probabilities; with a ~52% base rate they mostly reflect the base rate. Rule rows are uncalibrated scores, so only AUC, IC and strategy metrics apply.", "",
           "### Deployment gate (pre-registered)", "", "| Report | Model | Eligible | Failed checks |", "|---|---|---|---|"]
    for name, ds in elig.items():
        for d in ds:
            out.append(f"| {name} | {d['model']} | {'yes' if d['eligible'] else 'no'} | {', '.join(k.replace('|', chr(92) + '|') for k, v in d['checks'].items() if not v) or '-'} |")
    for title, v in (("v1.1.0 (production)", vol), ("v1.0.0 (superseded)", vol10)):
        out += ["", f"### Volatility, {title}: {v['folds']} folds, {v['rows']:,} out-of-sample rows", "",
                "| Model | R² vs naive | MSE | MSE vs persistence | MAE | 80% interval coverage | Folds beating persistence | Own-vol monotone | Eligible |",
                "|---|---|---|---|---|---|---|---|---|"]
        for r in v["results"]:
            out.append(f"| {r['model']} | {f(r['r2VsNaive'])} | {f(r['mse'], 4)} | {p(r.get('mseVsPersist'))} | {f(r['mae'], 4)} | {p(r['interval80Coverage'])} | "
                       f"{r['foldsBeatingPersist'] if r['foldsBeatingPersist'] is not None else 'n/a'} | {p(r.get('ownVolMonotoneRate')) if 'ownVolMonotoneRate' in r else 'not measured'} | {r.get('eligible', 'n/a')} |")
        out.append(f"\nChosen by the pre-registered rule: **{v['chosen']}**.")
    surv_path = R / "survivorship.json"
    if surv_path.exists():
        sv = json.loads(surv_path.read_text(encoding="utf-8"))
        b = sv["survivorshipBias"]
        out += ["", f"### Robustness: {sv['model']} on 25 former Nifty 50 constituents (never in training)", "",
                "| Slice | Rows | R² vs naive | MSE vs persistence | 80% coverage |", "|---|---|---|---|---|"]
        for k, name in (("allDates", "all dates"), ("outOfSampleDates", "dates >= 2025-10-01 (stocks and dates unseen)")):
            x = sv[k]
            out.append(f"| {name} | {x['rows']:,} | {f(x['r2VsNaive'])} | {p(x['mseVsPersist'])} | {p(x['interval80Coverage'])} |")
        out += ["", f"Beats persistence on {sv['tickersBeatingPersistence']} of {len(sv['perTicker'])} stocks. "
                f"Survivorship in raw returns: share of positive 5-day windows {p(b['trainingUniversePositiveRate'])} (current members) "
                f"vs {p(b['formerConstituentsPositiveRate'])} (former members); mean 5-day return {p(b['trainingUniverseMeanFwd5d'], 3)} vs "
                f"{p(b['formerConstituentsMeanFwd5d'], 3)}."]
    out += ["", "### Volatility holdout (2025-10-01 onward)", "", "| Version | Rows | R² vs naive | MSE vs persistence | 80% coverage | Pristine |", "|---|---|---|---|---|---|",
            f"| 1.0.0 | {hold10['rows']:,} | {f(hold10['r2VsNaive'])} | {p(hold10['mseVsPersist'])} | {p(hold10['interval80Coverage'])} | yes (first look) |",
            f"| 1.1.0 | {hold['rows']:,} | {f(hold['r2VsNaive'])} | {p(hold['mseVsPersist'])} | {p(hold['interval80Coverage'])} | no (second look) |", "", END]

    doc = ROOT / "docs" / "MODEL_EVALUATION.md"
    text = doc.read_text(encoding="utf-8") if doc.exists() else f"# Model evaluation\n\n{BEGIN}\n{END}\n"
    a, b = text.index(BEGIN), text.index(END) + len(END)
    doc.write_text(text[:a] + "\n".join(out) + text[b:], encoding="utf-8", newline="\n")
    print("updated", doc)


if __name__ == "__main__":
    main()
