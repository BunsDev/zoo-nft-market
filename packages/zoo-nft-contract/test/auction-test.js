const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

describe("Auction Create tests", function () {
  let nft;
  let auction;
  let seller;
  let bidder;

  beforeEach(async function () {
    const NFT = await ethers.getContractFactory("ZooNftCollection");
    nft = await NFT.deploy();
    await nft.deployed();
    console.log("nft address:", nft.address);

    const Auction = await ethers.getContractFactory("ZooNftAuction");
    auction = await Auction.deploy(nft.address);
    await auction.deployed();
    console.log("auction address:", auction.address);

    [seller, bidder] = await ethers.getSigners();
    console.log("seller: ", seller.address);
    console.log("bidder: ", bidder.address);

    await nft.connect(seller).safeMint("");
    const tokenOwner = await nft.ownerOf(0);
    console.log("minted token 0 owner: ", tokenOwner);
    await nft.connect(seller).approve(auction.address, 0);
  });

  it("Failure test on invalid start, end time", async function () {
    try {
      await auction.connect(seller).createAuction(1, 1, 0, 0);
      assert(false, "Auction create should be failed but not.");
    } catch (err) {
      expect(err.toString()).contains("Auction end time is invalid.");
    }
  });

  it("Success test", async function () {
    try {
      const startTime = Math.trunc(new Date().getTime() / 1000);
      const endTime = startTime + 3600;
      await auction
        .connect(seller)
        .createAuction(0, ethers.utils.parseEther("1"), startTime, endTime);

      const auctionCount = await auction.auctionCount();
      console.log("auctionCount:", auctionCount.toNumber());
      expect(auctionCount.toNumber()).equals(1);

      const createdAuction = await auction.auctions(0);
      console.log("createdAuction", createdAuction);
      expect(createdAuction.id.toNumber()).equals(0);
      expect(createdAuction.user).equals(seller.address);
      expect(createdAuction.startTime.toNumber()).equals(startTime);
      expect(createdAuction.endTime.toNumber()).equals(endTime);

      const tokenOwner = await nft.ownerOf(0);
      expect(tokenOwner).equals(auction.address);
      console.log("token owner:", tokenOwner);
    } catch (err) {
      console.log(err);
      assert(false, "Auction create should success");
    }
  });
});

describe.only("Auction Bid tests", function () {
  let nft;
  let auction;
  let seller;
  let bidder;
  let bidder2;

  beforeEach(async function () {
    const NFT = await ethers.getContractFactory("ZooNftCollection");
    nft = await NFT.deploy();
    await nft.deployed();
    console.log("nft address:", nft.address);

    const Auction = await ethers.getContractFactory("ZooNftAuction");
    auction = await Auction.deploy(nft.address);
    await auction.deployed();
    console.log("auction address:", auction.address);

    [seller, bidder, bidder2] = await ethers.getSigners();
    console.log("seller: ", seller.address);
    console.log("bidder: ", bidder.address);
    console.log("bidder2: ", bidder2.address);

    await nft.connect(seller).safeMint("");
    const tokenOwner = await nft.ownerOf(0);
    console.log("minted token 0 owner: ", tokenOwner);
    await nft.connect(seller).approve(auction.address, 0);

    const startTime = Math.trunc(new Date().getTime() / 1000);
    const endTime = startTime + 3600;
    await auction
      .connect(seller)
      .createAuction(0, ethers.utils.parseEther("1"), startTime, endTime);
  });

  it("Auction owner can't bid.", async function () {
    try {
      await auction.connect(seller).makeBid(0);
      assert(false);
    } catch (err) {
      expect(err.toString()).contains("The owner of the auction cannot bid");
    }
  });

  it("Bidder's price is not enough.", async function () {
    try {
      await auction
        .connect(bidder)
        .makeBid(0, { value: ethers.utils.parseEther("0.1") });
      assert(false, "Make bid should be failed because bid price is too low");
    } catch (err) {
      expect(err.toString()).contains(
        "Your bid is lower than the start bid price."
      );
    }
  });

  it("Success test", async function () {
    try {
      await auction
        .connect(bidder)
        .makeBid(0, { value: ethers.utils.parseEther("1.5") });

      const bidedAuction = await auction.auctions(0);
      console.log("bidedAuction", bidedAuction);

      expect(bidedAuction.highestBidder).equals(bidder.address);
      expect(bidedAuction.highestBid).equals(ethers.utils.parseEther("1.5"));
    } catch (err) {
      console.log(err);
      assert(false, "Auction bid should success");
    }
  });

  it("Bidder's price is lower than the highest.", async function () {
    try {
      await auction
        .connect(bidder)
        .makeBid(0, { value: ethers.utils.parseEther("1.5") });

      await auction
        .connect(bidder2)
        .makeBid(0, { value: ethers.utils.parseEther("1.1") });

      assert(
        false,
        "Make bid should be failed because bid price is lower than the highest."
      );
    } catch (err) {
      expect(err.toString()).contains(
        "Your bid is lower than the highest bid."
      );
    }
  });

  it("Success over bid.", async function () {
    try {
      await auction
        .connect(bidder)
        .makeBid(0, { value: ethers.utils.parseEther("1.5") });

      await auction
        .connect(bidder2)
        .makeBid(0, { value: ethers.utils.parseEther("1.7") });

      const bidedAuction = await auction.auctions(0);
      console.log("bidedAuction", bidedAuction);

      expect(bidedAuction.highestBidder).equals(bidder2.address);
      expect(bidedAuction.highestBid).equals(ethers.utils.parseEther("1.7"));
    } catch (err) {
      console.log(err);
      assert(false, "Auction over bid should success");
    }
  });
});
