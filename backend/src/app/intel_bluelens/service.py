"""Business/core logic for the intel-bluelens module."""

from app.intel_bluelens.schemas import Highlight, IntelBluelensInfo


def get_overview() -> IntelBluelensInfo:
    """Return the intel-bluelens feature overview."""
    return IntelBluelensInfo(
        slug="intel-bluelens",
        title="Intel BlueLens",
        tagline="intel-bluelens",
        description=(
            "Observability and tracing for AI pipelines — see requests, spans, "
            "and bottlenecks end to end."
        ),
        highlights=[
            Highlight(
                title="Distributed tracing",
                body="Follow a request across frontend, backend, and inference "
                "engines.",
            ),
            Highlight(
                title="Live timelines",
                body="Visualize spans and latencies to spot regressions fast.",
            ),
            Highlight(
                title="Drill-down panels",
                body="Inspect payloads, errors, and resource usage per span.",
            ),
        ],
    )
