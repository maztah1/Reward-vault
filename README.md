# RewardVault - Wave-Based Reward Distribution System

A Solidity smart contract system for managing wave-based reward distribution using a points-based allocation mechanism. Built with Hardhat and OpenZeppelin contracts.

## 📋 Overview

RewardVault is a treasury and math layer designed for distributing ERC20 token rewards (e.g., USDC) proportionally based on user points accumulated during defined "waves" or reward periods. The system ensures fair, transparent, and secure distribution of rewards to participants.

### Key Features

- **Wave-Based Distribution**: Organize reward cycles into discrete waves with clear start and end points
- **Proportional Allocation**: Rewards distributed based on user points relative to total points awarded
- **Secure Claims**: One-time claim mechanism with admin-controlled finalization
- **Flexible Funding**: Anyone can deposit tokens into the reward pool
- **Role-Based Access**: Separate owner and wave admin roles for enhanced security
- **Gas Efficient**: Optimized calculations using integer math to minimize gas costs

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RewardVault System                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Funders    │         │  Wave Admin  │         │    Users     │
│              │         │              │         │              │
│ - Deposit    │         │ - Finalize   │         │ - Claim      │
│   tokens     │         │   wave       │         │   rewards    │
│              │         │ - Process    │         │              │
└──────┬───────┘         │   claims     │         └──────▲───────┘
       │                 └──────┬───────┘                │
       │                        │                        │
       │                        │                        │
       ▼                        ▼                        │
┌─────────────────────────────────────────────────────────────┐
│                      RewardVault                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  State Variables:                                      │ │
│  │  • totalWavePool: Total tokens available              │ │
│  │  • totalPointsAwarded: Sum of all user points         │ │
│  │  • waveFinalized: Distribution lock flag              │ │
│  │  • claimed: Mapping of user claim status              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Core Functions:                                       │ │
│  │  • deposit(): Fund the reward pool                    │ │
│  │  • finalizeWave(): Lock distribution parameters       │ │
│  │  • calculateShare(): Compute user allocation          │ │
│  │  • claimReward(): Transfer rewards to users           │ │
│  │  • resetWave(): Prepare for next cycle                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  ERC20 Token    │
                  │  (e.g., USDC)   │
                  └─────────────────┘
```

## 🔄 Reward Distribution Flow

```
1. FUNDING PHASE
   └─> Anyone deposits ERC20 tokens → totalWavePool increases

2. ACCUMULATION PHASE
   └─> Users earn points off-chain (tracked by PointOracle)

3. FINALIZATION
   └─> Wave Admin calls finalizeWave(totalPoints)
       └─> Locks the pool and point totals
       └─> Enables claims

4. CLAIM PHASE
   └─> Wave Admin calls claimReward(user, userPoints)
       └─> Calculates: (userPoints / totalPoints) × totalWavePool
       └─> Transfers tokens to user
       └─> Marks user as claimed

5. RESET (Optional)
   └─> Owner calls resetWave() to start new cycle
```

## 📐 Reward Calculation Formula

The reward distribution uses a simple proportional formula:

```
User Reward = (User Points / Total Points) × Total Pool

Example:
- Total Pool: 1,000 USDC
- Total Points: 1,000
- Alice Points: 400
- Alice Reward: (400 / 1,000) × 1,000 = 400 USDC
```

## 💻 Code Examples

### Deploying the Contract

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer, waveAdmin] = await ethers.getSigners();
  
  // Deploy reward token (or use existing USDC address)
  const usdcAddress = "0x..."; // USDC contract address
  
  // Deploy RewardVault
  const RewardVault = await ethers.getContractFactory("RewardVault");
  const vault = await RewardVault.deploy(usdcAddress, waveAdmin.address);
  await vault.waitForDeployment();
  
  console.log("RewardVault deployed to:", await vault.getAddress());
}

main();
```

### Funding a Wave

```javascript
const USDC_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)

// Approve vault to spend tokens
await usdcToken.approve(vaultAddress, USDC_AMOUNT);

// Deposit into vault
await vault.deposit(USDC_AMOUNT);

console.log("Wave funded with 1000 USDC");
```

### Finalizing a Wave

