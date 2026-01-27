import { FC } from 'react';

interface Transaction {
  id: string;
  txType: 'mint' | 'redeem';
  pointsAmount: number;
  merchantWallet?: string;
  createdAt: Date;
  txSignature?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
}

const TransactionList: FC<TransactionListProps> = ({ transactions, loading }) => {
  const formatPoints = (points: number): string => {
    const formatted = points / 1_000_000;
    return formatted.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const shortenAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="transaction-list">
        {[1, 2, 3].map((i) => (
          <div key={i} className="transaction-item">
            <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
            <div style={{ flex: 1, marginLeft: '16px' }}>
              <div className="skeleton" style={{ width: '60%', height: '16px', marginBottom: '8px' }} />
              <div className="skeleton" style={{ width: '40%', height: '12px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <h3 className="empty-state-title">No transactions yet</h3>
        <p className="empty-state-description">
          Your transaction history will appear here once you start earning or redeeming points.
        </p>
      </div>
    );
  }

  return (
    <div className="transaction-list">
      {transactions.map((tx) => (
        <div key={tx.id} className="transaction-item">
          <div className="transaction-info">
            <div className={`transaction-icon ${tx.txType === 'mint' ? 'earn' : 'redeem'}`}>
              {tx.txType === 'mint' ? '📈' : '🎁'}
            </div>
            <div className="transaction-details">
              <h4>
                {tx.txType === 'mint' ? 'Points Earned' : 'Points Redeemed'}
              </h4>
              <span>
                {tx.merchantWallet && shortenAddress(tx.merchantWallet)} • {formatDate(tx.createdAt)}
              </span>
            </div>
          </div>
          <div className={`transaction-amount ${tx.txType === 'mint' ? 'positive' : 'negative'}`}>
            {tx.txType === 'mint' ? '+' : '-'}{formatPoints(tx.pointsAmount)} pts
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
