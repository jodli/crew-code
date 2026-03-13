#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Run compatibility tests against real Claude Code.
#
# Prerequisites:
#   - tmux running
#   - Claude Code installed (claude on PATH)
#   - ANTHROPIC_API_KEY set
#
# Usage:
#   ./scripts/run-compat-tests.sh              # run all compat tests
#   ./scripts/run-compat-tests.sh inbox-response  # run one test (substring match)
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPAT_DIR="$PROJECT_DIR/src/compat"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------

echo -e "${CYAN}=== Crew Compat Tests ===${NC}"
echo ""

# Claude Code version
if command -v claude &>/dev/null; then
  CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
  echo -e "Claude Code version: ${CYAN}${CLAUDE_VERSION}${NC}"
else
  echo -e "${RED}ERROR: claude not found on PATH${NC}"
  exit 1
fi

# tmux check
if ! command -v tmux &>/dev/null; then
  echo -e "${RED}ERROR: tmux not installed${NC}"
  exit 1
fi

if ! tmux list-sessions &>/dev/null; then
  echo -e "${RED}ERROR: tmux server not running (start a session first)${NC}"
  exit 1
fi

echo -e "tmux: ${GREEN}OK${NC}"

# API key check
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo -e "${YELLOW}WARNING: ANTHROPIC_API_KEY not set — tests may fail${NC}"
fi

echo ""

# ---------------------------------------------------------------------------
# Discover and run tests
# ---------------------------------------------------------------------------

FILTER="${1:-}"
PASSED=0
FAILED=0
SKIPPED=0
RESULTS=()

for test_file in "$COMPAT_DIR"/*.compat.ts; do
  test_name="$(basename "$test_file" .compat.ts)"

  # Apply filter if provided
  if [ -n "$FILTER" ] && [[ "$test_name" != *"$FILTER"* ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo -e "${CYAN}--- ${test_name} ---${NC}"

  if bun test "$test_file" 2>&1; then
    echo -e "${GREEN}PASS${NC}: ${test_name}"
    RESULTS+=("${GREEN}PASS${NC} ${test_name}")
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}FAIL${NC}: ${test_name}"
    RESULTS+=("${RED}FAIL${NC} ${test_name}")
    FAILED=$((FAILED + 1))
  fi

  echo ""
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo -e "${CYAN}=== Summary ===${NC}"
echo -e "Claude Code: ${CLAUDE_VERSION}"
echo ""

for r in "${RESULTS[@]}"; do
  echo -e "  $r"
done

echo ""
echo -e "Passed: ${GREEN}${PASSED}${NC}  Failed: ${RED}${FAILED}${NC}  Skipped: ${YELLOW}${SKIPPED}${NC}"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
