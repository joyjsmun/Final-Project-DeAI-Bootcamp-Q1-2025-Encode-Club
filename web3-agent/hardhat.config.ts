import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      // Configuration for the default hardhat network (localhost:8545)
      chainId: 31337, // Standard chain ID for Hardhat Network
    },
  },
};

export default config; 