// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Import Ownable for minting control

// Simple ERC20 contract with a minting function restricted to the owner
contract SimpleERC20 is ERC20, Ownable {
    uint8 private _decimals; // Store decimals

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_, // Add decimals parameter
        address initialOwner // Use Ownable's initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) { // Pass initialOwner to Ownable
        _decimals = decimals_;
    }

    // Override decimals function to return the stored value
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Function to mint new tokens, restricted to the owner (deployer)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
} 