import { ethers } from "hardhat";
import { getMerkleRoot } from "../merkle/merkle";

async function main() {
  const root = getMerkleRoot();
  const FjordDrop = await ethers.getContractFactory("FjordDrop");
  const fjordDrop = await FjordDrop.deploy(
    "ipfs://QmfHKiJ7o64ALtYv1uhtNLqcKXUqnug4UmwFKx8t3dAkEy/",
    `0x${root}`
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