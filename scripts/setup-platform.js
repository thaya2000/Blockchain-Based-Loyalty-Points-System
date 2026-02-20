/**
 * Setup script to initialize the loyalty platform and register a merchant.
 * Run: node scripts/setup-platform.js
 */
const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram, Connection, SYSVAR_RENT_PUBKEY, TransactionInstruction, Transaction } = require("@solana/web3.js");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

// Hardcoded well-known SPL Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const PROGRAM_ID = new PublicKey("9RkPYyU3tB5X9g2TkBPiZHUrVNRZjwjZ3Eu8LZhK4LXj");
const RPC_URL = "http://localhost:8899";

// New admin / protocol treasury wallet (from Backpack)
const PROTOCOL_TREASURY = new PublicKey("CdeqKndivaNcKq36n1wC3pQ1P1reXrcgp2YJ9oAWpDB8");

// Merchant wallet address (from Backpack)
const MERCHANT_WALLET = new PublicKey("47KvqWWV6wXBnjeHu3y2jPkTQke7Z3VcE8qwRs7QzdcK");

// Platform config
const TOKEN_DECIMALS = 6;
const MAX_SUPPLY = BigInt(1_000_000_000) * BigInt(10 ** TOKEN_DECIMALS);
const BASE_MINT_FEE = BigInt(5000);
const FEE_RATE_PER_THOUSAND = BigInt(1000);
const SOL_TO_POINTS_RATIO = BigInt(100);
const MINT_ALLOWANCE = BigInt(100_000_000) * BigInt(10 ** TOKEN_DECIMALS);

async function main() {
  // Load admin keypair
  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log("Admin wallet:", adminKeypair.publicKey.toBase58());
  console.log("Merchant wallet:", MERCHANT_WALLET.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");
  const adminBalance = await connection.getBalance(adminKeypair.publicKey);
  console.log("Admin balance:", adminBalance / 1e9, "SOL");

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

  // ========================================
  // Step 1: Initialize Platform
  // ========================================
  const platformAccount = await connection.getAccountInfo(platformStatePDA);

  if (platformAccount) {
    console.log("\n✅ Platform already initialized!");
  } else {
    console.log("\n📦 Initializing platform...");

    // Anchor discriminator: sha256("global:initialize_platform")[0..8]
    const initDiscriminator = crypto
      .createHash("sha256")
      .update("global:initialize_platform")
      .digest()
      .slice(0, 8);

    // Serialize: token_decimals(u8) + max_supply(u64LE) + base_mint_fee(u64LE) + fee_rate(u64LE) + ratio(u64LE)
    const argsBuffer = Buffer.alloc(1 + 8 + 8 + 8 + 8);
    let offset = 0;
    argsBuffer.writeUInt8(TOKEN_DECIMALS, offset); offset += 1;
    argsBuffer.writeBigUInt64LE(MAX_SUPPLY, offset); offset += 8;
    argsBuffer.writeBigUInt64LE(BASE_MINT_FEE, offset); offset += 8;
    argsBuffer.writeBigUInt64LE(FEE_RATE_PER_THOUSAND, offset); offset += 8;
    argsBuffer.writeBigUInt64LE(SOL_TO_POINTS_RATIO, offset); offset += 8;

    const data = Buffer.concat([initDiscriminator, argsBuffer]);

    const initIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },   // admin
        { pubkey: PROTOCOL_TREASURY, isSigner: false, isWritable: true },        // protocol_treasury
        { pubkey: platformStatePDA, isSigner: false, isWritable: true },         // platform_state
        { pubkey: tokenMintPDA, isSigner: false, isWritable: true },             // token_mint
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },        // token_program
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },      // rent
      ],
      data,
    });

    const tx = new Transaction().add(initIx);
    tx.feePayer = adminKeypair.publicKey;
    const blockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash.blockhash;
    tx.sign(adminKeypair);

    try {
      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      console.log("✅ Platform initialized! Tx:", sig);
    } catch (e) {
      console.error("❌ Failed to initialize platform:", e.message);
      if (e.logs) console.error("Logs:", e.logs);
      return;
    }
  }

  // ========================================
  // Step 2: Register Merchant
  // ========================================
  const merchantAccount = await connection.getAccountInfo(merchantRecordPDA);

  if (merchantAccount) {
    console.log("✅ Merchant already registered!");
  } else {
    console.log("\n📦 Registering merchant", MERCHANT_WALLET.toBase58(), "...");

    const regDiscriminator = crypto
      .createHash("sha256")
      .update("global:register_merchant")
      .digest()
      .slice(0, 8);

    const regArgsBuffer = Buffer.alloc(8);
    regArgsBuffer.writeBigUInt64LE(MINT_ALLOWANCE, 0);

    const regData = Buffer.concat([regDiscriminator, regArgsBuffer]);

    const regIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },   // admin
        { pubkey: platformStatePDA, isSigner: false, isWritable: true },         // platform_state
        { pubkey: MERCHANT_WALLET, isSigner: false, isWritable: false },         // merchant_wallet
        { pubkey: merchantRecordPDA, isSigner: false, isWritable: true },        // merchant_record
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: regData,
    });

    const tx2 = new Transaction().add(regIx);
    tx2.feePayer = adminKeypair.publicKey;
    const blockhash2 = await connection.getLatestBlockhash();
    tx2.recentBlockhash = blockhash2.blockhash;
    tx2.sign(adminKeypair);

    try {
      const sig2 = await connection.sendRawTransaction(tx2.serialize());
      await connection.confirmTransaction(sig2, "confirmed");
      console.log("✅ Merchant registered! Tx:", sig2);
    } catch (e) {
      console.error("❌ Failed to register merchant:", e.message);
      if (e.logs) console.error("Logs:", e.logs);
      return;
    }
  }

  console.log("\n🎉 Setup complete!");
  console.log("Protocol Treasury:", PROTOCOL_TREASURY.toBase58());
  console.log("The merchant can now deposit SOL to receive loyalty points.");
}

main().catch(console.error);
