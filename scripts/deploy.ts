import { ethers } from "hardhat";

async function main() {
  const FjordDrop = await ethers.getContractFactory("HellHouse");
  const fjordDrop = await FjordDrop.deploy(
    "ipfs://QmUa6D2gDfwSKQybHWYc8ts8bd6nPuQAx6ZUwHdF3ivMBh/"
  );

  await fjordDrop.deployed();
  console.log(`FjordDrop deployed to ${fjordDrop.address}`);
  const receipt = await fjordDrop.deployTransaction.wait();
  console.log("gasUsed fjordDrop", receipt.gasUsed._hex);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
