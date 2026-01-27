import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import BalanceDisplay from '../components/BalanceDisplay';
import TransactionList from '../components/TransactionList';

interface Transaction {
  id: string;
  txType: 'mint' | 'redeem';
  pointsAmount: number;
  merchantWallet?: string;
  createdAt: Date;
}

const ConsumerDashboard: FC = () => {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!publicKey) return;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/users/${publicKey.toBase58()}/transactions`
        );
        const data = await response.json();
        if (data.success) {
          setTransactions(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [publicKey]);

  if (!connected) {
    return (
      <div className="text-center" style={{ padding: '100px 0' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔐</div>
        <h2 style={{ marginBottom: '16px' }}>Connect Your Wallet</h2>
        <p className="page-subtitle" style={{ marginBottom: '24px' }}>
          Connect your Solana wallet to view your loyalty points and transaction history
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">My Loyalty Points</h1>
        <p className="page-subtitle">
          Track your earnings and redemptions
        </p>
      </header>

      {/* Balance Card */}
      <BalanceDisplay className="mb-lg" />

      {/* Quick Stats */}
      <div className="grid grid-3 mb-lg" style={{ marginTop: '32px' }}>
        <div className="card text-center">
          <div className="stat-value">
            {transactions.filter((t) => t.txType === 'mint').length}
          </div>
          <div className="stat-label">Times Earned</div>
        </div>
        <div className="card text-center">
          <div className="stat-value">
            {transactions.filter((t) => t.txType === 'redeem').length}
          </div>
          <div className="stat-label">Redemptions</div>
        </div>
        <div className="card text-center">
          <div className="stat-value">
            {new Set(transactions.map((t) => t.merchantWallet)).size}
          </div>
          <div className="stat-label">Merchants Visited</div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card" style={{ marginTop: '32px' }}>
        <div className="card-header">
          <h3 className="card-title">Transaction History</h3>
        </div>
        <TransactionList transactions={transactions} loading={loading} />
      </div>

      {/* Wallet Info */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Wallet</h3>
        </div>
        <div className="flex-between">
          <div>
            <p className="card-subtitle">Connected Address</p>
            <code style={{ fontSize: '14px', color: 'var(--color-primary-light)' }}>
              {publicKey?.toBase58()}
            </code>
          </div>
          <a
            href={`https://explorer.solana.com/address/${publicKey?.toBase58()}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            View on Explorer ↗
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConsumerDashboard;
