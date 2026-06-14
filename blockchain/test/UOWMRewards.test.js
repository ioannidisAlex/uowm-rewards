const { expect }        = require("chai");
const { ethers }        = require("hardhat");
const { loadFixture }   = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("UOWMRewards", function () {
  async function deploy() {
    const [owner, student1, student2] = await ethers.getSigners();
    const Factory  = await ethers.getContractFactory("UOWMRewards");
    const contract = await Factory.deploy(owner.address);
    return { contract, owner, student1, student2 };
  }

  describe("Deployment", function () {
    it("sets the correct owner", async function () {
      const { contract, owner } = await loadFixture(deploy);
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("has the correct name and symbol", async function () {
      const { contract } = await loadFixture(deploy);
      expect(await contract.name()).to.equal("UOWM Rewards Points");
      expect(await contract.symbol()).to.equal("UOWMP");
    });

    it("starts with zero total supply", async function () {
      const { contract } = await loadFixture(deploy);
      expect(await contract.totalSupply()).to.equal(0n);
    });
  });

  describe("awardAttendance", function () {
    it("mints correct token amount (points × 1e18)", async function () {
      const { contract, student1 } = await loadFixture(deploy);
      await contract.awardAttendance(student1.address, 50, "LEC001");
      expect(await contract.balanceOf(student1.address)).to.equal(50n * 10n ** 18n);
    });

    it("emits AttendanceRecorded event", async function () {
      const { contract, student1 } = await loadFixture(deploy);
      await expect(contract.awardAttendance(student1.address, 50, "LEC001"))
        .to.emit(contract, "AttendanceRecorded")
        .withArgs(student1.address, 50n, "LEC001", (ts) => ts > 0n);
    });

    it("accumulates points across multiple lectures", async function () {
      const { contract, student1 } = await loadFixture(deploy);
      await contract.awardAttendance(student1.address, 50, "LEC001");
      await contract.awardAttendance(student1.address, 50, "LEC002");
      expect(await contract.balanceOf(student1.address)).to.equal(100n * 10n ** 18n);
    });

    it("reverts when called by non-owner", async function () {
      const { contract, student1, student2 } = await loadFixture(deploy);
      await expect(
        contract.connect(student1).awardAttendance(student2.address, 50, "LEC001")
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("tracks balances per student independently", async function () {
      const { contract, student1, student2 } = await loadFixture(deploy);
      await contract.awardAttendance(student1.address, 50, "LEC001");
      await contract.awardAttendance(student2.address, 50, "LEC002");
      expect(await contract.balanceOf(student1.address)).to.equal(50n * 10n ** 18n);
      expect(await contract.balanceOf(student2.address)).to.equal(50n * 10n ** 18n);
    });
  });

  describe("Soulbound — transfers blocked", function () {
    it("reverts transfer()", async function () {
      const { contract, student1, student2 } = await loadFixture(deploy);
      await contract.awardAttendance(student1.address, 50, "LEC001");
      await expect(
        contract.connect(student1).transfer(student2.address, 1n)
      ).to.be.revertedWith("UOWMP: soulbound, non-transferable");
    });

    it("reverts transferFrom()", async function () {
      const { contract, owner, student1, student2 } = await loadFixture(deploy);
      await contract.awardAttendance(student1.address, 50, "LEC001");
      await expect(
        contract.connect(owner).transferFrom(student1.address, student2.address, 1n)
      ).to.be.revertedWith("UOWMP: soulbound, non-transferable");
    });

    it("reverts approve()", async function () {
      const { contract, student1, student2 } = await loadFixture(deploy);
      await expect(
        contract.connect(student1).approve(student2.address, 1n)
      ).to.be.revertedWith("UOWMP: soulbound, non-transferable");
    });
  });
});
