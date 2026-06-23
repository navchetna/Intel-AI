# Contributing

Full guidelines live in [docs/contributing.md](../docs/contributing.md) and
[docs/workflow.md](../docs/workflow.md). Quick summary:

1. Branch off `main`: `feature/<module>-<short-desc>`. Keep PRs scoped to one module.
2. Install hooks once: `pre-commit install --hook-type pre-commit --hook-type commit-msg`.
3. `make lint && make test` must pass.
4. **Sign off every commit** with the DCO: `git commit -s` (adds a
   `Signed-off-by` line). The commit-msg hook rejects commits without it.
5. Update `docs/` when behavior changes (use the `write-docs` skill).
6. Open a PR (the template loads automatically) and trigger CI manually from the
   Actions tab.
