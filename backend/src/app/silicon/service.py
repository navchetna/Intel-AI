"""Business/core logic for the silicon module."""

from app.silicon.schemas import Highlight, SiliconInfo


def get_overview() -> SiliconInfo:
    """Return the silicon feature overview."""
    return SiliconInfo(
        slug="silicon",
        title="Silicon",
        tagline="silicon",
        description=(
            "Profile and target Intel accelerators — Xeon, Gaudi, and GPU — "
            "with hardware-aware tuning for every model."
        ),
        highlights=[
            Highlight(
                title="Device discovery",
                body="Enumerate available accelerators and their memory/compute "
                "envelopes.",
            ),
            Highlight(
                title="Hardware-aware tuning",
                body="Map models to the right precision and parallelism per device.",
            ),
            Highlight(
                title="Utilization insights",
                body="Track compute, memory bandwidth, and power draw during runs.",
            ),
        ],
    )
