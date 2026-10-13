import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ModelEvidence } from "@/components/models/ModelEvidence";
import { evaluationSummary } from "@/lib/ml/evaluation";

export const metadata: Metadata = {
  title: "Model evidence",
  description: "Out-of-sample results for every model we evaluated, including the ones we rejected.",
};

export default function ModelsPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 16px 64px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>Model evidence</h1>
        <p style={{ color: "var(--th-text-muted)", margin: "0 0 28px", maxWidth: 760 }}>
          Every model we trained, how it was tested, and whether it was good enough to use. Only models that beat simple
          baselines on data they never saw are shown in the product. Results are recorded once and published as measured.
        </p>
        <ModelEvidence data={evaluationSummary()} />
      </main>
    </>
  );
}
