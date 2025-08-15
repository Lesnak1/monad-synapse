// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PredictionMarket (MVP)
/// @notice Minimal meta kayıt sözleşmesi; simülasyon parametreleri ve IPFS referansını olay olarak yayınlar
contract PredictionMarket {
    event SimulationRecorded(address indexed user, bytes32 indexed paramsHash, string ipfsCid, uint64 timestamp);

    function recordSimulation(bytes32 paramsHash, string calldata ipfsCid) external {
        emit SimulationRecorded(msg.sender, paramsHash, ipfsCid, uint64(block.timestamp));
    }
}


