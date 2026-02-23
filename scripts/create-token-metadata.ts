/**
 * Script to set on-chain Metaplex metadata for the loyalty token.
 * This calls the `set_token_metadata` instruction in the loyalty program,
 * which CPIs to the Metaplex Token Metadata program.
 *
 * Prerequisites:
 *   1. Validator running with Metaplex cloned:
 *      ./scripts/start-validator.sh
 *   2. Platform initialized:
 *      npx ts-node scripts/setup-platform.ts
 *
 * Run: npx ts-node scripts/create-token-metadata.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ─── Constants ────────────────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("9RkPYyU3tB5X9g2TkBPiZHUrVNRZjwjZ3Eu8LZhK4LXj");
const MPL_TOKEN_METADATA_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const RPC_URL = "http://localhost:8899";

// Token metadata to set
const TOKEN_NAME   = "Loyalty Points";
const TOKEN_SYMBOL = "LP";
const TOKEN_URI    = "";   // optional: IPFS / Arweave JSON URI for extended metadata

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Anchor instruction discriminator: first 8 bytes of sha256("global:<name>") */
function discriminator(name: string): Buffer {
  return Buffer.from(
    crypto.createHash("sha256").update(`global:${name}`).digest()
  ).subarray(0, 8);
}

/** Borsh-encode a UTF-8 string: u32 length prefix + bytes */
function borshString(s: string): Buffer {
  const strBytes = Buffer.from(s, "utf-8");
  const lenBuf   = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBytes.length, 0);
  return Buffer.concat([lenBuf, strBytes]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Load admin keypair from Solana CLI default location
  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log("Admin wallet :", adminKeypair.publicKey.toBase58());
  console.log("Program ID   :", PROGRAM_ID.toBase58());
  console.log("Metaplex ID  :", MPL_TOKEN_METADATA_ID.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");

  const wallet   = new anchor.Wallet(adminKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // ── Derive PDAs ─────────────────────────────────────────────────────────────
  const [platformStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_state")],
    PROGRAM_ID
  );
  const [tokenMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("loyalty_mint")],
    PROGRAM_ID
  );
  // Metaplex metadata PDA: seeds = ["metadata", mpl_program_id, mint]
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      MPL_TOKEN_METADATA_ID.toBuffer(),
      tokenMintPDA.toBuffer(),
    ],
    MPL_TOKEN_METADATA_ID
  );

  console.log("\nPDAs:");
  console.log("  Platform State  :", platformStatePDA.toBase58());
  console.log("  Token Mint      :", tokenMintPDA.toBase58());
  console.log("  Metadata Account:", metadataPDA.toBase58());

  // ── Check platform is initialized ───────────────────────────────────────────
  const platformAccount = await connection.getAccountInfo(platformStatePDA);
  if (!platformAccount) {
    console.error("\n❌ Platform not initialized. Run: npx ts-node scripts/setup-platform.ts");
    process.exit(1);
  }

  // ── Check if metadata already exists ────────────────────────────────────────
  const existingMetadata = await connection.getAccountInfo(metadataPDA);
  if (existingMetadata) {
    console.log("\n✅ Metadata account already exists at", metadataPDA.toBase58());
    console.log("   If you need to update it, the program supports is_mutable=true.");
    // We still proceed so the user can "update" by calling the same instruction
    // (Metaplex allows UpdateMetadata after creation).
  }

  // ── Build instruction data ───────────────────────────────────────────────────
  // Anchor discriminator
  const disc = discriminator("set_token_metadata");

  // Args: name (String), symbol (String), uri (String) — Borsh-encoded
  const args = Buffer.concat([
    borshString(TOKEN_NAME),
    borshString(TOKEN_SYMBOL),
    borshString(TOKEN_URI),
  ]);

  const data = Buffer.concat([disc, args]);

  console.log(`\nSetting metadata: name="${TOKEN_NAME}", symbol="${TOKEN_SYMBOL}", uri="${TOKEN_URI}"`);

  // ── Build instruction ────────────────────────────────────────────────────────
  const setMetadataIx = new anchor.web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: adminKeypair.publicKey,             isSigner: true,  isWritable: true  }, // admin
      { pubkey: platformStatePDA,                   isSigner: false, isWritable: true  }, // platform_state
      { pubkey: tokenMintPDA,                       isSigner: false, isWritable: true  }, // token_mint
      { pubkey: metadataPDA,                        isSigner: false, isWritable: true  }, // metadata_account
      { pubkey: MPL_TOKEN_METADATA_ID,              isSigner: false, isWritable: false }, // token_metadata_program
      { pubkey: SystemProgram.programId,            isSigner: false, isWritable: false }, // system_program
      { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,    isSigner: false, isWritable: false }, // rent
    ],
    data,
  });

  // ── Send & confirm ───────────────────────────────────────────────────────────
  const tx = new anchor.web3.Transaction().add(setMetadataIx);
  try {
    const sig = await provider.sendAndConfirm(tx, [adminKeypair]);
    console.log("\n✅ Token metadata set successfully!");
    console.log("   Transaction:", sig);
    console.log("   Token name  :", TOKEN_NAME);
    console.log("   Token symbol:", TOKEN_SYMBOL);
    console.log("\nThe token will now appear as 'Loyalty Points (LP)' in wallets that\n" +
                "resolve Metaplex metadata (e.g. Backpack, Phantom).");
  } catch (e: any) {
    console.error("\n❌ Failed to set token metadata:", e.message);
    if (e.logs) {
      console.error("\nProgram logs:");
      (e.logs as string[]).forEach((l: string) => console.error(" ", l));
    }
    console.error(
      "\nCommon causes:\n" +
      "  • Validator not running with Metaplex cloned → run ./scripts/start-validator.sh\n" +
      "  • Admin wallet doesn't match platform_state.admin\n" +
      "  • Platform not initialized yet"
    );
    process.exit(1);
  }
}

main().catch(console.error);
