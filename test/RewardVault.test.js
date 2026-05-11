import hre from "hardhat";
import { expect } from "chai";

describe("RewardVault", function () {
  let vault, token, owner, admin, alice, bob;
  const POOL = 1_000_000_000n; // 1000 USDC (6 decimals)

  beforeEach(async () => {
    const conn = await hre.network.getOrCreate();
    const ethers = conn.ethers;

    [owner, admin, alice, bob] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("USD Coin", "USDC", 6);

    const RewardVault = await ethers.getContractFactory("RewardVault");
    vault = await RewardVault.deploy(await token.getAddress(), admin.address);

    await token.mint(owner.address, POOL);
    await token.approve(await vault.getAddress(), POOL);
  });

  it("deposits tokens into the vault", async () => {
    await vault.deposit(POOL);
    expect(await vault.totalWavePool()).to.equal(POOL);
  });

  it("finalizeWave sets state correctly", async () => {
    await vault.deposit(POOL);
    await vault.connect(admin).finalizeWave(1000n);
    expect(await vault.totalPointsAwarded()).to.equal(1000n);
    expect(await vault.waveFinalized()).to.be.true;
  });

  it("calculateShare returns proportional amount", async () => {
    await vault.deposit(POOL);
    await vault.connect(admin).finalizeWave(1000n);
    // 400 / 1000 * 1000 USDC = 400 USDC
    expect(await vault.calculateShare(400n)).to.equal(400_000_000n);
  });

  it("claimReward transfers correct amount to user", async () => {
    await vault.deposit(POOL);
    await vault.connect(admin).finalizeWave(1000n);
    await vault.connect(admin).claimReward(alice.address, 400n);
    expect(await token.balanceOf(alice.address)).to.equal(400_000_000n);
    expect(await vault.claimed(alice.address)).to.be.true;
  });

  it("reverts on double claim", async () => {
    await vault.deposit(POOL);
    await vault.connect(admin).finalizeWave(1000n);
    await vault.connect(admin).claimReward(alice.address, 400n);
    await expect(
      vault.connect(admin).claimReward(alice.address, 400n)
    ).to.be.revertedWithCustomError(vault, "AlreadyClaimed");
  });

  it("reverts claimReward before finalization", async () => {
    await vault.deposit(POOL);
    await expect(
      vault.connect(admin).claimReward(alice.address, 400n)
    ).to.be.revertedWithCustomError(vault, "WaveNotFinalized");
  });

  it("reverts finalizeWave with zero points", async () => {
    await vault.deposit(POOL);
    await expect(
      vault.connect(admin).finalizeWave(0n)
    ).to.be.revertedWithCustomError(vault, "ZeroPoints");
  });

  it("reverts finalizeWave with empty pool", async () => {
    await expect(
      vault.connect(admin).finalizeWave(1000n)
    ).to.be.revertedWithCustomError(vault, "ZeroPool");
  });

  it("reverts non-admin calling finalizeWave", async () => {
    await vault.deposit(POOL);
    await expect(
      vault.connect(alice).finalizeWave(1000n)
    ).to.be.revertedWithCustomError(vault, "NotWaveAdmin");
  });

  it("resetWave clears state", async () => {
    await vault.deposit(POOL);
    await vault.connect(admin).finalizeWave(1000n);
    await vault.resetWave();
    expect(await vault.totalWavePool()).to.equal(0n);
    expect(await vault.totalPointsAwarded()).to.equal(0n);
    expect(await vault.waveFinalized()).to.be.false;
  });

  it("multiple users receive correct proportional shares", async () => {
    await vault.deposit(POOL);
    await vault.connect(admin).finalizeWave(1000n);
    await vault.connect(admin).claimReward(alice.address, 600n);
    await vault.connect(admin).claimReward(bob.address, 400n);
    expect(await token.balanceOf(alice.address)).to.equal(600_000_000n);
    expect(await token.balanceOf(bob.address)).to.equal(400_000_000n);
  });
});
