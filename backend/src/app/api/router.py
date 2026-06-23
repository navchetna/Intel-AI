"""Aggregate API router.

This is the single extension point for wiring modules into the app. To add a
new mini-project (module), create a package under ``app.modules.<name>`` that
exposes an ``APIRouter`` named ``router``, then append it to ``MODULES`` below.
Each module owns its own folder, so this file is the *only* shared file two
developers might both touch — keep edits to one line per module to minimise
merge conflicts.
"""

from importlib import import_module

from fastapi import APIRouter

# Register each module here as (import_path, url_prefix, tag).
# Keep this list alphabetised; one line per module.
MODULES: list[tuple[str, str, str]] = [
    ("app.modules.health", "/health", "health"),
    ("app.modules.items", "/items", "items"),
]

api_router = APIRouter()

for module_path, prefix, tag in MODULES:
    module = import_module(f"{module_path}.router")
    api_router.include_router(module.router, prefix=prefix, tags=[tag])


def import_module_models() -> None:
    """Import every module's ``models`` submodule (if present).

    Ensures all ORM models are registered on ``Base.metadata`` before table
    creation. Safe to call multiple times.
    """
    for module_path, _, _ in MODULES:
        try:
            import_module(f"{module_path}.models")
        except ModuleNotFoundError:
            # Module has no persistent models — that's fine.
            continue
