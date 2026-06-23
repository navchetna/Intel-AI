"""Business/core logic for the serving-engines module."""

from app.serving_engines.schemas import Highlight, ServingEnginesInfo


def get_overview() -> ServingEnginesInfo:
    """Return the serving-engines feature overview."""
    return ServingEnginesInfo(
        slug="serving-engines",
        title="Serving Engines",
        tagline="serving-engines",
        description=(
            "Compare and configure inference servers — vLLM, TGI, and friends — "
            "with consistent, versioned deployment recipes."
        ),
        highlights=[
            Highlight(
                title="Engine matrix",
                body="Side-by-side capabilities, quantization support, and "
                "batching strategies.",
            ),
            Highlight(
                title="One-click recipes",
                body="Versioned launch configs for each engine and model family.",
            ),
            Highlight(
                title="Health & metrics",
                body="Liveness, queue depth, and KV-cache utilization at a glance.",
            ),
        ],
    )
