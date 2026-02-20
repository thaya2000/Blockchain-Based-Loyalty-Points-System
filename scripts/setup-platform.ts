/**
 * Setup script to initialize the loyalty platform and register a merchant.
 * Run: npx ts-node scripts/setup-platform.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const PROGRAM_ID = new PublicKey("9RkPYyU3tB5X9g2TkBPiZHUrVNRZjwjZ3Eu8LZhK4LXj");
const RPC_URL = "http://localhost:8899";

// New admin / protocol treasury wallet (from Backpack)
const PROTOCOL_TREASURY = new PublicKey("CdeqKndivaNcKq36n1wC3pQ1P1reXrcgp2YJ9oAWpDB8");

// Merchant wallet address (from Backpack) — same as new admin for now
const MERCHANT_WALLET = new PublicKey("47KvqWWV6wXBnjeHu3y2jPkTQke7Z3VcE8qwRs7QzdcK");

// Platform config
const TOKEN_DECIMALS = 6;
const MAX_SUPPLY = new anchor.BN(1_000_000_000 * 10 ** TOKEN_DECIMALS); // 1B LP
const BASE_MINT_FEE = new anchor.BN(5000); // 5000 lamports
const FEE_RATE_PER_THOUSAND = new anchor.BN(1000);
const SOL_TO_POINTS_RATIO = new anchor.BN(100); // 1 SOL = 100 LP
const MINT_ALLOWANCE = new anchor.BN(100_000_000 * 10 ** TOKEN_DECIMALS); // 100M LP allowance

async function main() {
  // Load admin keypair
  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log("Admin wallet:", adminKeypair.publicKey.toBase58());
  console.log("Merchant wallet:", MERCHANT_WALLET.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");

  // Set up Anchor provider manually
  const wallet = new anchor.Wallet(adminKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Derive PDAs
  const [platformStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_state")],
    PROGRAM_ID
  );
  const [tokenMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("loyalty_mint")],
    PROGRAM_ID
  );
  const [merchantRecordPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("merchant"), MERCHANT_WALLET.toBuffer()],
    PROGRAM_ID
  );

  console.log("\nPDAs:");
  console.log("  Platform State:", platformStatePDA.toBase58());
  console.log("  Token Mint:", tokenMintPDA.toBase58());
  console.log("  Merchant Record:", merchantRecordPDA.toBase58());

  // Check if platform is already initialized
  const platformAccount = await connection.getAccountInfo(platformStatePDA);

  if (platformAccount) {
    console.log("\n✅ Platform already initialized!");
  } else {
    console.log("\n📦 Initializing platform...");

    // Build initialize_platform instruction manually
    // Anchor discriminator: sha256("global:initialize_platform")[0..8]
    const crypto = require("crypto");
    const initDiscriminator = crypto
      .createHash("sha256")
      .update("global:initialize_platform")
      .digest()
      .slice(0, 8);

    // Serialize args: token_decimals(u8) + max_supply(u64) + base_mint_fee(u64) + fee_rate_per_thousand(u64) + sol_to_points_ratio(u64)
    const argsBuffer = Buffer.alloc(1 + 8 + 8 + 8 + 8);
    let offset = 0;
    argsBuffer.writeUInt8(TOKEN_DECIMALS, offset); offset += 1;
    argsBuffer.writeBigUInt64LE(BigInt(MAX_SUPPLY.toString()), offset); offset += 8;
    argsBuffer.writeBigUInt64LE(BigInt(BASE_MINT_FEE.toString()), offset); offset += 8;
    argsBuffer.writeBigUInt64LE(BigInt(FEE_RATE_PER_THOUSAND.toString()), offset); offset += 8;
    argsBuffer.writeBigUInt64LE(BigInt(SOL_TO_POINTS_RATIO.toString()), offset); offset += 8;

    const data = Buffer.concat([initDiscriminator, argsBuffer]);

    const initIx = new anchor.web3.TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: PROTOCOL_TREASURY, isSigner: false, isWritable: true }, // protocol_treasury = new admin wallet
        { pubkey: platformStatePDA, isSigner: false, isWritable: true },
        { pubkey: tokenMintPDA, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new anchor.web3.Transaction().add(initIx);
    try {
      const sig = await provider.sendAndConfirm(tx);
      console.log("✅ Platform initialized! Tx:", sig);
    } catch (e: any) {
      console.error("❌ Failed to initialize platform:", e.message);
      if (e.logs) console.error("Logs:", e.logs);
      return;
    }
  }

  // Check if merchant is already registered
  const merchantAccount = await connection.getAccountInfo(merchantRecordPDA);

  if (merchantAccount) {
    console.log("✅ Merchant already registered!");
  } else {
    console.log("\n📦 Registering merchant", MERCHANT_WALLET.toBase58(), "...");

    const crypto = require("crypto");
    const regDiscriminator = crypto
      .createHash("sha256")
      .update("global:register_merchant")
      .digest()
      .slice(0, 8);

    // Serialize args: mint_allowance(u64)
    const regArgsBuffer = Buffer.alloc(8);
    regArgsBuffer.writeBigUInt64LE(BigInt(MINT_ALLOWANCE.toString()), 0);

    const regData = Buffer.concat([regDiscriminator, regArgsBuffer]);

    const regIx = new anchor.web3.TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: platformStatePDA, isSigner: false, isWritable: true },
        { pubkey: MERCHANT_WALLET, isSigner: false, isWritable: false },
        { pubkey: merchantRecordPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: regData,
    });

    const tx2 = new anchor.web3.Transaction().add(regIx);
    try {
      const sig2 = await provider.sendAndConfirm(tx2);
      console.log("✅ Merchant registered! Tx:", sig2);
    } catch (e: any) {
      console.error("❌ Failed to register merchant:", e.message);
      if (e.logs) console.error("Logs:", e.logs);
      return;
    }
  }

  console.log("\n🎉 Setup complete! The merchant can now deposit SOL to receive loyalty points.");
  console.log("\nProtocol Treasury:", PROTOCOL_TREASURY.toBase58());
}

main().catch(console.error);
