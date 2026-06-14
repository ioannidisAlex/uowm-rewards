require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const RPC_SEPOLIA = process.env.SEPOLIA_RPC_URL || "";
const RPC_AMOY    = process.env.AMOY_RPC_URL    || "";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const accounts    = PRIVATE_KEY ? [PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    ...(RPC_AMOY    ? { amoy:    { url: RPC_AMOY,    accounts, chainId: 80002    } } : {}),
    ...(RPC_SEPOLIA ? { sepolia: { url: RPC_SEPOLIA, accounts, chainId: 11155111 } } : {}),
  },
  etherscan: {
    apiKey: {
      sepolia:     process.env.ETHERSCAN_API_KEY    || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY  || "",
    },
  },
};
