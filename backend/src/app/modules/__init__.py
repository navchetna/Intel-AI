"""Backend feature modules (mini-projects).

Each subpackage is a self-contained module owned by a developer/team. A module
typically contains:

- ``router.py``   — an ``APIRouter`` named ``router`` (required)
- ``schemas.py``  — Pydantic request/response models
- ``service.py``  — business logic
- ``models.py``   — SQLAlchemy ORM models (optional, only if it persists data)

Register a module in ``app.api.router.MODULES``.
"""
