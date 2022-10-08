import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "dotenv/config";

// const MAINNET_RPC_URL =
//   process.env.MAINNET_RPC_URL ||
//   process.env.ALCHEMY_MAINNET_RPC_URL ||
//   "https://eth-mainnet.alchemyapi.io/v2/your-api-key";
const ROPSTEN_RPC_URL =
  process.env.ROPSTEN_RPC_URL ||
  "https://eth-ropsten.alchemyapi.io/v2/your-api-key";
const GOERLI_RPC_URL =
  process.env.GOERLI_RPC_URL ||
  "https://eth-goerli.alchemyapi.io/v2/your-api-key";
// const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x";
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY || "0x";
const ROPSTEN_PRIVATE_KEY = process.env.ROPSTEN_PRIVATE_KEY || "0x";
// const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x";
const ETHERSCAN_API_KEY =
  process.env.ETHERSCAN_API_KEY || "Your etherscan API key";
const REPORT_GAS = process.env.REPORT_GAS || false;

const config: HardhatUserConfig = {
  solidity: "0.8.14",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
    },
    goerli: {
      chainId: 5,
      url: GOERLI_RPC_URL,
      accounts: GOERLI_PRIVATE_KEY !== undefined ? [GOERLI_PRIVATE_KEY] : [],
    },
    ropsten: {
      url: ROPSTEN_RPC_URL,
      chainId: 3,
      accounts: ROPSTEN_PRIVATE_KEY !== undefined ? [ROPSTEN_PRIVATE_KEY] : [],
    },
    // mainnet: {
    //   url: MAINNET_RPC_URL,
    //   accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    //   chainId: 1,
    // },
  },
  etherscan: {
    // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
    apiKey: {
      rinkeby: ETHERSCAN_API_KEY,
      ropsten: ETHERSCAN_API_KEY,
      mainnet: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
};

export default config;
