import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { purchaseProductWithSOL, redeemLoyaltyPoints } from '../services/payment';

interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceSol: number;
  priceLoyaltyPoints: number | null;
  loyaltyPointsReward: number;
  stockQuantity: number | null;
  isAvailable: boolean;
  businessName: string;
}

export default function ProductMarketplace() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPaymentType, setCurrentPaymentType] = useState<'sol' | 'loyalty_points'>('sol');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/products?available=true');
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product: Product, paymentType: 'sol' | 'loyalty_points') => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (paymentType === 'loyalty_points' && !product.priceLoyaltyPoints) {
      alert('This product cannot be purchased with loyalty points');
      return;
    }

    setProcessing(true);

    try {
      // Step 1: Create order in backend
      const orderResponse = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerWallet: publicKey.toBase58(),
          productId: product.id,
          paymentType,
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const order = orderData.data;

      // Step 2: Execute blockchain transaction
      let txSignature: string;
      
      if (paymentType === 'sol') {
        // Purchase with SOL - calls purchase_product_with_sol instruction
        txSignature = await purchaseProductWithSOL({
          connection,
          wallet: { publicKey, sendTransaction },
          merchantWallet: order.merchantWallet,
          productId: product.id,
          priceSol: product.priceSol,
          loyaltyPointsReward: product.loyaltyPointsReward,
        });
      } else {
        // Redeem loyalty points - calls redeem_points instruction
        if (!product.priceLoyaltyPoints) {
          throw new Error('Product not available for loyalty points');
        }
        txSignature = await redeemLoyaltyPoints({
          connection,
          wallet: { publicKey, sendTransaction },
          merchantWallet: order.merchantWallet,
          productId: product.id,
          pointsAmount: product.priceLoyaltyPoints,
        });
      }

      // Step 3: Update order with transaction signature
      const updateResponse = await fetch(`http://localhost:3001/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txSignature,
          status: 'confirmed',
        }),
      });

      const updateData = await updateResponse.json();
      if (!updateData.success) {
        console.error('Failed to update order, but transaction succeeded:', txSignature);
      }

      // Success!
      alert(
        `✅ Purchase Successful!\n\n` +
        `Order #: ${order.orderNumber}\n` +
        `Transaction: ${txSignature.slice(0, 20)}...\n\n` +
        (paymentType === 'sol' 
          ? `You earned ${product.loyaltyPointsReward} loyalty points!`
          : `You redeemed ${product.priceLoyaltyPoints} loyalty points!`)
      );

      setSelectedProduct(null);
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(`❌ Purchase failed: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="product-marketplace">
      <div className="marketplace-header">
        <h1>🛒 Product Marketplace</h1>
        <p>Browse and purchase products to earn loyalty points</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p>📦 No products available at the moment</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img src={product.imageUrl} alt={product.name} />
                {product.stockQuantity !== null && product.stockQuantity <= 10 && (
                  <div className="stock-badge">Only {product.stockQuantity} left!</div>
                )}
              </div>

              <div className="product-info">
                <div className="merchant-tag">{product.businessName}</div>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>

                <div className="pricing-section">
                  <div className="price-option">
                    <span className="price-label">Pay with SOL</span>
                    <span className="price-value">◎ {(product.priceSol / 1e9).toFixed(3)}</span>
                  </div>
                  {product.priceLoyaltyPoints && (
                    <div className="price-option">
                      <span className="price-label">Pay with Points</span>
                      <span className="price-value">💎 {product.priceLoyaltyPoints}</span>
                    </div>
                  )}
                  <div className="reward-banner">
                    🎁 Earn +{product.loyaltyPointsReward} points when paying with SOL
                  </div>
                </div>

                <div className="product-actions">
                  <button
                    className="btn-buy-sol"
                    onClick={() => {
                      setSelectedProduct(product);
                      setCurrentPaymentType('sol');
                    }}
                  >
                    ◎ Buy with SOL
                  </button>
                  {product.priceLoyaltyPoints && (
                    <button
                      className="btn-buy-points"
                      onClick={() => {
                        setSelectedProduct(product);
                        setCurrentPaymentType('loyalty_points');
                      }}
                    >
                      💎 Buy with Points
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Purchase</h2>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="purchase-summary">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="modal-product-image" />
                <div className="summary-details">
                  <h3>{selectedProduct.name}</h3>
                  <p className="merchant-name">From: {selectedProduct.businessName}</p>
                  
                  <div className="payment-summary">
                    <div className="summary-row">
                      <span>Payment Method:</span>
                      <span className="highlight">
                        {currentPaymentType === 'sol' ? '◎ SOL' : '💎 Loyalty Points'}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>Amount:</span>
                      <span className="highlight">
                        {currentPaymentType === 'sol' 
                          ? `◎ ${(selectedProduct.priceSol / 1e9).toFixed(3)}`
                          : `💎 ${selectedProduct.priceLoyaltyPoints}`
                        }
                      </span>
                    </div>
                    {currentPaymentType === 'sol' && (
                      <div className="summary-row reward">
                        <span>You'll earn:</span>
                        <span className="highlight">+{selectedProduct.loyaltyPointsReward} points</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setSelectedProduct(null)} disabled={processing}>
                Cancel
              </button>
              <button 
                className="btn-confirm"
                onClick={() => handlePurchase(selectedProduct, currentPaymentType)}
                disabled={processing}
              >
                {processing ? '⏳ Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .product-marketplace {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .marketplace-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .marketplace-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2.5rem;
        }

        .marketplace-header p {
          color: #666;
          font-size: 1.1rem;
        }

        .loading-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #14f195;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: #f8f9fa;
          border-radius: 12px;
          color: #666;
          font-size: 1.2rem;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }

        .product-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .product-image {
          position: relative;
          width: 100%;
          height: 240px;
          overflow: hidden;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .product-card:hover .product-image img {
          transform: scale(1.05);
        }

        .stock-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 152, 0, 0.95);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .product-info {
          padding: 1.5rem;
        }

        .merchant-tag {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
        }

        .product-name {
          margin: 0 0 0.5rem 0;
          font-size: 1.4rem;
          color: #333;
        }

        .product-description {
          color: #666;
          margin: 0 0 1.5rem 0;
          line-height: 1.5;
          min-height: 3rem;
        }

        .pricing-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1rem;
        }

        .price-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
        }

        .price-label {
          color: #666;
          font-size: 0.9rem;
        }

        .price-value {
          font-size: 1.2rem;
          font-weight: 700;
          color: #14f195;
        }

        .reward-banner {
          background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%);
          color: white;
          padding: 0.75rem;
          border-radius: 8px;
          text-align: center;
          margin-top: 0.75rem;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .product-actions {
          display: grid;
          gap: 0.75rem;
        }

        .product-actions button {
          padding: 0.875rem;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-buy-sol {
          background: #14f195;
          color: black;
        }

        .btn-buy-sol:hover {
          background: #0fd980;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(20, 241, 149, 0.4);
        }

        .btn-buy-points {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-buy-points:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #666;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .purchase-summary {
          display: flex;
          gap: 1.5rem;
        }

        .modal-product-image {
          width: 120px;
          height: 120px;
          object-fit: cover;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .summary-details {
          flex: 1;
        }

        .summary-details h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.3rem;
        }

        .merchant-name {
          color: #666;
          margin: 0 0 1rem 0;
        }

        .payment-summary {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .summary-row:last-child {
          border-bottom: none;
        }

        .summary-row.reward {
          background: #fff3cd;
          margin: 0.5rem -1rem -1rem;
          padding: 0.75rem 1rem;
          border-radius: 0 0 8px 8px;
          border-bottom: none;
        }

        .summary-row .highlight {
          font-weight: 700;
          color: #14f195;
        }

        .modal-footer {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid #e0e0e0;
        }

        .modal-footer button {
          flex: 1;
          padding: 0.875rem;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: #f0f0f0;
          color: #333;
        }

        .btn-cancel:hover {
          background: #e0e0e0;
        }

        .btn-confirm {
          background: #14f195;
          color: black;
        }

        .btn-confirm:hover {
          background: #0fd980;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(20, 241, 149, 0.4);
        }

        @media (max-width: 768px) {
          .products-grid {
            grid-template-columns: 1fr;
          }

          .purchase-summary {
            flex-direction: column;
          }

          .modal-product-image {
            width: 100%;
            height: 200px;
          }
        }
      `}</style>
    </div>
  );
}
