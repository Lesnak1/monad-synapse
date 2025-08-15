// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title MonadCasinoCore
/// @notice Advanced secure casino contract with comprehensive security patterns
/// @dev Implements multi-signature operations, emergency pause, and robust validation
contract MonadCasinoCore is ReentrancyGuard, Pausable, AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Role definitions for access control
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant GAME_ENGINE_ROLE = keccak256("GAME_ENGINE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant MULTISIG_ROLE = keccak256("MULTISIG_ROLE");

    // Security constants
    uint256 public constant MAX_BET_AMOUNT = 1000 ether;
    uint256 public constant MIN_BET_AMOUNT = 0.001 ether;
    uint256 public constant MAX_MULTIPLIER = 10000; // 100x
    uint256 public constant HOUSE_EDGE_BASIS_POINTS = 300; // 3%
    uint256 public constant MIN_POOL_RESERVE_RATIO = 1000; // 10%
    
    // Multi-signature requirements
    uint256 public constant MULTISIG_THRESHOLD = 3;
    uint256 public constant MULTISIG_TIMEOUT = 24 hours;

    // State variables
    uint256 public totalPoolBalance;
    uint256 public totalReserveBalance;
    uint256 public dailyWithdrawalLimit;
    uint256 public dailyWithdrawnAmount;
    uint256 public lastWithdrawalReset;
    
    // Game state tracking
    mapping(address => uint256) public playerNonces;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint256) public lastGameTime;
    mapping(address => uint256) public dailyPlayerLosses;
    mapping(address => uint256) public lastPlayerLossReset;
    
    // Multi-signature operations
    struct MultiSigOperation {
        bytes32 operationHash;
        uint256 confirmations;
        uint256 createdAt;
        bool executed;
        mapping(address => bool) confirmedBy;
        bytes data;
    }
    mapping(bytes32 => MultiSigOperation) public multiSigOperations;
    
    // Events
    event GameBetPlaced(address indexed player, uint256 amount, bytes32 indexed gameId, uint256 nonce);
    event GameResult(address indexed player, bytes32 indexed gameId, uint256 betAmount, uint256 winAmount, bool won);
    event EmergencyWithdrawal(address indexed to, uint256 amount, bytes32 indexed reason);
    event MultiSigOperationCreated(bytes32 indexed operationHash, bytes data);
    event MultiSigOperationConfirmed(bytes32 indexed operationHash, address indexed confirmer);
    event MultiSigOperationExecuted(bytes32 indexed operationHash);
    event SecurityAlert(string indexed alertType, address indexed actor, bytes data);
    event PoolBalanceUpdated(uint256 newBalance, uint256 newReserve);

    // Custom errors
    error InvalidBetAmount(uint256 amount);
    error InsufficientPoolBalance(uint256 required, uint256 available);
    error ReplayAttack(bytes32 transactionId);
    error InvalidSignature();
    error GameCooldownActive(uint256 remainingTime);
    error DailyLimitExceeded(uint256 requested, uint256 available);
    error UnauthorizedAccess(address caller);
    error InvalidMultiplier(uint256 multiplier);
    error OperationAlreadyExecuted(bytes32 operationHash);

    constructor(
        uint256 _initialPoolBalance,
        uint256 _dailyWithdrawalLimit
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        totalPoolBalance = _initialPoolBalance;
        totalReserveBalance = (_initialPoolBalance * MIN_POOL_RESERVE_RATIO) / 10000;
        dailyWithdrawalLimit = _dailyWithdrawalLimit;
        lastWithdrawalReset = block.timestamp;
    }

    /// @notice Place a bet with comprehensive security checks
    /// @param gameType The type of game being played
    /// @param betAmount The amount being bet
    /// @param gameData Additional game-specific data
    /// @param signature Server signature for validation
    function placeBet(
        string calldata gameType,
        uint256 betAmount,
        bytes calldata gameData,
        bytes calldata signature
    ) external payable nonReentrant whenNotPaused {
        // Input validation
        if (betAmount < MIN_BET_AMOUNT || betAmount > MAX_BET_AMOUNT) {
            revert InvalidBetAmount(betAmount);
        }
        
        if (msg.value != betAmount) {
            revert InvalidBetAmount(msg.value);
        }

        // Rate limiting - prevent rapid-fire betting
        uint256 timeSinceLastGame = block.timestamp - lastGameTime[msg.sender];
        if (timeSinceLastGame < 100) { // 100ms minimum between games
            revert GameCooldownActive(100 - timeSinceLastGame);
        }

        // Pool balance validation
        uint256 maxPossibleWin = (betAmount * MAX_MULTIPLIER) / 100;
        uint256 availableBalance = totalPoolBalance - totalReserveBalance;
        
        if (maxPossibleWin > availableBalance) {
            revert InsufficientPoolBalance(maxPossibleWin, availableBalance);
        }

        // Create transaction ID for replay protection
        bytes32 transactionId = keccak256(abi.encodePacked(
            msg.sender,
            betAmount,
            gameType,
            gameData,
            playerNonces[msg.sender],
            block.timestamp
        ));

        if (processedTransactions[transactionId]) {
            revert ReplayAttack(transactionId);
        }

        // Validate server signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            betAmount,
            gameType,
            gameData,
            playerNonces[msg.sender]
        )).toEthSignedMessageHash();

        if (!hasRole(GAME_ENGINE_ROLE, messageHash.recover(signature))) {
            revert InvalidSignature();
        }

        // Update state
        processedTransactions[transactionId] = true;
        playerNonces[msg.sender]++;
        lastGameTime[msg.sender] = block.timestamp;
        totalPoolBalance += betAmount;

        // Emit event
        emit GameBetPlaced(msg.sender, betAmount, transactionId, playerNonces[msg.sender] - 1);
    }

    /// @notice Process game result and payout if winning
    /// @param player The player address
    /// @param gameId The game transaction ID
    /// @param betAmount The original bet amount
    /// @param multiplier The win multiplier (100 = 1x, 200 = 2x, etc.)
    /// @param signature Server signature for validation
    function processGameResult(
        address player,
        bytes32 gameId,
        uint256 betAmount,
        uint256 multiplier,
        bytes calldata signature
    ) external nonReentrant whenNotPaused onlyRole(GAME_ENGINE_ROLE) {
        // Input validation
        if (multiplier > MAX_MULTIPLIER) {
            revert InvalidMultiplier(multiplier);
        }

        if (!processedTransactions[gameId]) {
            revert ReplayAttack(gameId);
        }

        // Validate server signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            player,
            gameId,
            betAmount,
            multiplier
        )).toEthSignedMessageHash();

        if (messageHash.recover(signature) != msg.sender) {
            revert InvalidSignature();
        }

        bool won = multiplier > 100;
        uint256 winAmount = 0;

        if (won) {
            winAmount = (betAmount * multiplier) / 100;
            uint256 payout = winAmount - betAmount; // Net win amount
            
            // Validate sufficient balance for payout
            uint256 availableBalance = totalPoolBalance - totalReserveBalance;
            if (payout > availableBalance) {
                revert InsufficientPoolBalance(payout, availableBalance);
            }

            // Process payout
            totalPoolBalance -= payout;
            
            // Transfer winnings
            (bool success, ) = player.call{value: winAmount}("");
            require(success, "Transfer failed");
        } else {
            // House wins - track player losses for responsible gaming
            _updatePlayerLosses(player, betAmount);
        }

        // Remove from processed transactions to prevent storage bloat
        delete processedTransactions[gameId];

        emit GameResult(player, gameId, betAmount, winAmount, won);
        emit PoolBalanceUpdated(totalPoolBalance, totalReserveBalance);
    }

    /// @notice Emergency pause function
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit SecurityAlert("EMERGENCY_PAUSE", msg.sender, "");
    }

    /// @notice Resume operations after pause
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Emergency withdrawal with multi-signature requirement
    /// @param to Recipient address
    /// @param amount Amount to withdraw
    /// @param reason Reason for emergency withdrawal
    function emergencyWithdraw(
        address to,
        uint256 amount,
        bytes32 reason
    ) external {
        bytes32 operationHash = keccak256(abi.encodePacked(
            "EMERGENCY_WITHDRAW",
            to,
            amount,
            reason,
            block.timestamp
        ));

        if (!_executeMultiSigOperation(operationHash, abi.encodeWithSelector(
            this.emergencyWithdraw.selector,
            to,
            amount,
            reason
        ))) {
            return; // Operation created but not yet executable
        }

        require(amount <= totalPoolBalance, "Insufficient balance");
        
        totalPoolBalance -= amount;
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");

        emit EmergencyWithdrawal(to, amount, reason);
        emit PoolBalanceUpdated(totalPoolBalance, totalReserveBalance);
    }

    /// @notice Add funds to the pool
    function addToPool() external payable onlyRole(OPERATOR_ROLE) {
        totalPoolBalance += msg.value;
        
        // Adjust reserve if needed
        uint256 requiredReserve = (totalPoolBalance * MIN_POOL_RESERVE_RATIO) / 10000;
        if (totalReserveBalance < requiredReserve) {
            totalReserveBalance = requiredReserve;
        }

        emit PoolBalanceUpdated(totalPoolBalance, totalReserveBalance);
    }

    /// @notice Update daily withdrawal limits with multi-sig
    function updateDailyWithdrawalLimit(uint256 newLimit) external {
        bytes32 operationHash = keccak256(abi.encodePacked(
            "UPDATE_WITHDRAWAL_LIMIT",
            newLimit,
            block.timestamp
        ));

        if (!_executeMultiSigOperation(operationHash, abi.encodeWithSelector(
            this.updateDailyWithdrawalLimit.selector,
            newLimit
        ))) {
            return;
        }

        dailyWithdrawalLimit = newLimit;
    }

    /// @notice Multi-signature operation management
    function confirmMultiSigOperation(bytes32 operationHash) external onlyRole(MULTISIG_ROLE) {
        MultiSigOperation storage operation = multiSigOperations[operationHash];
        require(operation.createdAt > 0, "Operation does not exist");
        require(operation.createdAt + MULTISIG_TIMEOUT > block.timestamp, "Operation expired");
        require(!operation.confirmedBy[msg.sender], "Already confirmed");
        require(!operation.executed, "Already executed");

        operation.confirmedBy[msg.sender] = true;
        operation.confirmations++;

        emit MultiSigOperationConfirmed(operationHash, msg.sender);

        // Execute if threshold reached
        if (operation.confirmations >= MULTISIG_THRESHOLD && !operation.executed) {
            operation.executed = true;
            (bool success, ) = address(this).call(operation.data);
            require(success, "Execution failed");
            emit MultiSigOperationExecuted(operationHash);
        }
    }

    /// @notice Get current pool status
    function getPoolStatus() external view returns (
        uint256 totalBalance,
        uint256 reserveBalance,
        uint256 availableBalance,
        uint256 utilizationRatio
    ) {
        totalBalance = totalPoolBalance;
        reserveBalance = totalReserveBalance;
        availableBalance = totalPoolBalance - totalReserveBalance;
        utilizationRatio = totalPoolBalance > 0 ? 
            (totalReserveBalance * 10000) / totalPoolBalance : 0;
    }

    /// @notice Check if player has exceeded daily loss limits
    function checkPlayerLossLimits(address player) external view returns (
        uint256 dailyLosses,
        uint256 remainingLimit,
        bool isLimitExceeded
    ) {
        dailyLosses = _getCurrentDailyLosses(player);
        uint256 dailyLimit = 100 ether; // 100 MON daily loss limit
        remainingLimit = dailyLimit > dailyLosses ? dailyLimit - dailyLosses : 0;
        isLimitExceeded = dailyLosses >= dailyLimit;
    }

    /// @notice Internal functions
    function _executeMultiSigOperation(bytes32 operationHash, bytes memory data) internal returns (bool) {
        MultiSigOperation storage operation = multiSigOperations[operationHash];
        
        if (operation.createdAt == 0) {
            // Create new operation
            operation.operationHash = operationHash;
            operation.createdAt = block.timestamp;
            operation.data = data;
            operation.confirmations = 1;
            operation.confirmedBy[msg.sender] = true;
            
            emit MultiSigOperationCreated(operationHash, data);
            emit MultiSigOperationConfirmed(operationHash, msg.sender);
            
            return false; // Need more confirmations
        }
        
        if (operation.executed) {
            revert OperationAlreadyExecuted(operationHash);
        }
        
        if (!operation.confirmedBy[msg.sender]) {
            operation.confirmedBy[msg.sender] = true;
            operation.confirmations++;
            emit MultiSigOperationConfirmed(operationHash, msg.sender);
        }
        
        return operation.confirmations >= MULTISIG_THRESHOLD;
    }

    function _updatePlayerLosses(address player, uint256 lossAmount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastPlayerLossReset[player] / 1 days;
        
        if (currentDay > lastResetDay) {
            dailyPlayerLosses[player] = 0;
            lastPlayerLossReset[player] = block.timestamp;
        }
        
        dailyPlayerLosses[player] += lossAmount;
        
        // Alert if approaching daily limit
        if (dailyPlayerLosses[player] > 80 ether) {
            emit SecurityAlert("DAILY_LOSS_WARNING", player, abi.encodePacked(dailyPlayerLosses[player]));
        }
    }

    function _getCurrentDailyLosses(address player) internal view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastPlayerLossReset[player] / 1 days;
        
        if (currentDay > lastResetDay) {
            return 0;
        }
        
        return dailyPlayerLosses[player];
    }

    /// @notice Receive function to accept ETH
    receive() external payable {
        totalPoolBalance += msg.value;
        emit PoolBalanceUpdated(totalPoolBalance, totalReserveBalance);
    }

    /// @notice Fallback function
    fallback() external payable {
        revert("Function not found");
    }
}