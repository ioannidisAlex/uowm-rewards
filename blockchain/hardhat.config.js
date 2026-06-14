require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });

const RPC_SEPOLIA  = process.env.SEPOLIA_RPC_URL  || "";
const RPC_AMOY     = process.env.AMOY_RPC_URL     || "https://rpc-amoy.polygon.technology";
const PRIVATE_KEY  = process.env.DEPLOYER_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // spin up locally: npm run node
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Ethereum testnet — free ETH from sepoliafaucet.com
    sepolia: {
      url: RPC_SEPOLIA,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    // Polygon testnet — free MATIC from faucet.polygon.technology
    amoy: {
      url: RPC_AMOY,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};
