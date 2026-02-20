const hre = require("hardhat");

async function main() {
  console.log("Deploying Loyalty Platform contracts...");

  // Get deployer account
  const [deployer, treasury] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    (await hre.ethers.provider.getBalance(deployer.address)).toString(),
  );

  // Deployment parameters
  const TOKEN_NAME = "Loyalty Points";
  const TOKEN_SYMBOL = "LOYAL";
  const MAX_SUPPLY = hre.ethers.parseEther("1000000000"); // 1 billion tokens
  const BASE_MINT_FEE = hre.ethers.parseEther("0.0001"); // 0.0001 ETH base fee
  const FEE_RATE_PER_THOUSAND = hre.ethers.parseEther("0.00001"); // 0.00001 ETH per 1000 points
  const ETH_TO_POINTS_RATIO = 100; // 1 ETH = 100 points
  const PROTOCOL_TREASURY = treasury ? treasury.address : deployer.address;

  // Deploy LoyaltyPlatform (which deploys LoyaltyToken internally)
  const LoyaltyPlatform =
    await hre.ethers.getContractFactory("LoyaltyPlatform");
  const platform = await LoyaltyPlatform.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    MAX_SUPPLY,
    BASE_MINT_FEE,
    FEE_RATE_PER_THOUSAND,
    ETH_TO_POINTS_RATIO,
    PROTOCOL_TREASURY,
  );

  await platform.waitForDeployment();
  const platformAddress = await platform.getAddress();

  console.log("\n✅ LoyaltyPlatform deployed to:", platformAddress);

  // Get the token address
  const tokenAddress = await platform.loyaltyToken();
  console.log("✅ LoyaltyToken deployed to:", tokenAddress);
  console.log("✅ Protocol Treasury:", PROTOCOL_TREASURY);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    platform: platformAddress,
    token: tokenAddress,
    treasury: PROTOCOL_TREASURY,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    parameters: {
      tokenName: TOKEN_NAME,
      tokenSymbol: TOKEN_SYMBOL,
      maxSupply: MAX_SUPPLY.toString(),
      baseMintFee: BASE_MINT_FEE.toString(),
      feeRatePerThousand: FEE_RATE_PER_THOUSAND.toString(),
      ethToPointsRatio: ETH_TO_POINTS_RATIO,
    },
  };

  const fs = require("fs");
  const deploymentPath = `./deployments/${hre.network.name}-deployment.json`;

  // Create deployments directory if it doesn't exist
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📝 Deployment info saved to:", deploymentPath);

  // Verify on Etherscan (if not localhost)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n⏳ Waiting for block confirmations...");
    await platform.deploymentTransaction().wait(6);

    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: platformAddress,
        constructorArguments: [
          TOKEN_NAME,
          TOKEN_SYMBOL,
          MAX_SUPPLY,
          BASE_MINT_FEE,
          FEE_RATE_PER_THOUSAND,
          ETH_TO_POINTS_RATIO,
          PROTOCOL_TREASURY,
        ],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
