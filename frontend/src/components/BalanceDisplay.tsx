import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface BalanceDisplayProps {
  className?: string;
}

const BalanceDisplay: FC<BalanceDisplayProps> = ({ className = '' }) => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      setSolBalance(null);
      return;
    }

    setLoading(true);
    try {
      // Fetch loyalty points balance
      const response = await fetch(`/api/users/${publicKey.toBase58()}/balance`);
      const data = await response.json();
      if (data.success) {
        setBalance(data.data.balance);
      }
      
      // Fetch SOL balance
      console.log('Fetching SOL balance for:', publicKey.toBase58());
      console.log('Using connection endpoint:', connection.rpcEndpoint);
      const solBal = await connection.getBalance(publicKey);
      console.log('SOL balance in lamports:', solBal);
      console.log('SOL balance:', solBal / LAMPORTS_PER_SOL);
      setSolBalance(solBal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const formatBalance = (amount: number): string => {
    // Assuming 6 decimals for the token
    const formatted = amount / 1_000_000;
    return formatted.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  if (!publicKey) {
    return (
      <div className={`balance-card ${className}`}>
        <div className="balance-label">Your Balance</div>
        <div className="balance-amount">---</div>
        <p className="mt-md" style={{ opacity: 0.8 }}>
          Connect wallet to view balance
        </p>
      </div>
    );
  }

  return (
    <div className={`balance-card ${className}`}>
      <div className="balance-label">Your Loyalty Points</div>
      <div className="balance-amount">
        {loading ? (
          <span className="loading-spinner" />
        ) : (
          <>
            {formatBalance(balance || 0)}
            <span className="balance-unit">PTS</span>
          </>
        )}
      </div>
      
      {/* SOL Balance Display */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ opacity: 0.8 }}>SOL Balance:</span>
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '18px',
          color: solBalance && solBalance > 0 ? '#4ade80' : '#ffffff'
        }}>
          {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : '---'}
        </span>
      </div>
      
      <button 
        className="btn btn-secondary btn-sm mt-md" 
        onClick={fetchBalance}
        disabled={loading}
      >
        Refresh
      </button>
    </div>
  );
};

export default BalanceDisplay;
