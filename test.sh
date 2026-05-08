#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 0 && "$1" != -* ]]; then
  extension="$1"
  shift
  exec bun test "extensions/${extension}" "$@"
fi

exec bun test "$@"
