import { ethers, network } from "hardhat";

async function main() {
  // Ensure we are on a local development network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.error("This script is intended for local Hardhat network only.");
    process.exit(1);
  }

  const [deployer, account1] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account #0 address:", deployer.address);
  console.log("Account #1 address:", account1.address);

  const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");

  // --- Deploy WETH ---
  console.log("\nDeploying WETH...");
  const weth = await SimpleERC20.deploy("Wrapped Ether", "WETH", 18, deployer.address);
  // await weth.deployed(); // deprecated in ethers v6
  await weth.waitForDeployment(); // Use waitForDeployment instead
  const wethAddress = await weth.getAddress();
  console.log("WETH deployed to:", wethAddress);

  // --- Deploy USDC ---
  console.log("\nDeploying USDC...");
  const usdc = await SimpleERC20.deploy("USD Coin", "USDC", 6, deployer.address);
  // await usdc.deployed(); // deprecated in ethers v6
  await usdc.waitForDeployment(); // Use waitForDeployment instead
  const usdcAddress = await usdc.getAddress();
  console.log("USDC deployed to:", usdcAddress);

  // --- Mint Tokens ---
  const wethAmount = ethers.parseUnits("888", 18); // WETH typically has 18 decimals
  const usdcAmount = ethers.parseUnits("88888", 6); // USDC typically has 6 decimals

  console.log(`\nMinting ${ethers.formatUnits(wethAmount, 18)} WETH to Account #0 (${deployer.address})...`);
  let tx = await weth.mint(deployer.address, wethAmount);
  await tx.wait();
  console.log("WETH minted successfully. Transaction hash:", tx.hash);

  console.log(`\nMinting ${ethers.formatUnits(usdcAmount, 6)} USDC to Account #0 (${deployer.address})...`);
  tx = await usdc.mint(deployer.address, usdcAmount);
  await tx.wait();
  console.log("USDC minted successfully. Transaction hash:", tx.hash);

  console.log("\n--- Deployment Summary ---");
  console.log("WETH Contract Address:", wethAddress);
  console.log("USDC Contract Address:", usdcAddress);
  console.log(`Account #0 (${deployer.address}) WETH Balance:`, ethers.formatUnits(await weth.balanceOf(deployer.address), 18));
  console.log(`Account #0 (${deployer.address}) USDC Balance:`, ethers.formatUnits(await usdc.balanceOf(deployer.address), 6));
  console.log("--------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 