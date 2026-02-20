import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../context/UserRoleContext';
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
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPaymentType, setCurrentPaymentType] = useState<'sol' | 'loyalty_points'>('sol');
  const [purchaseMsg, setPurchaseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect merchants away from marketplace
  useEffect(() => {
    if (role === 'merchant') {
      navigate('/', { replace: true });
    }
  }, [role, navigate]);

  // Don't render if merchant
  if (role === 'merchant') {
    return null;
  }

  useEffect(() => { fetchProducts(); }, []);

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
    if (!publicKey) { alert('Please connect your wallet first'); return; }
    if (paymentType === 'loyalty_points' && !product.priceLoyaltyPoints) {
      alert('This product cannot be purchased with loyalty points'); return;
    }

    setProcessing(true);
    setPurchaseMsg(null);
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

      setPurchaseMsg({
        type: 'success',
        text: `✅ Order #${order.orderNumber} confirmed! Tx: ${txSignature.slice(0, 20)}... ${paymentType === 'sol' ? `+${product.loyaltyPointsReward} LP earned!` : `${product.priceLoyaltyPoints} LP redeemed!`}`,
      });
      setSelectedProduct(null);
    } catch (error: any) {
      setPurchaseMsg({ type: 'error', text: `❌ Purchase failed: ${error.message || 'Unknown error'}` });
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

        {/* ── Purchase message ── */}
        {purchaseMsg && (
          <div style={{
            padding: '14px 20px', borderRadius: '12px', marginBottom: '28px',
            fontSize: '0.9rem', fontWeight: 500,
            background: purchaseMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${purchaseMsg.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color: purchaseMsg.type === 'success' ? '#6ee7b7' : '#fca5a5',
          }}>
            {purchaseMsg.text}
          </div>
        )}

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
                <div style={{ padding: '18px' }}>
                  <div style={{
                    display: 'inline-block', padding: '3px 10px',
                    background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                    borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                    marginBottom: '8px',
                  }}>{product.businessName}</div>

                  <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>
                    {product.name}
                  </h3>
                  <p style={{ margin: '0 0 14px', color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, minHeight: '2.5rem' }}>
                    {product.description}
                  </p>

                  {/* Pricing */}
                  <div style={{
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '12px', padding: '12px', marginBottom: '14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: product.priceLoyaltyPoints ? '8px' : '0' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Pay with SOL</span>
                      <span style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '1rem' }}>
                        ◎ {(product.priceSol / 1e9).toFixed(3)}
                      </span>
                    </div>
                    {product.priceLoyaltyPoints && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Pay with Points</span>
                        <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '1rem' }}>
                          💎 {product.priceLoyaltyPoints}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <button
                      onClick={() => { setSelectedProduct(product); setCurrentPaymentType('sol'); setPurchaseMsg(null); }}
                      style={{
                        padding: '11px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(139,92,246,0.3)', transition: 'all 0.2s',
                      }}
                    >◎ Buy with SOL</button>
                    {product.priceLoyaltyPoints && (
                      <button
                        onClick={() => { setSelectedProduct(product); setCurrentPaymentType('loyalty_points'); setPurchaseMsg(null); }}
                        style={{
                          padding: '11px', borderRadius: '10px',
                          border: '1.5px solid rgba(16,185,129,0.4)',
                          background: 'rgba(16,185,129,0.1)',
                          color: '#6ee7b7', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >💎 Buy with Points</button>
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
    </div>
  );
}
