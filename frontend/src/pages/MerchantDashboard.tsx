import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useUserRole } from '../context/UserRoleContext';
import ProductManagement from '../components/ProductManagement';

interface MerchantInfo {
  id: string;
  walletAddress: string;
  businessName: string;
  category?: string;
  status: string;
  isActive?: boolean;
  onChainAuthorized?: boolean;
}

const SOL_TO_POINTS_RATIO = 100;

const MerchantDashboard: FC = () => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMessage, setDepositMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
  const [showProductForm, setShowProductForm] = useState(false);

  const estimatedPoints = depositAmount
    ? (parseFloat(depositAmount) * SOL_TO_POINTS_RATIO).toFixed(0)
    : '0';

  // Redirect if not a merchant
  useEffect(() => {
    if (role && role !== 'merchant') {
      navigate('/', { replace: true });
    }
  }, [role, navigate]);

  if (!role || role !== 'merchant') return null;

  // Fetch wallet SOL + LP token balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicKey) return;
      try {
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);

        const { PublicKey: SolPublicKey } = await import('@solana/web3.js');
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const programId = new SolPublicKey(import.meta.env.VITE_PROGRAM_ID);
        const [tokenMintPDA] = SolPublicKey.findProgramAddressSync(
          [Buffer.from('loyalty_mint')],
          programId
        );
        const merchantTokenAccount = await getAssociatedTokenAddress(tokenMintPDA, publicKey);
        const tokenAccountInfo = await connection.getTokenAccountBalance(merchantTokenAccount);
        if (tokenAccountInfo?.value) {
          setLoyaltyBalance(tokenAccountInfo.value.uiAmount || 0);
        }
      } catch (error: any) {
        if (!error?.message?.includes('could not find account')) {
          console.error('Failed to fetch balances:', error);
        }
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  // Fetch merchant info from backend
  useEffect(() => {
    const fetchMerchantInfo = async () => {
      if (!publicKey) return;
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/merchants/${publicKey.toBase58()}`);
        const data = await response.json();
        if (data.success) setMerchantInfo(data.data);
      } catch (error) {
        console.error('Failed to fetch merchant info:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMerchantInfo();
  }, [publicKey]);

  const handleDepositSol = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositMessage(null);

    if (!publicKey || !depositAmount || parseFloat(depositAmount) <= 0) {
      setDepositMessage({ type: 'error', text: 'Please enter a valid SOL amount.' });
      return;
    }
    if (parseFloat(depositAmount) > walletBalance) {
      setDepositMessage({ type: 'error', text: `Insufficient balance. You have ${walletBalance.toFixed(4)} SOL.` });
      return;
    }

    setDepositLoading(true);
    try {
      const solAmountLamports = Math.floor(parseFloat(depositAmount) * LAMPORTS_PER_SOL);
      const { Transaction, SystemProgram, PublicKey: SolPublicKey, TransactionInstruction } = await import('@solana/web3.js');
      const { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
      const jsSha256 = await import('js-sha256');

      const programId = new SolPublicKey(import.meta.env.VITE_PROGRAM_ID);
      const protocolTreasury = new SolPublicKey(import.meta.env.VITE_PLATFORM_AUTHORITY);

      const [platformStatePDA] = SolPublicKey.findProgramAddressSync([Buffer.from('platform_state')], programId);
      const [tokenMintPDA] = SolPublicKey.findProgramAddressSync([Buffer.from('loyalty_mint')], programId);
      const [merchantRecordPDA] = SolPublicKey.findProgramAddressSync([Buffer.from('merchant'), publicKey.toBuffer()], programId);
      const merchantTokenAccount = await getAssociatedTokenAddress(tokenMintPDA, publicKey);

      const discriminator = Buffer.from(jsSha256.sha256.array('global:deposit_sol').slice(0, 8));
      const argsBuffer = Buffer.alloc(8);
      argsBuffer.writeBigUInt64LE(BigInt(solAmountLamports), 0);
      const data = Buffer.concat([discriminator, argsBuffer]);

      const depositIx = new TransactionInstruction({
        programId,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: protocolTreasury, isSigner: false, isWritable: true },
          { pubkey: platformStatePDA, isSigner: false, isWritable: true },
          { pubkey: merchantRecordPDA, isSigner: false, isWritable: true },
          { pubkey: tokenMintPDA, isSigner: false, isWritable: true },
          { pubkey: merchantTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });

      const transaction = new Transaction().add(depositIx);
      const signature = await sendTransaction(transaction, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, blockhash: latestBlockhash.blockhash, lastValidBlockHeight: latestBlockhash.lastValidBlockHeight });

      const pointsReceived = parseFloat(depositAmount) * SOL_TO_POINTS_RATIO;
      setLoyaltyBalance((prev) => prev + pointsReceived);
      setDepositMessage({
        type: 'success',
        text: `✅ Deposited ${depositAmount} SOL — received ${pointsReceived.toLocaleString()} LP | Tx: ${signature.slice(0, 20)}...`,
      });
      setDepositAmount('');

      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);
    } catch (error: any) {
      setDepositMessage({ type: 'error', text: `Deposit failed: ${error.message || 'Unknown error'}` });
    } finally {
      setDepositLoading(false);
    }
  };

  if (!connected) return null;

  const shortWallet = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const statusColor =
    merchantInfo?.status === 'approved'
      ? '#10b981'
      : merchantInfo?.status === 'pending'
      ? '#f59e0b'
      : '#ef4444';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #0f0c29 100%)',
      padding: '32px 24px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}>🏪</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
                {merchantInfo?.businessName || 'Merchant Dashboard'}
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', marginTop: '2px' }}>
                {shortWallet} &nbsp;·&nbsp;
                <span style={{ color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>
                  ● {merchantInfo?.status || 'Loading...'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}>
          {/* LP Balance */}
          <div style={cardStyle('#8b5cf6', '#6366f1')}>
            <div style={statIconStyle}>🏆</div>
            <div style={{ color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>LP Balance</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{loyaltyBalance.toLocaleString()}</div>
            <div style={{ fontSize: '0.78rem', color: '#a78bfa', marginTop: '4px' }}>Loyalty Points</div>
          </div>

          {/* SOL Balance */}
          <div style={cardStyle('#0ea5e9', '#06b6d4')}>
            <div style={statIconStyle}>◎</div>
            <div style={{ color: '#bae6fd', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>SOL Balance</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{walletBalance.toFixed(3)}</div>
            <div style={{ fontSize: '0.78rem', color: '#7dd3fc', marginTop: '4px' }}>Available to deposit</div>
          </div>

          {/* Rate */}
          <div style={cardStyle('#10b981', '#059669')}>
            <div style={statIconStyle}>⚡</div>
            <div style={{ color: '#a7f3d0', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Conversion Rate</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>1:100</div>
            <div style={{ fontSize: '0.78rem', color: '#6ee7b7', marginTop: '4px' }}>1 SOL = 100 LP</div>
          </div>

          {/* Category */}
          <div style={cardStyle('#f59e0b', '#d97706')}>
            <div style={statIconStyle}>🏷️</div>
            <div style={{ color: '#fde68a', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Category</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{merchantInfo?.category || 'General'}</div>
            <div style={{ fontSize: '0.78rem', color: '#fcd34d', marginTop: '4px' }}>Business type</div>
          </div>
        </div>

        {/* ── Deposit Section ── */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.4rem' }}>💰</span>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Deposit SOL → Earn Loyalty Points
            </h2>
          </div>
          <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Convert SOL into LP tokens to distribute as customer rewards across the entire platform.
          </p>

          {depositMessage && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              fontWeight: 500,
              background: depositMessage.type === 'success'
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(239,68,68,0.15)',
              border: `1px solid ${depositMessage.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: depositMessage.type === 'success' ? '#6ee7b7' : '#fca5a5',
            }}>
              {depositMessage.text}
            </div>
          )}

          <form onSubmit={handleDepositSol}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '16px', alignItems: 'end' }}>
              {/* Input */}
              <div>
                <label style={labelStyle}>SOL Amount</label>
                <input
                  type="number"
                  placeholder="e.g. 1.0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0.001"
                  max={walletBalance > 0 ? walletBalance.toFixed(4) : undefined}
                  step="0.001"
                  required
                  style={inputStyle}
                />
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                  Available: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{walletBalance.toFixed(4)} SOL</span>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ paddingBottom: '28px', color: '#8b5cf6', fontSize: '1.5rem', fontWeight: 700 }}>→</div>

              {/* Preview */}
              <div style={{
                background: 'rgba(139,92,246,0.1)',
                border: '1.5px solid rgba(139,92,246,0.4)',
                borderRadius: '12px',
                padding: '14px 20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>You will receive</div>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#c4b5fd', lineHeight: 1 }}>
                  {parseFloat(estimatedPoints).toLocaleString()} LP
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '4px' }}>at 100 LP per SOL</div>
              </div>

              {/* Button */}
              <div style={{ paddingBottom: '28px' }}>
                <button
                  type="submit"
                  disabled={
                    merchantInfo?.status !== 'approved' ||
                    depositLoading ||
                    !depositAmount ||
                    parseFloat(depositAmount) <= 0
                  }
                  style={{
                    padding: '0 28px',
                    height: '52px',
                    borderRadius: '12px',
                    border: 'none',
                    background: merchantInfo?.status !== 'approved'
                      ? '#374151'
                      : depositLoading
                      ? '#4c1d95'
                      : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: merchantInfo?.status !== 'approved' ? '#6b7280' : '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: merchantInfo?.status !== 'approved' ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: merchantInfo?.status === 'approved' ? '0 4px 20px rgba(139,92,246,0.4)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {depositLoading ? '⏳ Depositing...' : '💎 Deposit SOL'}
                </button>
              </div>
            </div>

            {merchantInfo?.status !== 'approved' && (
              <div style={{
                marginTop: '12px',
                fontSize: '0.83rem',
                color: '#f59e0b',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
              }}>
                ⚠️ Your merchant account is <strong>{merchantInfo?.status || 'pending'}</strong>. Deposits will be enabled once approved by the admin.
              </div>
            )}
          </form>
        </div>

        {/* ── Product Management ── */}
        {merchantInfo && merchantInfo.status === 'approved' && (
          <div style={{ ...sectionCard, marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>📦</span>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Product Management</h2>
              </div>
            </div>
            <ProductManagement merchantId={merchantInfo.id} />
          </div>
        )}

        {/* ── Recent Transactions placeholder ── */}
        <div style={{ ...sectionCard, marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>📋</span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Recent Transactions</h2>
            </div>
            <button style={{
              padding: '8px 18px', borderRadius: '8px', border: '1.5px solid rgba(139,92,246,0.4)',
              background: 'transparent', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}>View All</button>
          </div>
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            color: '#475569', borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📝</div>
            <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>No transactions yet</div>
            <div style={{ fontSize: '0.83rem', color: '#374151' }}>Deposits and customer purchases will appear here</div>
          </div>
        </div>

      </div>
    </div>
  );
};

// ── Shared styles ──────────────────────────────────────────────────────────────

function cardStyle(from: string, to: string): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${from}22, ${to}11)`,
    border: `1.5px solid ${from}44`,
    borderRadius: '16px',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  };
}

const statIconStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  marginBottom: '10px',
};

const sectionCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '18px',
  padding: '28px',
  backdropFilter: 'blur(10px)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '1.5px solid rgba(139,92,246,0.3)',
  background: 'rgba(15,12,41,0.8)',
  color: '#fff',
  fontSize: '1.05rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

export default MerchantDashboard;
