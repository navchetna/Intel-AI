# Intel-AI — developer task runner
# Usage: make <target>   (run `make help` to list targets)

BACKEND  := backend
FRONTEND := frontend

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

## ---- Setup ----
.PHONY: install
install: install-backend install-frontend ## Install all dependencies

.PHONY: install-backend
install-backend: ## Install backend deps (uv)
	cd $(BACKEND) && uv sync --extra dev

.PHONY: install-frontend
install-frontend: ## Install frontend deps (npm)
	cd $(FRONTEND) && npm install

## ---- Dev ----
BACKEND_PORT  ?= 8040
FRONTEND_PORT ?= 3007
DB_PORT       ?= 5436

.PHONY: dev-db
dev-db: ## Run the Postgres dev database (override port: make dev-db DB_PORT=5433)
	DB_PORT=$(DB_PORT) docker compose up db

.PHONY: dev-backend
dev-backend: ## Run backend dev server (override port: make dev-backend BACKEND_PORT=8001 DB_PORT=5436)
	cd $(BACKEND) && PORT=$(BACKEND_PORT) DB_PORT=$(DB_PORT) uv run uvicorn app.main:app --reload --app-dir src --port $(BACKEND_PORT)

.PHONY: dev-frontend
dev-frontend: ## Run frontend dev server (override port: make dev-frontend FRONTEND_PORT=3001)
	cd $(FRONTEND) && NEXT_PUBLIC_BASE_PATH="" NEXT_PUBLIC_API_BASE_URL=http://localhost:$(BACKEND_PORT) npm run dev -- -p $(FRONTEND_PORT)

## ---- Quality ----
.PHONY: lint
lint: lint-backend lint-frontend ## Lint everything

.PHONY: lint-backend
lint-backend: ## Ruff lint backend
	cd $(BACKEND) && uv run ruff check .

.PHONY: lint-frontend
lint-frontend: ## Lint + typecheck frontend
	cd $(FRONTEND) && npm run lint && npm run typecheck

.PHONY: format
format: ## Auto-format backend (ruff)
	cd $(BACKEND) && uv run ruff format . && uv run ruff check --fix .

.PHONY: test
test: ## Run backend test suite
	cd $(BACKEND) && uv run pytest

## ---- Database ----
.PHONY: migrate
migrate: ## Apply Alembic migrations
	cd $(BACKEND) && uv run alembic upgrade head

.PHONY: migrate-down
migrate-down: ## Roll back the last Alembic migration
	cd $(BACKEND) && uv run alembic downgrade -1

.PHONY: migration
migration: ## Create a migration (make migration m="message")
	cd $(BACKEND) && uv run alembic revision --autogenerate -m "$(m)"

.PHONY: db-current
db-current: ## Show the current DB revision
	cd $(BACKEND) && uv run alembic current

.PHONY: db-history
db-history: ## List the Alembic revision history
	cd $(BACKEND) && uv run alembic history --verbose

## ---- Docker ----
.PHONY: build
build: ## Build all docker images
	docker compose build

.PHONY: up
up: ## Start the full stack (detached)
	docker compose up -d

.PHONY: down
down: ## Stop the stack
	docker compose down

.PHONY: logs
logs: ## Tail stack logs
	docker compose logs -f

.PHONY: clean
clean: ## Remove build artifacts and volumes
	docker compose down -v --remove-orphans
	rm -rf $(BACKEND)/.venv $(BACKEND)/.pytest_cache $(FRONTEND)/node_modules $(FRONTEND)/.next
