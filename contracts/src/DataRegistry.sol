// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DataRegistry
/// @notice İzinli feed adresleri ve referans anahtarlarının yönetimi
contract DataRegistry {
    address public owner;
    mapping(bytes32 => address) public feedByKey;

    event FeedSet(bytes32 indexed key, address indexed feed);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "OWNER");
        _;
    }

    function setFeed(bytes32 key, address feed) external onlyOwner {
        feedByKey[key] = feed;
        emit FeedSet(key, feed);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}


