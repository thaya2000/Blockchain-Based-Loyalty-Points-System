import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { LoyaltyProgram } from "../target/types/loyalty_program";
import { createHash } from "crypto";

describe("loyalty_program", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LoyaltyProgram as Program<LoyaltyProgram>;

  // Test accounts
  const admin = provider.wallet;
  const merchant = Keypair.generate();
  const consumer = Keypair.generate();
  const protocolTreasury = Keypair.generate();

  // PDAs
  let platformStatePDA: PublicKey;
  let platformStateBump: number;
  let tokenMintPDA: PublicKey;
  let merchantRecordPDA: PublicKey;

  // Test constants
  const TOKEN_DECIMALS = 6;
  const MAX_SUPPLY = new anchor.BN(1_000_000_000 * 10 ** TOKEN_DECIMALS);
  const MINT_ALLOWANCE = new anchor.BN(100_000 * 10 ** TOKEN_DECIMALS);
  const MINT_AMOUNT = new anchor.BN(1000 * 10 ** TOKEN_DECIMALS);
  const BASE_MINT_FEE = new anchor.BN(5000); // 5000 lamports
  const FEE_RATE_PER_THOUSAND = new anchor.BN(1000); // 1000 lamports per 1000 points
  const SOL_TO_POINTS_RATIO = new anchor.BN(100); // 1 SOL = 100 loyalty points

  before(async () => {
    // Derive PDAs
    [platformStatePDA, platformStateBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      program.programId
    );

    [tokenMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("loyalty_mint")],
      program.programId
    );

    [merchantRecordPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
      program.programId
    );

    // Fund test accounts
    const airdropMerchant = await provider.connection.requestAirdrop(
      merchant.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropMerchant);

    const airdropConsumer = await provider.connection.requestAirdrop(
      consumer.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropConsumer);
  });

  describe("initialize_platform", () => {
    it("initializes the platform successfully", async () => {
      const tx = await program.methods
        .initializePlatform(
          TOKEN_DECIMALS,
          MAX_SUPPLY,
          BASE_MINT_FEE,
          FEE_RATE_PER_THOUSAND,
          SOL_TO_POINTS_RATIO
        )
        .accounts({
          admin: admin.publicKey,
          protocolTreasury: protocolTreasury.publicKey,
          platformState: platformStatePDA,
          tokenMint: tokenMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log("Initialize platform tx:", tx);

      // Verify platform state
      const platformState = await program.account.platformState.fetch(
        platformStatePDA
      );
      expect(platformState.admin.toBase58()).to.equal(admin.publicKey.toBase58());
      expect(platformState.tokenMint.toBase58()).to.equal(tokenMintPDA.toBase58());
      expect(platformState.protocolTreasury.toBase58()).to.equal(
        protocolTreasury.publicKey.toBase58()
      );
      expect(platformState.maxSupply.toNumber()).to.equal(MAX_SUPPLY.toNumber());
      expect(platformState.currentSupply.toNumber()).to.equal(0);
      expect(platformState.tokenDecimals).to.equal(TOKEN_DECIMALS);
      expect(platformState.merchantCount).to.equal(0);
      expect(platformState.isActive).to.be.true;
      expect(platformState.baseMintFee.toNumber()).to.equal(BASE_MINT_FEE.toNumber());
      expect(platformState.feeRatePerThousand.toNumber()).to.equal(
        FEE_RATE_PER_THOUSAND.toNumber()
      );
      expect(platformState.solToPointsRatio.toNumber()).to.equal(
        SOL_TO_POINTS_RATIO.toNumber()
      );
    });

    it("fails to reinitialize the platform", async () => {
      try {
        await program.methods
          .initializePlatform(
            TOKEN_DECIMALS,
            MAX_SUPPLY,
            BASE_MINT_FEE,
            FEE_RATE_PER_THOUSAND,
            SOL_TO_POINTS_RATIO
          )
          .accounts({
            admin: admin.publicKey,
            protocolTreasury: protocolTreasury.publicKey,
            platformState: platformStatePDA,
            tokenMint: tokenMintPDA,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        // Expected to fail - account already exists
        expect(error).to.exist;
      }
    });
  });

  describe("register_merchant", () => {
    it("registers a merchant successfully", async () => {
      const tx = await program.methods
        .registerMerchant(MINT_ALLOWANCE)
        .accounts({
          admin: admin.publicKey,
          platformState: platformStatePDA,
          merchantWallet: merchant.publicKey,
          merchantRecord: merchantRecordPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Register merchant tx:", tx);

      // Verify merchant record
      const merchantRecord = await program.account.merchantRecord.fetch(
        merchantRecordPDA
      );
      expect(merchantRecord.wallet.toBase58()).to.equal(
        merchant.publicKey.toBase58()
      );
      expect(merchantRecord.isAuthorized).to.be.true;
      expect(merchantRecord.mintAllowance.toNumber()).to.equal(
        MINT_ALLOWANCE.toNumber()
      );
      expect(merchantRecord.totalMinted.toNumber()).to.equal(0);
      expect(merchantRecord.totalRedeemed.toNumber()).to.equal(0);

      // Verify platform state updated
      const platformState = await program.account.platformState.fetch(
        platformStatePDA
      );
      expect(platformState.merchantCount).to.equal(1);
    });

    it("fails when non-admin tries to register merchant", async () => {
      const fakeMerchant = Keypair.generate();
      const [fakeMerchantPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), fakeMerchant.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .registerMerchant(MINT_ALLOWANCE)
          .accounts({
            admin: merchant.publicKey, // Using merchant as fake admin
            platformState: platformStatePDA,
            merchantWallet: fakeMerchant.publicKey,
            merchantRecord: fakeMerchantPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("UnauthorizedAdmin");
      }
    });
  });

  describe("deposit_sol", () => {
    it("merchant deposits SOL and receives loyalty points", async () => {
      const depositAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL); // 0.5 SOL

      const merchantATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        merchant.publicKey
      );

      // Get initial balances
      const initialMerchantSol = await provider.connection.getBalance(
        merchant.publicKey
      );
      const initialTreasurySol = await provider.connection.getBalance(
        protocolTreasury.publicKey
      );

      const tx = await program.methods
        .depositSol(depositAmount)
        .accounts({
          merchant: merchant.publicKey,
          protocolTreasury: protocolTreasury.publicKey,
          platformState: platformStatePDA,
          merchantRecord: merchantRecordPDA,
          tokenMint: tokenMintPDA,
          merchantTokenAccount: merchantATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();

      console.log("Deposit SOL tx:", tx);

      // Expected points: 0.5 SOL * 100 ratio * 10^6 decimals / 10^9 lamports_per_sol
      // = 0.5 * 100 * 1_000_000 / 1_000_000_000 * 1_000_000_000 / 1_000_000_000
      // = 50 * 10^6 = 50_000_000
      const expectedPoints = 50 * 10 ** TOKEN_DECIMALS;

      // Verify merchant received loyalty points
      const tokenAccount = await getAccount(provider.connection, merchantATA);
      expect(Number(tokenAccount.amount)).to.equal(expectedPoints);

      // Verify treasury received SOL
      const finalTreasurySol = await provider.connection.getBalance(
        protocolTreasury.publicKey
      );
      expect(finalTreasurySol - initialTreasurySol).to.equal(
        depositAmount.toNumber()
      );

      // Verify platform supply updated
      const platformState = await program.account.platformState.fetch(
        platformStatePDA
      );
      expect(platformState.currentSupply.toNumber()).to.equal(expectedPoints);

      // Verify merchant record updated
      const merchantRecord = await program.account.merchantRecord.fetch(
        merchantRecordPDA
      );
      expect(merchantRecord.totalMinted.toNumber()).to.equal(expectedPoints);
    });

    it("fails when deposit amount is zero", async () => {
      const merchantATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        merchant.publicKey
      );

      try {
        await program.methods
          .depositSol(new anchor.BN(0))
          .accounts({
            merchant: merchant.publicKey,
            protocolTreasury: protocolTreasury.publicKey,
            platformState: platformStatePDA,
            merchantRecord: merchantRecordPDA,
            tokenMint: tokenMintPDA,
            merchantTokenAccount: merchantATA,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("InsufficientSolDeposit");
      }
    });
  });

  describe("mint_points", () => {
    it("mints points to consumer successfully", async () => {
      const consumerATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        consumer.publicKey
      );

      const tx = await program.methods
        .mintPoints(MINT_AMOUNT, "TEST-PURCHASE-001")
        .accounts({
          merchant: merchant.publicKey,
          protocolTreasury: protocolTreasury.publicKey,
          platformState: platformStatePDA,
          merchantRecord: merchantRecordPDA,
          tokenMint: tokenMintPDA,
          consumer: consumer.publicKey,
          consumerTokenAccount: consumerATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc();

      console.log("Mint points tx:", tx);

      // Verify consumer balance
      const tokenAccount = await getAccount(provider.connection, consumerATA);
      expect(Number(tokenAccount.amount)).to.equal(MINT_AMOUNT.toNumber());
    });

    it("fails when unauthorized wallet tries to mint", async () => {
      const unauthorizedMerchant = Keypair.generate();
      const [unauthorizedMerchantPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), unauthorizedMerchant.publicKey.toBuffer()],
        program.programId
      );

      // Fund the unauthorized merchant
      const airdrop = await provider.connection.requestAirdrop(
        unauthorizedMerchant.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdrop);

      const consumerATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        consumer.publicKey
      );

      try {
        await program.methods
          .mintPoints(MINT_AMOUNT, "UNAUTHORIZED-MINT")
          .accounts({
            merchant: unauthorizedMerchant.publicKey,
            protocolTreasury: protocolTreasury.publicKey,
            platformState: platformStatePDA,
            merchantRecord: unauthorizedMerchantPDA,
            tokenMint: tokenMintPDA,
            consumer: consumer.publicKey,
            consumerTokenAccount: consumerATA,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedMerchant])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        // Expected to fail - merchant not registered
        expect(error).to.exist;
      }
    });
  });

  describe("purchase_product_with_points", () => {
    it("consumer purchases product with loyalty points", async () => {
      const consumerATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        consumer.publicKey
      );

      // Get initial balance
      const initialBalance = await getAccount(provider.connection, consumerATA);
      const initialConsumerBalance = Number(initialBalance.amount);

      // Create a product ID hash
      const productIdHash = createHash("sha256")
        .update("PRODUCT-001")
        .digest();
      const productIdArray = Array.from(productIdHash);

      const pointsToSpend = new anchor.BN(200 * 10 ** TOKEN_DECIMALS); // 200 points

      // Derive purchase record PDA
      const [purchaseRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("purchase"),
          consumer.publicKey.toBuffer(),
          productIdHash,
        ],
        program.programId
      );

      const tx = await program.methods
        .purchaseProductWithPoints(productIdArray, pointsToSpend)
        .accounts({
          customer: consumer.publicKey,
          merchant: merchant.publicKey,
          platformState: platformStatePDA,
          merchantRecord: merchantRecordPDA,
          purchaseRecord: purchaseRecordPDA,
          tokenMint: tokenMintPDA,
          customerTokenAccount: consumerATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([consumer])
        .rpc();

      console.log("Purchase with points tx:", tx);

      // Verify consumer balance decreased (points burned)
      const finalBalance = await getAccount(provider.connection, consumerATA);
      expect(Number(finalBalance.amount)).to.equal(
        initialConsumerBalance - pointsToSpend.toNumber()
      );

      // Verify purchase record created
      const purchaseRecord = await program.account.purchaseRecord.fetch(
        purchaseRecordPDA
      );
      expect(purchaseRecord.customer.toBase58()).to.equal(
        consumer.publicKey.toBase58()
      );
      expect(purchaseRecord.merchant.toBase58()).to.equal(
        merchant.publicKey.toBase58()
      );
      expect(purchaseRecord.paymentType).to.equal(1); // 1 = Loyalty Points
      expect(purchaseRecord.amountPaid.toNumber()).to.equal(
        pointsToSpend.toNumber()
      );
      expect(purchaseRecord.pointsEarned.toNumber()).to.equal(0); // No points earned

      // Verify platform supply decreased (tokens burned)
      const platformState = await program.account.platformState.fetch(
        platformStatePDA
      );
      // Supply should be: deposit_points + mint_points - burned_points
      const expectedSupply =
        50 * 10 ** TOKEN_DECIMALS + // from deposit_sol
        MINT_AMOUNT.toNumber() - // from mint_points
        pointsToSpend.toNumber(); // burned in purchase
      expect(platformState.currentSupply.toNumber()).to.equal(expectedSupply);

      // Verify merchant redeemed count updated
      const merchantRecord = await program.account.merchantRecord.fetch(
        merchantRecordPDA
      );
      expect(merchantRecord.totalRedeemed.toNumber()).to.equal(
        pointsToSpend.toNumber()
      );
    });

    it("fails when consumer has insufficient points", async () => {
      const consumerATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        consumer.publicKey
      );

      const productIdHash = createHash("sha256")
        .update("PRODUCT-EXPENSIVE")
        .digest();
      const productIdArray = Array.from(productIdHash);

      const [purchaseRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("purchase"),
          consumer.publicKey.toBuffer(),
          productIdHash,
        ],
        program.programId
      );

      // Try to spend more points than available
      const excessPoints = new anchor.BN(999_999 * 10 ** TOKEN_DECIMALS);

      try {
        await program.methods
          .purchaseProductWithPoints(productIdArray, excessPoints)
          .accounts({
            customer: consumer.publicKey,
            merchant: merchant.publicKey,
            platformState: platformStatePDA,
            merchantRecord: merchantRecordPDA,
            purchaseRecord: purchaseRecordPDA,
            tokenMint: tokenMintPDA,
            customerTokenAccount: consumerATA,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([consumer])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal(
          "InsufficientPointsBalance"
        );
      }
    });
  });

  describe("redeem_points", () => {
    it("redeems points at merchant successfully", async () => {
      const consumerATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        consumer.publicKey
      );
      const merchantATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        merchant.publicKey
      );

      const redeemAmount = new anchor.BN(100 * 10 ** TOKEN_DECIMALS);

      // Get initial balance
      const initialBalance = await getAccount(provider.connection, consumerATA);
      const initialConsumerBalance = Number(initialBalance.amount);

      const tx = await program.methods
        .redeemPoints(redeemAmount, "REWARD-001")
        .accounts({
          consumer: consumer.publicKey,
          platformState: platformStatePDA,
          merchant: merchant.publicKey,
          merchantRecord: merchantRecordPDA,
          tokenMint: tokenMintPDA,
          consumerTokenAccount: consumerATA,
          merchantTokenAccount: merchantATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([consumer])
        .rpc();

      console.log("Redeem points tx:", tx);

      // Verify consumer balance decreased
      const consumerTokenAccount = await getAccount(
        provider.connection,
        consumerATA
      );
      expect(Number(consumerTokenAccount.amount)).to.equal(
        initialConsumerBalance - redeemAmount.toNumber()
      );

      // Verify merchant received tokens
      const merchantTokenAccount = await getAccount(
        provider.connection,
        merchantATA
      );
      // Merchant already had some tokens from deposit_sol
      expect(Number(merchantTokenAccount.amount)).to.be.greaterThan(0);
    });

    it("fails when consumer has insufficient balance", async () => {
      const consumerATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        consumer.publicKey
      );
      const merchantATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        merchant.publicKey
      );

      // Try to redeem more than available
      const excessAmount = new anchor.BN(1_000_000 * 10 ** TOKEN_DECIMALS);

      try {
        await program.methods
          .redeemPoints(excessAmount, "EXCESS-REDEEM")
          .accounts({
            consumer: consumer.publicKey,
            platformState: platformStatePDA,
            merchant: merchant.publicKey,
            merchantRecord: merchantRecordPDA,
            tokenMint: tokenMintPDA,
            consumerTokenAccount: consumerATA,
            merchantTokenAccount: merchantATA,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([consumer])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("InsufficientBalance");
      }
    });
  });

  describe("revoke_merchant", () => {
    it("revokes merchant authorization successfully", async () => {
      const tx = await program.methods
        .revokeMerchant()
        .accounts({
          admin: admin.publicKey,
          platformState: platformStatePDA,
          merchantWallet: merchant.publicKey,
          merchantRecord: merchantRecordPDA,
        })
        .rpc();

      console.log("Revoke merchant tx:", tx);

      // Verify merchant is no longer authorized
      const merchantRecord = await program.account.merchantRecord.fetch(
        merchantRecordPDA
      );
      expect(merchantRecord.isAuthorized).to.be.false;

      // Verify platform state updated
      const platformState = await program.account.platformState.fetch(
        platformStatePDA
      );
      expect(platformState.merchantCount).to.equal(0);
    });

    it("revoked merchant cannot mint points", async () => {
      const consumerATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        consumer.publicKey
      );

      try {
        await program.methods
          .mintPoints(MINT_AMOUNT, "SHOULD-FAIL")
          .accounts({
            merchant: merchant.publicKey,
            protocolTreasury: protocolTreasury.publicKey,
            platformState: platformStatePDA,
            merchantRecord: merchantRecordPDA,
            tokenMint: tokenMintPDA,
            consumer: consumer.publicKey,
            consumerTokenAccount: consumerATA,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("UnauthorizedMerchant");
      }
    });

    it("revoked merchant cannot deposit SOL", async () => {
      const merchantATA = await getAssociatedTokenAddress(
        tokenMintPDA,
        merchant.publicKey
      );

      try {
        await program.methods
          .depositSol(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
          .accounts({
            merchant: merchant.publicKey,
            protocolTreasury: protocolTreasury.publicKey,
            platformState: platformStatePDA,
            merchantRecord: merchantRecordPDA,
            tokenMint: tokenMintPDA,
            merchantTokenAccount: merchantATA,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("UnauthorizedMerchant");
      }
    });
  });
});
