#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

export PATH="${HOME}/.bun/bin:${PATH}"

run_tsx() {
  cd "$BACKEND_DIR"
  if command -v bun >/dev/null 2>&1; then
    bunx tsx scripts/createSuperAdmin.ts "$@"
  else
    npx tsx scripts/createSuperAdmin.ts "$@"
  fi
}

CHECK_JSON="$(run_tsx --check)"
EXISTS="$(printf '%s' "$CHECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(d.exists ? 'yes' : 'no')")"

if [[ "$EXISTS" == "yes" ]]; then
  EXISTING_EMAIL="$(printf '%s' "$CHECK_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(d.email || '')")"
  echo "Super admin already exists: ${EXISTING_EMAIL}"
  echo "This run will only update the password."

  read -r -s -p "New password: " PASSWORD
  echo
  if [[ -z "${PASSWORD}" ]]; then
    echo "Password is required" >&2
    exit 1
  fi

  read -r -s -p "Confirm password: " PASSWORD_CONFIRM
  echo
  if [[ "${PASSWORD}" != "${PASSWORD_CONFIRM}" ]]; then
    echo "Passwords do not match" >&2
    exit 1
  fi

  run_tsx --password "$PASSWORD"
  echo "Super admin password updated. Closing terminal."
  sleep 0.4
  kill -s TERM "${PPID}" 2>/dev/null || kill -9 "${PPID}" 2>/dev/null || true
  exit 0
else
  read -r -p "Super admin email: " EMAIL
  if [[ -z "${EMAIL}" ]]; then
    echo "Email is required" >&2
    exit 1
  fi

  read -r -s -p "Super admin password: " PASSWORD
  echo
  if [[ -z "${PASSWORD}" ]]; then
    echo "Password is required" >&2
    exit 1
  fi

  read -r -s -p "Confirm password: " PASSWORD_CONFIRM
  echo
  if [[ "${PASSWORD}" != "${PASSWORD_CONFIRM}" ]]; then
    echo "Passwords do not match" >&2
    exit 1
  fi

  read -r -p "Name [Super Admin]: " NAME
  NAME="${NAME:-Super Admin}"

  run_tsx --email "$EMAIL" --password "$PASSWORD" --name "$NAME"
  echo "Super admin created. Closing terminal."
  sleep 0.4
  kill -s TERM "${PPID}" 2>/dev/null || kill -9 "${PPID}" 2>/dev/null || true
  exit 0
fi

sleep 0.4
kill -s TERM "${PPID}" 2>/dev/null || kill -9 "${PPID}" 2>/dev/null || true
exit 0
