#!/usr/bin/env bash
# Run every test in this directory in sequence and report a summary.
# Exits 0 only if all tests pass.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Use a portable path to tput that works on Linux + macOS.
if command -v tput >/dev/null 2>&1 && [ -t 1 ]; then
  GREEN=$(tput setaf 2)
  RED=$(tput setaf 1)
  BLUE=$(tput setaf 4)
  BOLD=$(tput bold)
  RESET=$(tput sgr0)
else
  GREEN=""
  RED=""
  BLUE=""
  BOLD=""
  RESET=""
fi

shopt -s nullglob
test_files=("$SCRIPT_DIR"/test-*.sh)
shopt -u nullglob

if [ ${#test_files[@]} -eq 0 ]; then
  echo "${RED}No test files found in $SCRIPT_DIR${RESET}" >&2
  exit 2
fi

passed=0
failed=0
failed_names=()

for test_file in "${test_files[@]}"; do
  name=$(basename "$test_file" .sh)
  echo
  echo "${BLUE}${BOLD}==> ${name}${RESET}"
  if bash "$test_file"; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
    failed_names+=("$name")
  fi
done

echo
echo "${BLUE}${BOLD}================================================${RESET}"
if [ "$failed" -eq 0 ]; then
  echo "${GREEN}${BOLD}All tests passed:${RESET} $passed/$((passed + failed))"
  exit 0
fi

echo "${RED}${BOLD}Some tests failed:${RESET} $failed/$((passed + failed))"
for name in "${failed_names[@]}"; do
  echo "  ${RED}- $name${RESET}"
done
exit 1
