import { FC, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface Transaction {
  id: string;
  txType: 'mint' | 'redeem';
  pointsAmount: number;
  merchantWallet?: string;
  createdAt: Date;
}

const ConsumerDashboard: FC = () => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!publicKey) return;
      setLoading(true);
      try {
        // SOL balance
        const bal = await connection.getBalance(publicKey);
        setSolBalance(bal / LAMPORTS_PER_SOL);

        // LP token balance
        const { PublicKey: SolPublicKey } = await import('@solana/web3.js');
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const programId = new SolPublicKey(import.meta.env.VITE_PROGRAM_ID);
        const [tokenMintPDA] = SolPublicKey.findProgramAddressSync([Buffer.from('loyalty_mint')], programId);
        const ata = await getAssociatedTokenAddress(tokenMintPDA, publicKey);
        try {
          const info = await connection.getTokenAccountBalance(ata);
          if (info?.value) setLoyaltyBalance(info.value.uiAmount || 0);
        } catch { /* no token account yet */ }

        // Transactions
        const res = await fetch(`http://localhost:3001/api/users/${publicKey.toBase58()}/transactions`);
        const data = await res.json();
        if (data.success) setTransactions(data.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  const shortWallet = publicKey
    ? `${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-6)}`
    : '';

  if (!connected) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #0f0c29 100%)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '40px 24px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '20px', margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem', boxShadow: '0 8px 30px rgba(139,92,246,0.4)',
          }}>🔐</div>
          <h2 style={{ margin: '0 0 10px', color: '#fff', fontSize: '1.6rem', fontWeight: 800 }}>Connect Your Wallet</h2>
          <p style={{ margin: '0 0 28px', color: '#94a3b8', lineHeight: 1.6 }}>
            Connect your Solana wallet to view your loyalty points and transaction history
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  const timesEarned = transactions.filter(t => t.txType === 'mint').length;
  const redemptions = transactions.filter(t => t.txType === 'redeem').length;
  const merchantsVisited = new Set(transactions.map(t => t.merchantWallet)).size;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #0f0c29 100%)',
      padding: '36px 24px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            My Loyalty Points
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            Track your earnings, redemptions, and rewards
          </p>
        </div>

        {/* ── LP Balance Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
          borderRadius: '20px', padding: '32px', marginBottom: '24px',
          boxShadow: '0 8px 40px rgba(139,92,246,0.45)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* background glow orb */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              YOUR LOYALTY POINTS
            </div>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
              {loyaltyBalance.toLocaleString()}
              <span style={{ fontSize: '1.2rem', fontWeight: 600, marginLeft: '8px', color: 'rgba(255,255,255,0.75)' }}>PTS</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '24px', marginTop: '20px',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>SOL Balance</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>◎ {solBalance.toFixed(4)}</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.2)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>Wallet</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'monospace' }}>{shortWallet}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { icon: '⚡', label: 'Times Earned', value: timesEarned, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
            { icon: '💎', label: 'Redemptions', value: redemptions, color: '#6ee7b7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
            { icon: '🏪', label: 'Merchants Visited', value: merchantsVisited, color: '#fcd34d', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: stat.bg, border: `1.5px solid ${stat.border}`,
              borderRadius: '16px', padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Transaction History ── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '18px', padding: '24px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.3rem' }}>📋</span>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Transaction History</h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '3px solid rgba(139,92,246,0.2)', borderTop: '3px solid #8b5cf6',
                animation: 'spin 0.9s linear infinite', margin: '0 auto 12px',
              }} />
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px',
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)',
              borderRadius: '12px', color: '#475569',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📝</div>
              <div style={{ fontWeight: 600, color: '#64748b' }}>No transactions yet</div>
              <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Start shopping to earn loyalty points</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {transactions.map((tx) => (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: tx.txType === 'mint' ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                  border: `1px solid ${tx.txType === 'mint' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '10px',
                      background: tx.txType === 'mint' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem',
                    }}>{tx.txType === 'mint' ? '⬆️' : '⬇️'}</div>
                    <div>
                      <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>
                        {tx.txType === 'mint' ? 'Points Earned' : 'Points Redeemed'}
                      </div>
                      {tx.merchantWallet && (
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '2px' }}>
                          {tx.merchantWallet.slice(0, 8)}...{tx.merchantWallet.slice(-4)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 800, fontSize: '1rem',
                      color: tx.txType === 'mint' ? '#6ee7b7' : '#fca5a5',
                    }}>
                      {tx.txType === 'mint' ? '+' : '-'}{tx.pointsAmount.toLocaleString()} LP
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Wallet Info ── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '18px', padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Connected Wallet</div>
            <code style={{ color: '#a78bfa', fontSize: '0.88rem' }}>{publicKey?.toBase58()}</code>
          </div>
          <a
            href={`https://explorer.solana.com/address/${publicKey?.toBase58()}?cluster=custom&customUrl=http://localhost:8899`}
            target="_blank" rel="noopener noreferrer"
            style={{
              padding: '10px 18px', borderRadius: '10px',
              border: '1.5px solid rgba(139,92,246,0.4)',
              background: 'transparent', color: '#a78bfa',
              fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none',
              transition: 'background 0.2s',
            }}
          >View on Explorer ↗</a>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  );
};

export default ConsumerDashboard;
