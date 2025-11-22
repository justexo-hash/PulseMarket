import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";

function loadPlan() {
  const planPath = path.join(process.cwd(), "NEXT_MIGRATION_PLAN.md");
  try {
    return readFileSync(planPath, "utf-8");
  } catch {
    return [
      "NEXT_MIGRATION_PLAN.md was not found.",
      "Ensure the file exists at the repository root.",
    ].join("\n");
  }
}

export default function PlanPage() {
  const plan = loadPlan();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Documentation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Next.js Migration Plan
        </h1>
        <p className="text-muted-foreground">
          Source: <code className="rounded bg-muted px-1 py-0.5">NEXT_MIGRATION_PLAN.md</code>
        </p>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
        >
          ← Back to placeholder page
        </Link>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-border bg-card p-6 text-left text-sm leading-relaxed text-foreground/90 shadow-md">
        {plan}
      </pre>
    </div>
  );
}

