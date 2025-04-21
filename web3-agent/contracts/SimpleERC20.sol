// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Import Ownable for minting control

// Simple ERC20 contract with a minting function restricted to the owner
contract SimpleERC20 is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner // Use Ownable's initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {} // Pass initialOwner to Ownable

    // Function to mint new tokens, restricted to the owner (deployer)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
} 