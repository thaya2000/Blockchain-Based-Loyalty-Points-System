import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../context/UserRoleContext';
import { purchaseProductWithSOL, redeemLoyaltyPoints } from '../services/payment';
import MessageModal from '../components/MessageModal';

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
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPaymentType, setCurrentPaymentType] = useState<'sol' | 'loyalty_points'>('sol');
  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title?: string;
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  // Redirect merchants away from marketplace
  useEffect(() => {
    if (role === 'merchant') {
      navigate('/', { replace: true });
    }
  }, [role, navigate]);

  useEffect(() => {
    if (role !== 'merchant') fetchProducts();
  }, [role]);

  // Don't render if merchant (after all hooks have been called)
  if (role === 'merchant') {
    return null;
  }


  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/products?available=true');
      const data = await response.json();
      if (data.success) setProducts(data.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product: Product, paymentType: 'sol' | 'loyalty_points') => {
    if (!publicKey) { 
      setMessageModal({
        isOpen: true,
        type: 'info',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet first to make a purchase.',
      });
      return; 
    }
    if (paymentType === 'loyalty_points' && !product.priceLoyaltyPoints) {
      setMessageModal({
        isOpen: true,
        type: 'info',
        title: 'Not Available',
        message: 'This product cannot be purchased with loyalty points.',
      });
      return;
    }

    setProcessing(true);
    try {
      const orderResponse = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerWallet: publicKey.toBase58(), productId: product.id, paymentType }),
      });
      const orderData = await orderResponse.json();
      if (!orderData.success) throw new Error(orderData.error || 'Failed to create order');
      const order = orderData.data;

      let txSignature: string;
      if (paymentType === 'sol') {
        txSignature = await purchaseProductWithSOL({
          connection, wallet: { publicKey, sendTransaction },
          merchantWallet: order.merchantWallet, productId: product.id,
          priceSol: product.priceSol, loyaltyPointsReward: product.loyaltyPointsReward,
        });
      } else {
        if (!product.priceLoyaltyPoints) throw new Error('Product not available for loyalty points');
        txSignature = await redeemLoyaltyPoints({
          connection, wallet: { publicKey, sendTransaction },
          merchantWallet: order.merchantWallet, productId: product.id,
          pointsAmount: product.priceLoyaltyPoints,
        });
      }

      await fetch(`http://localhost:3001/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txSignature, status: 'confirmed' }),
      });

      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'Purchase Successful',
        message: `Order #${order.orderNumber}\n\n${product.name} purchased\n\n${
          paymentType === 'sol' 
            ? `You earned ${product.loyaltyPointsReward} LP` 
            : `You redeemed ${product.priceLoyaltyPoints} LP`
        }\n\nTx: ${txSignature.slice(0, 16)}...${txSignature.slice(-8)}`,
      });
      setSelectedProduct(null);
    } catch (error: any) {
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Purchase Failed',
        message: error.message || 'An unexpected error occurred during the purchase. Please try again.',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #0f0c29 100%)',
      padding: '36px 24px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '12px',
            background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '50px', padding: '8px 20px', marginBottom: '16px',
          }}>
            <span style={{ fontSize: '1rem' }}>🛒</span>
            <span style={{ color: '#c4b5fd', fontSize: '0.88rem', fontWeight: 600 }}>Product Marketplace</span>
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: '2.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Browse & Earn Loyalty Points
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>
            Purchase products with SOL or redeem your loyalty points
          </p>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '3px solid rgba(139,92,246,0.2)',
              borderTop: '3px solid #8b5cf6',
              animation: 'spin 0.9s linear infinite',
              margin: '0 auto 16px',
            }} />
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '18px', color: '#475569',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
            <div style={{ fontWeight: 600, color: '#64748b' }}>No products available yet</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Check back later for new listings</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '24px',
          }}>
            {products.map((product) => (
              <div key={product.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(255,255,255,0.09)',
                borderRadius: '18px',
                overflow: 'hidden',
                transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.4)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.09)';
                }}
              >
                {/* Image */}
                <div style={{ position: 'relative', height: '210px', overflow: 'hidden', background: 'rgba(15,12,41,0.6)' }}>
                  <img
                    src={product.imageUrl} alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  {product.stockQuantity !== null && product.stockQuantity <= 10 && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      background: 'rgba(245,158,11,0.92)', color: '#fff',
                      padding: '4px 12px', borderRadius: '20px',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}>Only {product.stockQuantity} left!</div>
                  )}
                  {/* Points reward badge */}
                  <div style={{
                    position: 'absolute', bottom: 10, left: 12,
                    background: 'rgba(16,185,129,0.88)', color: '#fff',
                    padding: '4px 12px', borderRadius: '20px',
                    fontSize: '0.75rem', fontWeight: 700,
                  }}>🎁 +{product.loyaltyPointsReward} LP</div>
                </div>

                {/* Info */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                  {/* Header with Product Name */}
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
                      {product.name}
                    </h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.4 }}>
                      {product.description}
                    </p>
                  </div>

                  {/* Merchant & Stock Info Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    {/* Merchant Name Badge */}
                    <div style={{
                      padding: '9px 12px',
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(14,165,233,0.15) 100%)',
                      border: '1px solid rgba(59,130,246,0.4)',
                      borderRadius: '9px',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: '#60a5fa',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(59,130,246,0.08)'
                    }}>
                      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🏢</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.businessName || 'Unknown'}
                      </span>
                    </div>

                    {/* Stock Status Badge */}
                    <div style={{
                      padding: '9px 12px',
                      background: product.stockQuantity === null || product.stockQuantity > 0 
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.15) 100%)'
                        : 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.15) 100%)',
                      border: `1px solid ${product.stockQuantity === null || product.stockQuantity > 0 
                        ? 'rgba(16,185,129,0.4)'
                        : 'rgba(239,68,68,0.4)'}`,
                      borderRadius: '9px',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: product.stockQuantity === null || product.stockQuantity > 0 ? '#10b981' : '#ef4444',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      boxShadow: `0 2px 8px ${product.stockQuantity === null || product.stockQuantity > 0 
                        ? 'rgba(16,185,129,0.08)'
                        : 'rgba(239,68,68,0.08)'}`
                    }}>
                      <span style={{ fontSize: '0.9rem' }}>
                        {product.stockQuantity === null || product.stockQuantity > 0 ? '📦' : '🚫'}
                      </span>
                      <span>
                        {product.stockQuantity === null 
                          ? 'Unlimited' 
                          : product.stockQuantity > 0
                          ? `${product.stockQuantity} left`
                          : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & Purchase Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '0' }}>
                    {/* SOL Price Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.15) 100%)',
                      border: '1.5px solid rgba(139,92,246,0.4)',
                      borderRadius: '11px',
                      padding: '14px',
                      textAlign: 'center',
                      transition: 'all 0.3s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.6)';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px rgba(139,92,246,0.15)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.4)';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ color: '#cbd5e1', fontSize: '0.7rem', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>SOL Price</div>
                      <div style={{ color: '#c084fc', fontWeight: 900, fontSize: '1.4rem' }}>
                        ◎ {(product.priceSol / 1e9).toFixed(3)}
                      </div>
                    </div>

                    {/* LP Price Card */}
                    {product.priceLoyaltyPoints && (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.15) 100%)',
                        border: '1.5px solid rgba(16,185,129,0.4)',
                        borderRadius: '11px',
                        padding: '14px',
                        textAlign: 'center',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                      }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.6)';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px rgba(16,185,129,0.15)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.4)';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ color: '#cbd5e1', fontSize: '0.7rem', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Points Price</div>
                        <div style={{ color: '#6ee7b7', fontWeight: 900, fontSize: '1.4rem' }}>
                          💎 {product.priceLoyaltyPoints}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Purchase Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                    <button
                      onClick={() => { setSelectedProduct(product); setCurrentPaymentType('sol'); }}
                      style={{
                        padding: '14px 18px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                        color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(139,92,246,0.4)', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(139,92,246,0.6)';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(139,92,246,0.4)';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                      }}
                    >◎ Buy SOL</button>
                    {product.priceLoyaltyPoints ? (
                      <button
                        onClick={() => { setSelectedProduct(product); setCurrentPaymentType('loyalty_points'); }}
                        style={{
                          padding: '14px 18px', borderRadius: '10px', border: '2px solid rgba(16,185,129,0.6)',
                          background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)',
                          color: '#10b981', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(16,185,129,0.2)', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.15) 100%)';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(16,185,129,0.35)';
                          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(16,185,129,0.2)';
                          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                        }}
                      >💎 Buy Points</button>
                    ) : (
                      <div style={{
                        padding: '14px 18px', borderRadius: '10px',
                        background: 'rgba(99,102,241,0.08)',
                        color: '#6b7280', fontWeight: 700, fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>Not Available</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #1a1040, #0f0c29)',
              border: '1.5px solid rgba(139,92,246,0.35)',
              borderRadius: '20px', width: '100%', maxWidth: '480px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>Confirm Purchase</h2>
              <button onClick={() => setSelectedProduct(null)} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
                width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} style={{
                  width: 100, height: 100, objectFit: 'cover', borderRadius: '12px', flexShrink: 0,
                  border: '1.5px solid rgba(139,92,246,0.3)',
                }} />
                <div>
                  <h3 style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 700 }}>
                    {selectedProduct.name}
                  </h3>
                  <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: '0.82rem' }}>
                    From: {selectedProduct.businessName}
                  </p>
                  <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: '0.82rem' }}>
                    {selectedProduct.stockQuantity === null 
                      ? '📦 Unlimited Stock' 
                      : selectedProduct.stockQuantity > 0
                      ? `📦 ${selectedProduct.stockQuantity} in stock`
                      : '❌ Out of Stock'}
                  </p>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px',
                    background: currentPaymentType === 'sol' ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.2)',
                    color: currentPaymentType === 'sol' ? '#c4b5fd' : '#6ee7b7',
                    borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                  }}>
                    {currentPaymentType === 'sol' ? '◎ Paying with SOL' : '💎 Paying with Points'}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div style={{
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '12px', padding: '14px',
              }}>
                {[
                  { label: 'Payment Method', value: currentPaymentType === 'sol' ? '◎ SOL' : '💎 Loyalty Points' },
                  {
                    label: 'Amount',
                    value: currentPaymentType === 'sol'
                      ? `◎ ${(selectedProduct.priceSol / 1e9).toFixed(3)}`
                      : `💎 ${selectedProduct.priceLoyaltyPoints}`,
                  },
                  ...(currentPaymentType === 'sol'
                    ? [{ label: "You'll earn", value: `+${selectedProduct.loyaltyPointsReward} LP 🎉` }]
                    : []),
                ].map((row, i, arr) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>{row.label}</span>
                    <span style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '0.95rem' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex', gap: '12px', padding: '16px 24px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}>
              <button
                onClick={() => setSelectedProduct(null)} disabled={processing}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  background: 'transparent', color: '#94a3b8',
                  fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={() => handlePurchase(selectedProduct, currentPaymentType)}
                disabled={processing}
                style={{
                  flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                  background: processing ? '#4c1d95' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
                }}
              >{processing ? '⏳ Processing...' : '✓ Confirm Purchase'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal({ isOpen: false, type: 'success', message: '' })}
        autoCloseDuration={messageModal.type === 'success' ? 3000 : 4000}
      />    </div>
  );
}