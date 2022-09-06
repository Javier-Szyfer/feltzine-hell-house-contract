import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getMerkleProof } from "../merkle/merkle";
import { getMerkleRoot } from "../merkle/merkle";

describe("FjordDrop", function () {
  async function deployFjordDrop() {
    const root = getMerkleRoot();
    //Price for whitelisted NFTs
    let oneNFTPrice = ethers.utils.parseEther("0.02");
    let twoNFTsPrice = ethers.utils.parseEther("0.04");
    let threeNFTsPrice = ethers.utils.parseEther("0.06");
    let fourNFTsPrice = ethers.utils.parseEther("0.08");
    const [owner, acc2, acc3, acc4, notWLAcc, mainnetFjordAddress] =
      await ethers.getSigners();
    const FjordDrop = await ethers.getContractFactory("FjordDrop");
    const fjordDrop = await FjordDrop.deploy(
      "ipfs://Qmag7Hgh3C2igYajdYFtLgE132yjEgwjAda4x4HBXj8tNv/",
      `0x${root}`,
      25
    );
    //OWNER SETS THE END TIME TO 5MIN IN THE FUTURE
    await fjordDrop.setEndDateWhitelist(60 * 5);
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
      mainnetFjordAddress,
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
    it("Should start the mintCounter at 25", async function () {
      const { fjordDrop } = await loadFixture(deployFjordDrop);
      expect(await fjordDrop.mintCounter()).to.equal(25);
    });

    it("Should set the right owner", async function () {
      const { fjordDrop, owner } = await loadFixture(deployFjordDrop);
      expect(await fjordDrop.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    describe("Minting via Fjord", function () {
      it("Should revert if all tokens were minted", async function () {
        //CODE HERE
      });
      it("Should mint one NFT via Fjord's contract", async function () {
        //fakeCopperAddress is a random address - not whitelisted -
        //just used to impersonate Fjord
        const { fjordDrop, mainnetFjordAddress } = await loadFixture(
          deployFjordDrop
        );
        //given
        const { erc20Dummy } = await loadFixture(deployErc20Dummy);
        console.log(mainnetFjordAddress.address);
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
    describe("Whitelist minting", function () {
      it("Should revert if all tokens were minted", async function () {
        //CODE HERE
      });
      it("TokenUri returns the correct tokenId after mint", async function () {
        const { fjordDrop, acc3, oneNFTPrice } = await loadFixture(
          deployFjordDrop
        );
        const proof = getMerkleProof(acc3.address);
        await fjordDrop.connect(acc3).whitelistMint(1, proof, {
          value: oneNFTPrice,
        });
        const lastMintTokenId = await fjordDrop.mintCounter();
        const tokenUri = await fjordDrop.tokenURI(lastMintTokenId);
        expect(tokenUri).to.be.equal(
          `ipfs://Qmag7Hgh3C2igYajdYFtLgE132yjEgwjAda4x4HBXj8tNv/${lastMintTokenId}`
        );
      });
      it("Whitelisted address can't mint if payment === price * amount", async function () {
        const { fjordDrop, acc2 } = await loadFixture(deployFjordDrop);
        const proof = getMerkleProof(acc2.address);
        await expect(
          fjordDrop.connect(acc2).whitelistMint(1, proof, {
            value: ethers.utils.parseEther("0.0004"),
          })
        ).to.be.revertedWith("FJORD_InexactPayment");
      });
      it("Whitelisted address can't mint after the whitelist mint ends", async function () {
        const { fjordDrop, acc2, oneNFTPrice } = await loadFixture(
          deployFjordDrop
        );
        const endDate = await fjordDrop.whitelistEndDate();
        const proof = getMerkleProof(acc2.address);
        await time.increaseTo(endDate);
        await expect(
          fjordDrop.connect(acc2).whitelistMint(1, proof, {
            value: oneNFTPrice,
          })
        ).to.be.revertedWith("FJORD_WhitelistMintEnded");
      });
      it("Whitelisted address can mint 1 and update both counters", async function () {
        const { fjordDrop, acc2, oneNFTPrice } = await loadFixture(
          deployFjordDrop
        );
        // const mroot = await fjordDrop.whiteListSaleMerkleRoot();
        // console.log("mroot", mroot);
        const proof = getMerkleProof(acc2.address);
        await fjordDrop.connect(acc2).whitelistMint(1, proof, {
          value: oneNFTPrice,
        });
        expect(await fjordDrop.balanceOf(acc2.address)).to.equal(1);
        // Counters update
        const mintCounter = await fjordDrop.mintCounter();
        expect(mintCounter).to.equal(26);
        // buyer's minted nfts amount
        const buyerNFTS = await fjordDrop.mintPerWhitelistedWallet(
          acc2.address
        );
        expect(buyerNFTS).to.equal(1);
      });
      it("Whitelisted mint emits MintedAnNFT event", async function () {
        const { fjordDrop, acc2, oneNFTPrice } = await loadFixture(
          deployFjordDrop
        );
        const proof = getMerkleProof(acc2.address);
        await expect(
          fjordDrop.connect(acc2).whitelistMint(1, proof, {
            value: oneNFTPrice,
          })
        )
          .to.emit(fjordDrop, "MintedAnNFT")
          .withArgs(acc2.address, 26);
        expect(await fjordDrop.balanceOf(acc2.address)).to.equal(1);
      });
      it("Whitelisted address can mint 2 and update counter", async function () {
        const { fjordDrop, acc4, twoNFTsPrice } = await loadFixture(
          deployFjordDrop
        );
        // const mroot = await fjordDrop.whiteListSaleMerkleRoot();
        // console.log("mroot", mroot);
        const proof = getMerkleProof(acc4.address);
        await fjordDrop.connect(acc4).whitelistMint(2, proof, {
          value: twoNFTsPrice,
        });
        expect(await fjordDrop.balanceOf(acc4.address)).to.equal(2);
        // Counter update
        const mintCounter = await fjordDrop.mintCounter();
        expect(mintCounter).to.equal(27);
        // buyer's minted nfts amount
        const buyerNFTS = await fjordDrop.mintPerWhitelistedWallet(
          acc4.address
        );
        expect(buyerNFTS).to.equal(2);
      });
      it("Reverts if address is not whitelisted ", async function () {
        const { fjordDrop, twoNFTsPrice, notWLAcc } = await loadFixture(
          deployFjordDrop
        );
        const proof = getMerkleProof(notWLAcc.address);
        await expect(
          fjordDrop.connect(notWLAcc).whitelistMint(2, proof, {
            value: twoNFTsPrice,
          })
        ).to.be.revertedWith("Address is not whitelisted");
      });
      it("Reverts if whitelisted user try to mint more than 2", async function () {
        const { fjordDrop, acc2, twoNFTsPrice, acc3, threeNFTsPrice } =
          await loadFixture(deployFjordDrop);
        //balance before minting
        const totalMinted = await fjordDrop.mintPerWhitelistedWallet(
          acc2.address
        );
        console.log("totalMintedBefore mint", totalMinted);
        const proof2 = getMerkleProof(acc2.address);
        //first mint
        await fjordDrop.connect(acc2).whitelistMint(2, proof2, {
          value: twoNFTsPrice,
        });
        //balance after minting
        const totalMintedAfterFirstTwoMints =
          await fjordDrop.mintPerWhitelistedWallet(acc2.address);
        console.log(
          "totalMintedAfterFirstTwoMints",
          totalMintedAfterFirstTwoMints
        );
        //check if totalMinted is 2
        const buyerNFTS = await fjordDrop.mintPerWhitelistedWallet(
          acc2.address
        );
        expect(buyerNFTS).to.equal(2);
        //Mint exceeds max limit
        await expect(
          fjordDrop.connect(acc2).whitelistMint(2, proof2, {
            value: twoNFTsPrice,
          })
        ).to.revertedWith("Max mint exceeded");
        // try to mint 3 at once
        const proof3 = getMerkleProof(acc3.address);
        await expect(
          fjordDrop.connect(acc3).whitelistMint(3, proof3, {
            value: threeNFTsPrice,
          })
        ).to.be.revertedWith("Max mint exceeded");
      });
    });

    describe("Public Mint", function () {
      it("Reverts if all tokens were minted", async function () {
        //IMPLEMENT
      });
      it("Reverts if isPublicMint is false", async function () {
        const { fjordDrop, acc2, oneNFTPrice } = await loadFixture(
          deployFjordDrop
        );
        await expect(
          fjordDrop.connect(acc2).publicMint(1, {
            value: oneNFTPrice,
          })
        ).to.be.revertedWith("FJORD_PublicMintisNotActive");
      });
    });
    it("Reverts if amount is insufficient", async function () {
      const { fjordDrop, acc2, oneNFTPrice, threeNFTsPrice } =
        await loadFixture(deployFjordDrop);
      await fjordDrop.setMintStage(4);
      await fjordDrop.setPublicMintPrice(threeNFTsPrice);
      await expect(
        fjordDrop.connect(acc2).publicMint(1, {
          value: oneNFTPrice,
        })
      ).to.be.revertedWith("FJORD_InexactPayment()");
    });
  });
  describe("Withdrawal", function () {
    //IMPLEMENT
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
      const { fjordDrop, acc2, twoNFTsPrice, acc4 } = await loadFixture(
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
      const proof = getMerkleProof(acc2.address);
      await fjordDrop.connect(acc2).whitelistMint(2, proof, {
        value: twoNFTsPrice,
      });
      //testing with the non whitelisted address and Copper mint function
      await fjordDrop.connect(acc4).mint();
      //sends ether to Fjord contract address
      await acc2.sendTransaction({
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
      // checks the balance of the splits address
      const feltzine = 0x5e080d8b14c1da5936509c2c9ef0168a19304202;
      const artist = 0xb012a1bdca34e1d0c2267bb50e6c53c8042eb4b6;
      const dev = 0x52aa63a67b15e3c2f201c9422cac1e81bd6ea847;
      const feltzineBalance = provider.getBalance(feltzine);
      const artistBalance = provider.getBalance(artist);
      const devBalance = provider.getBalance(dev);
    });
  });
});
