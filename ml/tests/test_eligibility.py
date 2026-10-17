import unittest

from ml.train.eligibility import gate


def result(auc=0.55, folds_above=10, folds=14, skill=0.01, ic=0.03, t=3.0, s=1.2, b=0.8):
    return {"model": "m", "kind": "ml", "classification": {"rocAuc": auc, "brierSkill": skill},
            "foldAuc": {"foldsAboveHalf": folds_above, "folds": folds}, "rankIC": {"ic": ic, "icTStat": t},
            "strategy": {"strategy": {"sharpe": s}, "benchmark": {"sharpe": b}}}


class GateTests(unittest.TestCase):
    def test_passes_only_when_every_check_passes(self):
        self.assertTrue(gate(result())["eligible"])

    def test_each_single_failure_blocks_deployment(self):
        for kw in ({"auc": 0.51}, {"folds_above": 7}, {"skill": -0.001}, {"ic": -0.01}, {"t": 1.5}, {"s": 0.5}):
            self.assertFalse(gate(result(**kw))["eligible"], kw)

    def test_missing_metrics_fail_closed(self):
        r = result()
        r["classification"]["rocAuc"] = None
        self.assertFalse(gate(r)["eligible"])
        r = result()
        r["rankIC"] = {"ic": None, "icTStat": None}
        self.assertFalse(gate(r)["eligible"])


if __name__ == "__main__":
    unittest.main()
