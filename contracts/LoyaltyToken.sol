// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoyaltyToken
 * @dev ERC20 token for loyalty points with controlled minting
 */
contract LoyaltyToken is ERC20, Ownable {
    uint256 public maxSupply;
    
    event TokensMinted(address indexed to, uint256 amount, address indexed merchant);
    event TokensBurned(address indexed from, uint256 amount, address indexed merchant);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        maxSupply = _maxSupply;
    }
    
    /**
     * @dev Mint tokens to an address (only owner/platform can call)
     */
    function mint(address to, uint256 amount, address merchant) external onlyOwner {
        require(totalSupply() + amount <= maxSupply, "LoyaltyToken: Max supply exceeded");
        _mint(to, amount);
        emit TokensMinted(to, amount, merchant);
    }
    
    /**
     * @dev Burn tokens from an address
     */
    function burn(address from, uint256 amount, address merchant) external onlyOwner {
        _burn(from, amount);
        emit TokensBurned(from, amount, merchant);
    }
    
    /**
     * @dev Update max supply (only owner)
     */
    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        require(_maxSupply >= totalSupply(), "LoyaltyToken: New max supply less than current supply");
        maxSupply = _maxSupply;
    }
}
