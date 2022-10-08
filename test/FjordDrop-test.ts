import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";

describe("FjordDrop", function () {
  async function deployFjordDrop() {
    //Price for whitelisted NFTs
    let oneNFTPrice = ethers.utils.parseEther("0.02");
    let twoNFTsPrice = ethers.utils.parseEther("0.04");
    let threeNFTsPrice = ethers.utils.parseEther("0.06");
    let fourNFTsPrice = ethers.utils.parseEther("0.08");
    let twelveNFTsPrice = ethers.utils.parseEther("0.24");
    let sevenSevenEightNFTsPrice = ethers.utils.parseEther("15.56");
    const [owner, acc2, acc3, acc4, notWLAcc, mainnetFjordAddress] =
      await ethers.getSigners();
    const FjordDrop = await ethers.getContractFactory("HellHouse");
    const fjordDrop = await FjordDrop.deploy(
      "ipfs://Qmag7Hgh3C2igYajdYFtLgE132yjEgwjAda4x4HBXj8tNv/"
    );

    return {
      fjordDrop,
      owner,
      acc2,
      acc3,
      acc4,
      notWLAcc,
      oneNFTPrice,
      twoNFTsPrice,
      threeNFTsPrice,
      fourNFTsPrice,
      twelveNFTsPrice,
      mainnetFjordAddress,
      sevenSevenEightNFTsPrice,
    };
  }
  //DUMMY ERC20 CONTRACT
  async function deployErc20Dummy() {
    const [owner, user] = await ethers.getSigners();
    const ERC20Dummy = await ethers.getContractFactory("ERC20Dummy");
    const erc20Dummy = await ERC20Dummy.deploy(
      "Main Token",
      "MTKN",
      owner.address,
      100
    );
    await erc20Dummy.deployed();
    return {
      erc20Dummy,
      owner,
      user,
    };
  }

  describe("Deployment", function () {
    it("Should deploy and set the right customBaseURI", async function () {
      const { fjordDrop } = await loadFixture(deployFjordDrop);
      expect(await fjordDrop.customBaseURI()).to.equal(
        "ipfs://Qmag7Hgh3C2igYajdYFtLgE132yjEgwjAda4x4HBXj8tNv/"
      );
    });
    it("Should have the right contractURI", async function () {
      const { fjordDrop } = await loadFixture(deployFjordDrop);
      expect(await fjordDrop.contractURI()).to.equal(
        "ipfs://QmZvf1ZS2nnFh6sj8G61TmzLetvB82458SXU1TCNqLZD6u"
      );
    });

    it("Should start the mintCounter at 0", async function () {
      const { fjordDrop } = await loadFixture(deployFjordDrop);
      expect(await fjordDrop.mintCounter()).to.equal(0);
    });

    it("Should set the right owner", async function () {
      const { fjordDrop, owner } = await loadFixture(deployFjordDrop);
      expect(await fjordDrop.owner()).to.equal(owner.address);
    });
  });
  describe("Minting", function () {
    describe("Minting via Fjord", function () {
      it("Should revert mint stage is INACTIVE", async function () {
        const { fjordDrop, acc2 } = await loadFixture(deployFjordDrop);
        await expect(fjordDrop.connect(acc2).mint()).to.be.revertedWith(
          "Fjord drop is not active"
        );
      });
      it("Should mint one NFT via Fjord's contract", async function () {
        //just used to impersonate Fjord
        const { fjordDrop, mainnetFjordAddress } = await loadFixture(
          deployFjordDrop
        );
        await fjordDrop.setMintStage(1);
        //given
        const { erc20Dummy } = await loadFixture(deployErc20Dummy);
        await fjordDrop.setErc20TokenAddress(erc20Dummy.address);
        await erc20Dummy.transfer(mainnetFjordAddress.address, 1);
        await erc20Dummy
          .connect(mainnetFjordAddress)
          .approve(fjordDrop.address, 1);
        //user has erc20 tokens
        expect(
          await erc20Dummy.balanceOf(mainnetFjordAddress.address)
        ).to.equal(1);
        await fjordDrop.connect(mainnetFjordAddress).mint();
        expect(
          await erc20Dummy.balanceOf(mainnetFjordAddress.address)
        ).to.equal(0);
      });
    });
  });
  describe("Public Mint", function () {
    it("Reverts if isPublicMint is false", async function () {
      const { fjordDrop, acc2, oneNFTPrice } = await loadFixture(
        deployFjordDrop
      );
      await expect(
        fjordDrop.connect(acc2).publicMint(1, {
          value: oneNFTPrice,
        })
      ).to.be.revertedWith("Public Mint is disabled");
    });
    it("Reverts if amount is insufficient", async function () {
      const { fjordDrop, acc2, oneNFTPrice, threeNFTsPrice } =
        await loadFixture(deployFjordDrop);
      await fjordDrop.setMintStage(2);
      await fjordDrop.setPublicMintPrice(threeNFTsPrice);
      await expect(
        fjordDrop.connect(acc2).publicMint(1, {
          value: oneNFTPrice,
        })
      ).to.be.revertedWith("FJORD_InexactPayment()");
    });
    it("Mints 1", async function () {
      const { fjordDrop, acc2, oneNFTPrice } = await loadFixture(
        deployFjordDrop
      );
      await fjordDrop.setMintStage(2);
      await fjordDrop.setPublicMintPrice(oneNFTPrice);
      await expect(
        fjordDrop.connect(acc2).publicMint(1, {
          value: oneNFTPrice,
        })
      )
        .to.emit(fjordDrop, "MintedAnNFT")
        .withArgs(acc2.address, 1);
      expect(await fjordDrop.balanceOf(acc2.address)).to.equal(1);
    });
    it("Mints 12", async function () {
      const { fjordDrop, acc2, twelveNFTsPrice } = await loadFixture(
        deployFjordDrop
      );
      await fjordDrop.setMintStage(2);
      await expect(
        fjordDrop.connect(acc2).publicMint(12, {
          value: twelveNFTsPrice,
        })
      )
        .to.emit(fjordDrop, "MintedAnNFT")
        .withArgs(acc2.address, 1);
      expect(await fjordDrop.balanceOf(acc2.address)).to.equal(12);
    });
    it("Reverts if exceeds max", async function () {
      const { fjordDrop, acc2, sevenSevenEightNFTsPrice } = await loadFixture(
        deployFjordDrop
      );
      await fjordDrop.setMintStage(2);
      await expect(
        fjordDrop.connect(acc2).publicMint(778, {
          value: sevenSevenEightNFTsPrice,
        })
      ).to.be.revertedWith("FJORD_MaxMintExceeded()");
    });
  });
  describe("Withdrawal", function () {
    describe("Validations", function () {
      it("Should revert if its not called by the owner", async function () {
        const { fjordDrop, acc2 } = await loadFixture(deployFjordDrop);
        await expect(fjordDrop.connect(acc2).withdraw()).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
      it("Royalities are 10%", async function () {
        const { fjordDrop } = await loadFixture(deployFjordDrop);
        const royalty = await fjordDrop.royaltyInfo(1, 100);
        console.log(
          "royaltyAmount:",
          ethers.BigNumber.from(royalty.royaltyAmount).toString()
        );
        console.log("royaltyBenefitiary:", royalty.receiver);
        expect(royalty.royaltyAmount).to.be.equal(10);
        expect(royalty.receiver).to.be.equal(fjordDrop.address);
      });
    });
    it("Should send all the balance to the payout addressess", async function () {
      const { fjordDrop, owner, acc2, acc4 } = await loadFixture(
        deployFjordDrop
      );
      //testing with the whitelisted address and function
      const provider = waffle.provider;
      //balance before receiving ether
      const contractBalanceBeforeReceivingEther = await provider.getBalance(
        fjordDrop.address
      );
      const formatContractBalanceBeforeReceivingEther =
        ethers.utils.formatEther(contractBalanceBeforeReceivingEther);
      console.log(
        "contractBalanceBeforeReceivingEther",
        formatContractBalanceBeforeReceivingEther
      );

      //sends ether to Fjord contract address
      await acc4.sendTransaction({
        to: fjordDrop.address,
        value: ethers.utils.parseEther("100.0"),
      });
      //balance before withdrawal
      const contractBalanceBeforeWithdrawal = await provider.getBalance(
        fjordDrop.address
      );
      const formatted = ethers.utils.formatEther(
        contractBalanceBeforeWithdrawal
      );
      console.log("contractBalanceBeforeWithdrawal", formatted);
      //withdrawal
      await fjordDrop.withdraw();
      const contractBalanceAfterWithdraw = await provider.getBalance(
        fjordDrop.address
      );
      const formattedContractBalanceAfterWithdrawal = ethers.utils.formatEther(
        contractBalanceAfterWithdraw
      );
      console.log(
        "contractBalanceAfterWithdraw",
        formattedContractBalanceAfterWithdrawal
      );
      expect(contractBalanceAfterWithdraw).to.equal(0);
      const feltzine = await provider.getBalance(owner.address);
      console.log("feltzineBalance", ethers.utils.formatEther(feltzine));
      const dev = await provider.getBalance(acc2.address);
      console.log("devBalance", ethers.utils.formatEther(dev));
    });
  });
  describe("Contract Metadata", function () {
    it("Revert if not the owner", async function () {
      const { fjordDrop, acc2 } = await loadFixture(deployFjordDrop);
      await expect(fjordDrop.connect(acc2).setMintStage(1)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await expect(
        fjordDrop.connect(acc2).updateMetadata("test")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Updates the metadata", async function () {
      const { fjordDrop } = await loadFixture(deployFjordDrop);
      await fjordDrop.updateMetadata("test");
      expect(await fjordDrop.customBaseURI()).to.equal("test");
    });
  });
});
