#!/usr/bin/env bash
# Enforce a DCO Signed-off-by line in the commit message.
# Used as a pre-commit `commit-msg` stage hook. Add the trailer with `git commit -s`.
set -euo pipefail

msg_file="$1"

if grep -qE '^Signed-off-by: .+ <.+@.+>$' "$msg_file"; then
  exit 0
fi

cat >&2 <<'EOF'
✖ Missing "Signed-off-by" trailer (DCO).

Commit your change with sign-off:
    git commit -s

Or amend the current message:
    git commit -s --amend
EOF
exit 1
