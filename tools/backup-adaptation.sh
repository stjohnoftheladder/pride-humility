#!/usr/bin/env bash
# Back up adaptation/ to the private repo whose git database is .adaptation-git
# (Desktop-48 only). Media and logs go through Git LFS. Safe to run any time.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
G=(git --git-dir="$ROOT/.adaptation-git" --work-tree="$ROOT/adaptation")
cd "$ROOT/adaptation"
"${G[@]}" add -A
if "${G[@]}" diff --cached --quiet; then echo "adaptation backup: nothing new"; else
  "${G[@]}" commit -q -m "Back up adaptation/ ($(date +%Y-%m-%d))"; fi
TOKEN="$(gh auth token -u markabella)"
"${G[@]}" -c credential.helper= -c "credential.helper=!f() { echo username=markabella; echo password=$TOKEN; }; f" push -q origin main
echo "adaptation backup: pushed $("${G[@]}" log --oneline -1)"
