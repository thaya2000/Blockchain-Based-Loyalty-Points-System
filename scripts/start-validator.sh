#!/bin/bash
# start-validator.sh
#
# Usage:
#   ./scripts/start-validator.sh           # simple reset (no Metaplex — for local dev)
#   ./scripts/start-validator.sh --metaplex # with Metaplex (needed for token name in Backpack)
#
# ⚠️  WARNING: --reset wipes all local ledger state.
#    After restarting you must re-run:
#      solana program deploy target/deploy/loyalty_program.so --url http://localhost:8899
#      npx ts-node scripts/setup-platform.ts
#      (optional) npx ts-node scripts/create-token-metadata.ts

set -e

METAPLEX_PROGRAM_ID="metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
METAPLEX_BIN="./scripts/metaplex-metadata.so"

echo "⚠️  Resetting local ledger state..."
echo ""

# ── Simple mode (default) ────────────────────────────────────────────────────
if [ "$1" != "--metaplex" ]; then
  echo "Starting validator (no Metaplex — token name won't show in Backpack)"
  echo "Use './scripts/start-validator.sh --metaplex' to include Metaplex."
  echo ""
  exec solana-test-validator --reset
fi

# ── Metaplex mode ──────────────────────────────────────────────────────────
echo "Starting validator with Metaplex (token name display enabled)..."

RPCS=(
  "https://rpc.ankr.com/solana"
  "https://api.mainnet-beta.solana.com"
)

if [ ! -f "$METAPLEX_BIN" ]; then
  echo "Downloading Metaplex program binary (one-time)..."
  SUCCESS=0
  for RPC in "${RPCS[@]}"; do
    echo "  Trying $RPC ..."
    if solana program dump "$METAPLEX_PROGRAM_ID" "$METAPLEX_BIN" --url "$RPC" 2>/dev/null; then
      echo "  ✅ Downloaded from $RPC"
      SUCCESS=1
      break
    fi
  done
  if [ $SUCCESS -eq 0 ]; then
    echo "❌ Failed to download Metaplex. Run without --metaplex for now."
    exit 1
  fi
else
  echo "✅ Using cached Metaplex binary: $METAPLEX_BIN"
fi

exec solana-test-validator \
  --bpf-program "$METAPLEX_PROGRAM_ID" "$METAPLEX_BIN" \
  --reset