```javascript
// Wave admin finalizes with total points from off-chain oracle
const totalPoints = 1000n;

await vault.connect(waveAdmin).finalizeWave(totalPoints);

console.log("Wave finalized with", totalPoints, "total points");
```

### Processing Claims

```javascript
// Wave admin processes claims for users
const users = [
  { address: "0xAlice...", points: 400n },
  { address: "0xBob...", points: 600n }
];

for (const user of users) {
  // Calculate expected reward
  const expectedReward = await vault.calculateShare(user.points);
  console.log(`${user.address} will receive:`, ethers.formatUnits(expectedReward, 6), "USDC");
  
  // Process claim
  await vault.connect(waveAdmin).claimReward(user.address, user.points);
  console.log(`Claimed for ${user.address}`);
}
```

### Resetting for Next Wave

```javascript
// Owner resets vault for next wave
await vault.connect(owner).resetWave();

console.log("Vault reset for next wave");
```

## 🔐 Security Features

- **Access Control**: Uses OpenZeppelin's `Ownable` for owner functions and custom `onlyWaveAdmin` modifier
- **SafeERC20**: Prevents token transfer issues with SafeERC20 wrapper
- **Reentrancy Protection**: State changes before external calls
- **Double Claim Prevention**: Mapping tracks claimed status per user
- **Input Validation**: Checks for zero values and invalid states
- **Custom Errors**: Gas-efficient error handling

## 🛠️ Installation & Setup

### Prerequisites

- Node.js v18+ 
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

## 🧪 Testing

The project includes comprehensive test coverage:

- ✅ Token deposits and pool accumulation
- ✅ Wave finalization with point totals
- ✅ Proportional share calculations
- ✅ Reward claims and token transfers
- ✅ Double claim prevention
- ✅ Access control enforcement
- ✅ Edge cases (zero values, empty pools)
- ✅ Multi-user distribution scenarios
- ✅ Wave reset functionality

Run the test suite:

```bash
npm test
```

## 📁 Project Structure

```
wave-reward-vault/
├── contracts/
│   ├── RewardVault.sol          # Main vault contract
│   └── mocks/
│       └── ERC20Mock.sol         # Mock token for testing
├── test/
│   └── RewardVault.test.js      # Comprehensive test suite
├── artifacts/                    # Compiled contract artifacts
├── cache/                        # Hardhat cache
├── types/                        # TypeScript type definitions
├── hardhat.config.js            # Hardhat configuration
├── package.json                 # Project dependencies
└── README.md                    # This file
```

## 🎯 Use Cases

1. **Gaming Platforms**: Distribute rewards to players based on in-game achievements
2. **DeFi Protocols**: Allocate liquidity mining rewards proportionally
3. **DAOs**: Distribute treasury funds based on contribution points
4. **Loyalty Programs**: Reward users based on engagement metrics
5. **Competitions**: Prize distribution for hackathons or contests

## 🔧 Configuration

### Hardhat Configuration

The project uses Hardhat 3.4.5 with the following setup:

- **Solidity Version**: 0.8.20
- **Toolbox**: @nomicfoundation/hardhat-toolbox-mocha-ethers
- **Testing Framework**: Mocha + Chai
- **Network**: Hardhat Network (default)

### Contract Parameters

- `rewardToken`: ERC20 token address (immutable)
- `waveAdmin`: Address authorized to finalize waves and process claims
- `owner`: Contract owner (can reset waves and update admin)

## 📊 Gas Optimization

The contract is optimized for gas efficiency:

- Uses `immutable` for reward token address
- Integer division for share calculations (no floating point)
- Custom errors instead of string reverts
- Minimal storage reads/writes
- SafeERC20 for secure token operations

## 🚀 Deployment Checklist

- [ ] Deploy or identify reward token (e.g., USDC)
- [ ] Identify wave admin address
- [ ] Deploy RewardVault contract
- [ ] Verify contract on block explorer
- [ ] Set up off-chain point tracking system
- [ ] Fund initial wave
- [ ] Test claim process with small amounts
- [ ] Document wave schedule and rules

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please ensure all tests pass before submitting pull requests.

## ⚠️ Disclaimer

This smart contract is provided as-is. Conduct thorough audits and testing before deploying to production environments with real funds.

---

**Built with ❤️ using Hardhat and OpenZeppelin**
