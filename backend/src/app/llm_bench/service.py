"""Business/core logic for the llm-bench module."""

from app.llm_bench.schemas import Highlight, LlmBenchInfo


def get_overview() -> LlmBenchInfo:
    """Return the LLM benchmarking feature overview."""
    return LlmBenchInfo(
        slug="llm-bench",
        title="LLM Benchmarking",
        tagline="llm-bench",
        description=(
            "Reproducible throughput, latency, and TTFT benchmarks for large "
            "language models across Intel silicon and serving stacks."
        ),
        highlights=[
            Highlight(
                title="Throughput & latency",
                body="Measure tokens/sec, time-to-first-token, and end-to-end "
                "latency under configurable concurrency.",
            ),
            Highlight(
                title="Reproducible runs",
                body="Pin datasets, prompts, and model revisions so results "
                "stay comparable across PRs.",
            ),
            Highlight(
                title="Exportable results",
                body="Emit CSV/JSON artifacts ready for dashboards and regression tracking.",
            ),
        ],
    )
