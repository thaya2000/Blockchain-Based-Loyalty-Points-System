// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LoyaltyToken.sol";

/**
 * @title LoyaltyPlatform
 * @dev Main contract for managing loyalty points platform
 */
contract LoyaltyPlatform is Ownable, ReentrancyGuard {
    LoyaltyToken public loyaltyToken;
    address public protocolTreasury;
    
    uint256 public baseMintFee;
    uint256 public feeRatePerThousand;
    uint256 public solToPointsRatio;
    uint256 public totalFeesCollected;
    bool public isActive;
    
    struct MerchantRecord {
        bool isAuthorized;
        uint256 mintAllowance;
        uint256 totalMinted;
        uint256 totalRedeemed;
        uint256 totalFeesPaid;
        uint256 registeredAt;
    }
    
    struct PurchaseRecord {
        address customer;
        address merchant;
        bytes32 productIdHash;
        uint256 pricePaid;
        uint256 loyaltyPointsEarned;
        uint256 timestamp;
    }
    
    mapping(address => MerchantRecord) public merchants;
    mapping(bytes32 => PurchaseRecord) public purchases;
    uint256 public merchantCount;
    
    event PlatformInitialized(address indexed admin, address indexed token, address indexed treasury);
    event MerchantRegistered(address indexed merchant, uint256 mintAllowance);
    event MerchantRevoked(address indexed merchant);
    event PointsMinted(address indexed consumer, address indexed merchant, uint256 amount, string purchaseRef);
    event PointsRedeemed(address indexed consumer, address indexed merchant, uint256 amount, string rewardId);
    event ProductPurchased(address indexed customer, address indexed merchant, bytes32 productIdHash, uint256 price, uint256 points);
    event ProtocolFeeCollected(address indexed from, uint256 amount);
    
    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 maxSupply,
        uint256 _baseMintFee,
        uint256 _feeRatePerThousand,
        uint256 _solToPointsRatio,
        address _protocolTreasury
    ) Ownable(msg.sender) {
        require(_protocolTreasury != address(0), "LoyaltyPlatform: Invalid treasury");
        require(_solToPointsRatio > 0, "LoyaltyPlatform: Invalid ratio");
        
        loyaltyToken = new LoyaltyToken(tokenName, tokenSymbol, maxSupply, address(this));
        protocolTreasury = _protocolTreasury;
        baseMintFee = _baseMintFee;
        feeRatePerThousand = _feeRatePerThousand;
        solToPointsRatio = _solToPointsRatio;
        isActive = true;
        
        emit PlatformInitialized(msg.sender, address(loyaltyToken), _protocolTreasury);
    }
    
    modifier onlyActivePlatform() {
        require(isActive, "LoyaltyPlatform: Platform is not active");
        _;
    }
    
    modifier onlyAuthorizedMerchant() {
        require(merchants[msg.sender].isAuthorized, "LoyaltyPlatform: Merchant not authorized");
        _;
    }
    
    /**
     * @dev Register a new merchant (admin only)
     */
    function registerMerchant(address merchant, uint256 mintAllowance) external onlyOwner {
        require(merchant != address(0), "LoyaltyPlatform: Invalid merchant address");
        require(!merchants[merchant].isAuthorized, "LoyaltyPlatform: Merchant already registered");
        
        merchants[merchant] = MerchantRecord({
            isAuthorized: true,
            mintAllowance: mintAllowance,
            totalMinted: 0,
            totalRedeemed: 0,
            totalFeesPaid: 0,
            registeredAt: block.timestamp
        });
        
        merchantCount++;
        emit MerchantRegistered(merchant, mintAllowance);
    }
    
    /**
     * @dev Revoke merchant authorization (admin only)
     */
    function revokeMerchant(address merchant) external onlyOwner {
        require(merchants[merchant].isAuthorized, "LoyaltyPlatform: Merchant not authorized");
        
        merchants[merchant].isAuthorized = false;
        merchantCount--;
        emit MerchantRevoked(merchant);
    }
    
    /**
     * @dev Calculate protocol fee for minting points
     */
    function calculateMintFee(uint256 amount) public view returns (uint256) {
        uint256 pointsInThousands = (amount + 999) / 1000; // Round up
        return baseMintFee + (pointsInThousands * feeRatePerThousand);
    }
    
    /**
     * @dev Mint loyalty points to a consumer (merchant only)
     */
    function mintPoints(
        address consumer,
        uint256 amount,
        string calldata purchaseReference
    ) external payable onlyActivePlatform onlyAuthorizedMerchant nonReentrant {
        require(consumer != address(0), "LoyaltyPlatform: Invalid consumer address");
        require(amount > 0, "LoyaltyPlatform: Invalid amount");
        require(bytes(purchaseReference).length <= 64, "LoyaltyPlatform: Reference too long");
        
        MerchantRecord storage merchant = merchants[msg.sender];
        require(
            merchant.mintAllowance == 0 || merchant.totalMinted + amount <= merchant.mintAllowance,
            "LoyaltyPlatform: Mint allowance exceeded"
        );
        
        // Calculate and collect protocol fee
        uint256 fee = calculateMintFee(amount);
        require(msg.value >= fee, "LoyaltyPlatform: Insufficient fee payment");
        
        // Transfer fee to treasury
        (bool success, ) = protocolTreasury.call{value: fee}("");
        require(success, "LoyaltyPlatform: Fee transfer failed");
        
        // Refund excess
        if (msg.value > fee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - fee}("");
            require(refundSuccess, "LoyaltyPlatform: Refund failed");
        }
        
        // Mint tokens
        loyaltyToken.mint(consumer, amount, msg.sender);
        
        // Update merchant stats
        merchant.totalMinted += amount;
        merchant.totalFeesPaid += fee;
        totalFeesCollected += fee;
        
        emit PointsMinted(consumer, msg.sender, amount, purchaseReference);
        emit ProtocolFeeCollected(msg.sender, fee);
    }
    
    /**
     * @dev Purchase product with ETH and earn loyalty points
     */
    function purchaseProductWithETH(
        address merchant,
        bytes32 productIdHash,
        uint256 loyaltyPointsReward
    ) external payable onlyActivePlatform nonReentrant {
        require(merchant != address(0), "LoyaltyPlatform: Invalid merchant");
        require(merchants[merchant].isAuthorized, "LoyaltyPlatform: Merchant not authorized");
        require(msg.value > 0, "LoyaltyPlatform: Invalid payment amount");
        require(loyaltyPointsReward > 0, "LoyaltyPlatform: Invalid points reward");
        
        // Calculate protocol fee
        uint256 protocolFee = calculateMintFee(loyaltyPointsReward);
        require(msg.value > protocolFee, "LoyaltyPlatform: Payment too low to cover fee");
        
        uint256 merchantPayment = msg.value - protocolFee;
        
        // Transfer to merchant
        (bool merchantSuccess, ) = merchant.call{value: merchantPayment}("");
        require(merchantSuccess, "LoyaltyPlatform: Merchant payment failed");
        
        // Transfer protocol fee to treasury
        (bool treasurySuccess, ) = protocolTreasury.call{value: protocolFee}("");
        require(treasurySuccess, "LoyaltyPlatform: Fee transfer failed");
        
        // Mint loyalty points to customer
        loyaltyToken.mint(msg.sender, loyaltyPointsReward, merchant);
        
        // Update merchant stats
        merchants[merchant].totalMinted += loyaltyPointsReward;
        merchants[merchant].totalFeesPaid += protocolFee;
        totalFeesCollected += protocolFee;
        
        // Create purchase record
        bytes32 purchaseId = keccak256(abi.encodePacked(msg.sender, merchant, productIdHash, block.timestamp));
        purchases[purchaseId] = PurchaseRecord({
            customer: msg.sender,
            merchant: merchant,
            productIdHash: productIdHash,
            pricePaid: msg.value,
            loyaltyPointsEarned: loyaltyPointsReward,
            timestamp: block.timestamp
        });
        
        emit ProductPurchased(msg.sender, merchant, productIdHash, msg.value, loyaltyPointsReward);
        emit ProtocolFeeCollected(merchant, protocolFee);
    }
    
    /**
     * @dev Redeem loyalty points at a merchant (burns points)
     */
    function redeemPoints(
        address merchant,
        uint256 amount,
        string calldata rewardId
    ) external onlyActivePlatform nonReentrant {
        require(merchant != address(0), "LoyaltyPlatform: Invalid merchant");
        require(merchants[merchant].isAuthorized, "LoyaltyPlatform: Merchant not authorized");
        require(amount > 0, "LoyaltyPlatform: Invalid amount");
        require(loyaltyToken.balanceOf(msg.sender) >= amount, "LoyaltyPlatform: Insufficient balance");
        
        // Burn tokens
        loyaltyToken.burn(msg.sender, amount, merchant);
        
        // Update merchant stats
        merchants[merchant].totalRedeemed += amount;
        
        emit PointsRedeemed(msg.sender, merchant, amount, rewardId);
    }
    
    /**
     * @dev Purchase product with loyalty points (burns points)
     */
    function purchaseProductWithPoints(
        address merchant,
        bytes32 productIdHash,
        uint256 pointsAmount
    ) external onlyActivePlatform nonReentrant {
        require(merchant != address(0), "LoyaltyPlatform: Invalid merchant");
        require(merchants[merchant].isAuthorized, "LoyaltyPlatform: Merchant not authorized");
        require(pointsAmount > 0, "LoyaltyPlatform: Invalid amount");
        require(loyaltyToken.balanceOf(msg.sender) >= pointsAmount, "LoyaltyPlatform: Insufficient balance");
        
        // Burn tokens
        loyaltyToken.burn(msg.sender, pointsAmount, merchant);
        
        // Update merchant stats
        merchants[merchant].totalRedeemed += pointsAmount;
        
        // Create purchase record
        bytes32 purchaseId = keccak256(abi.encodePacked(msg.sender, merchant, productIdHash, block.timestamp));
        purchases[purchaseId] = PurchaseRecord({
            customer: msg.sender,
            merchant: merchant,
            productIdHash: productIdHash,
            pricePaid: 0,
            loyaltyPointsEarned: 0,
            timestamp: block.timestamp
        });
        
        emit ProductPurchased(msg.sender, merchant, productIdHash, 0, 0);
    }
    
    /**
     * @dev Merchant deposits ETH to receive loyalty points
     */
    function depositETH() external payable onlyActivePlatform onlyAuthorizedMerchant nonReentrant {
        require(msg.value > 0, "LoyaltyPlatform: Invalid deposit amount");
        
        uint256 pointsToMint = (msg.value * solToPointsRatio) / 1 ether;
        require(pointsToMint > 0, "LoyaltyPlatform: Deposit too small");
        
        // Calculate and deduct protocol fee
        uint256 protocolFee = calculateMintFee(pointsToMint);
        require(msg.value > protocolFee, "LoyaltyPlatform: Deposit too low to cover fee");
        
        // Transfer fee to treasury
        (bool feeSuccess, ) = protocolTreasury.call{value: protocolFee}("");
        require(feeSuccess, "LoyaltyPlatform: Fee transfer failed");
        
        // Mint tokens to merchant
        loyaltyToken.mint(msg.sender, pointsToMint, msg.sender);
        
        // Update stats
        merchants[msg.sender].totalMinted += pointsToMint;
        merchants[msg.sender].totalFeesPaid += protocolFee;
        totalFeesCollected += protocolFee;
        
        emit ProtocolFeeCollected(msg.sender, protocolFee);
    }
    
    /**
     * @dev Update platform settings (admin only)
     */
    function updateSettings(
        uint256 _baseMintFee,
        uint256 _feeRatePerThousand,
        uint256 _solToPointsRatio,
        address _protocolTreasury
    ) external onlyOwner {
        if (_protocolTreasury != address(0)) {
            protocolTreasury = _protocolTreasury;
        }
        baseMintFee = _baseMintFee;
        feeRatePerThousand = _feeRatePerThousand;
        if (_solToPointsRatio > 0) {
            solToPointsRatio = _solToPointsRatio;
        }
    }
    
    /**
     * @dev Toggle platform active status (admin only)
     */
    function setPlatformStatus(bool _isActive) external onlyOwner {
        isActive = _isActive;
    }
    
    /**
     * @dev Get merchant info
     */
    function getMerchantInfo(address merchant) external view returns (MerchantRecord memory) {
        return merchants[merchant];
    }
    
    /**
     * @dev Get platform stats
     */
    function getPlatformStats() external view returns (
        address tokenAddress,
        uint256 totalSupply,
        uint256 maxSupply,
        uint256 _merchantCount,
        uint256 _totalFeesCollected,
        bool _isActive
    ) {
        return (
            address(loyaltyToken),
            loyaltyToken.totalSupply(),
            loyaltyToken.maxSupply(),
            merchantCount,
            totalFeesCollected,
            isActive
        );
    }
}
