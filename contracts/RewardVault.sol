// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RewardVault — Treasury & Math Layer for Wave reward distribution
/// @notice Holds USDC/ecosystem tokens and distributes them proportionally by points at Wave end
contract RewardVault is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardToken;

    address public waveAdmin;

    uint256 public totalWavePool;
    uint256 public totalPointsAwarded;
    bool public waveFinalized;

    // user => claimed
    mapping(address => bool) public claimed;

    event WaveFinalized(uint256 totalPool, uint256 totalPoints);
    event RewardClaimed(address indexed user, uint256 amount);
    event WaveAdminUpdated(address indexed newAdmin);

    error NotWaveAdmin();
    error WaveNotFinalized();
    error AlreadyClaimed();
    error ZeroPoints();
    error ZeroPool();

    modifier onlyWaveAdmin() {
        if (msg.sender != waveAdmin) revert NotWaveAdmin();
        _;
    }

    constructor(address _rewardToken, address _waveAdmin) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken);
        waveAdmin = _waveAdmin;
    }

    /// @notice Fund the vault for the current wave
    function deposit(uint256 _amount) external {
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
        totalWavePool += _amount;
    }

    /// @notice Finalize the wave with total points from PointOracle
    /// @param _totalPoints Total points awarded across all users this wave
    function finalizeWave(uint256 _totalPoints) external onlyWaveAdmin {
        if (_totalPoints == 0) revert ZeroPoints();
        if (totalWavePool == 0) revert ZeroPool();
        totalPointsAwarded = _totalPoints;
        waveFinalized = true;
        emit WaveFinalized(totalWavePool, _totalPoints);
    }

    /// @notice Calculate a user's reward share
    /// @dev UserReward = (userPoints / totalWavePoints) * totalPool
    function calculateShare(uint256 _userPoints) public view returns (uint256) {
        if (totalPointsAwarded == 0) return 0;
        return (_userPoints * totalWavePool) / totalPointsAwarded;
    }

    /// @notice Claim reward for a given user with their verified point balance
    /// @param _user Address of the claimant
    /// @param _userPoints Points recorded in PointOracle for this user
    function claimReward(address _user, uint256 _userPoints) external onlyWaveAdmin {
        if (!waveFinalized) revert WaveNotFinalized();
        if (claimed[_user]) revert AlreadyClaimed();
        claimed[_user] = true;
        uint256 amount = calculateShare(_userPoints);
        if (amount > 0) rewardToken.safeTransfer(_user, amount);
        emit RewardClaimed(_user, amount);
    }

    /// @notice Reset vault for the next wave (owner only)
    function resetWave() external onlyOwner {
        totalWavePool = 0;
        totalPointsAwarded = 0;
        waveFinalized = false;
    }

    function setWaveAdmin(address _newAdmin) external onlyOwner {
        waveAdmin = _newAdmin;
        emit WaveAdminUpdated(_newAdmin);
    }
}
