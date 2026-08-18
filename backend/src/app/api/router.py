"""Aggregate API router.

Single extension point for wiring subprojects into the app. Each subproject is a
self-contained package under ``app.<name>`` exposing an ``APIRouter`` named
``router``. Register it in ``DOMAINS`` below — this is the only shared file two
developers might both touch, so keep edits to one line per subproject to
minimise merge conflicts.
"""

from importlib import import_module

from fastapi import APIRouter

# Register each subproject here as (import_path, url_prefix, tag).
# Keep this list alphabetised; one line per subproject.
DOMAINS: list[tuple[str, str, str]] = [
    ("app.agent_suggestions", "/agent-suggestions", "agent-suggestions"),
    ("app.agentic_stack", "/agentic-stack", "agentic-stack"),
    ("app.app_settings", "/app-settings", "app-settings"),
    ("app.health", "/health", "health"),
    ("app.inference_benchmarks", "/inference-benchmarks", "inference-benchmarks"),
    ("app.intel_bluelens", "/intel-bluelens", "intel-bluelens"),
    ("app.llm_bench", "/llm-bench", "llm-bench"),
    ("app.model_defaults", "/model-defaults", "model-defaults"),
    ("app.projects", "/projects", "projects"),
    ("app.serving_engines", "/serving-engines", "serving-engines"),
    ("app.silicon", "/silicon", "silicon"),
    ("app.visits", "/visits", "visits"),
]

api_router = APIRouter()

for module_path, prefix, tag in DOMAINS:
    module = import_module(f"{module_path}.router")
    api_router.include_router(module.router, prefix=prefix, tags=[tag])


def import_domain_models() -> None:
    """Import every domain's ``models`` submodule (if present).

    Ensures all ORM models are registered on ``Base.metadata`` before table
    creation. Safe to call multiple times.
    """
    for module_path, _, _ in DOMAINS:
        try:
            import_module(f"{module_path}.models")
        except ModuleNotFoundError:
            # Module has no persistent models — that's fine.
            continue
