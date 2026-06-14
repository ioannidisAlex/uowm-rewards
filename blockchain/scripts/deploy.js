const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network    = await ethers.provider.getNetwork();

  console.log(`\nDeploying UOWMRewards on ${network.name} (chainId: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("Balance: ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const Factory  = await ethers.getContractFactory("UOWMRewards");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ UOWMRewards deployed to:", address);
  console.log("\n─────────────────────────────────────────────");
  console.log("Add these to server/.env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log(`DEPLOYER_PRIVATE_KEY=<your deployer private key>`);
  if (network.name === "sepolia") {
    console.log(`SEPOLIA_RPC_URL=<your Alchemy/Infura Sepolia RPC URL>`);
    console.log(`\nVerify on Etherscan:`);
    console.log(`npx hardhat verify --network sepolia ${address} "${deployer.address}"`);
  }
  if (network.name === "unknown" && network.chainId === 80002n) {
    console.log(`AMOY_RPC_URL=https://rpc-amoy.polygon.technology`);
  }
  console.log("─────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
