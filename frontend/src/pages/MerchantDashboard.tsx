import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
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

const MerchantDashboard: FC = () => {
  const { publicKey, connected } = useWallet();
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [issueAmount, setIssueAmount] = useState('');
  const [consumerWallet, setConsumerWallet] = useState('');
  const [purchaseRef, setPurchaseRef] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchMerchantInfo = async () => {
      if (!publicKey) return;

      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/merchants/${publicKey.toBase58()}`);
        const data = await response.json();
        if (data.success) {
          setMerchantInfo(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch merchant info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMerchantInfo();
  }, [publicKey]);

  const handleIssuePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!publicKey || !consumerWallet || !issueAmount) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    // In a real implementation, this would:
    // 1. Build the mint_points transaction
    // 2. Have the merchant sign it
    // 3. Submit to the blockchain
    // 4. Log the transaction in the backend

    setMessage({
      type: 'success',
      text: `Successfully issued ${issueAmount} points to ${consumerWallet.slice(0, 8)}...`,
    });

    // Clear form
    setIssueAmount('');
    setConsumerWallet('');
    setPurchaseRef('');
  };

  if (!connected) {
    return null; /* ProtectedRoute handles this */
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Merchant Dashboard</h1>
        <p className="page-subtitle">
          Issue loyalty points to your customers
        </p>
      </header>

      {/* Merchant Status */}
      <div className="grid grid-2 mb-lg">
        <div className="card">
          <h3 className="card-title mb-md">Merchant Status</h3>
          {loading ? (
            <div className="loading-spinner" />
          ) : merchantInfo ? (
            <div>
              <p style={{ marginBottom: '8px' }}>
                <strong>Business:</strong> {merchantInfo.businessName}
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>Category:</strong> {merchantInfo.category || 'N/A'}
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>Status:</strong>{' '}
                <span
                  className={`btn btn-sm ${
                    merchantInfo.status === 'approved' ? 'btn-success' : 'btn-secondary'
                  }`}
                  style={{ cursor: 'default' }}
                >
                  {merchantInfo.status === 'approved' ? '✓ Approved' : merchantInfo.status === 'pending' ? '⏳ Pending' : '✗ Rejected'}
                </span>
              </p>
            </div>
          ) : (
            <div className="alert alert-warning">
              Your wallet is not registered as a merchant.
              Contact platform admin to get authorized.
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title mb-md">Quick Stats</h3>
          <div className="grid grid-2">
            <div className="text-center">
              <div className="stat-value">0</div>
              <div className="stat-label">Points Issued Today</div>
            </div>
            <div className="text-center">
              <div className="stat-value">0</div>
              <div className="stat-label">Customers Served</div>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Points Form */}
      <div className="card">
        <h3 className="card-title mb-md">Issue Loyalty Points</h3>

        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleIssuePoints}>
          <div className="form-group">
            <label className="form-label">Customer Wallet Address *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter customer's Solana wallet address"
              value={consumerWallet}
              onChange={(e) => setConsumerWallet(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Points to Issue *</label>
            <input
              type="number"
              className="form-input"
              placeholder="Enter amount (e.g., 100)"
              value={issueAmount}
              onChange={(e) => setIssueAmount(e.target.value)}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Purchase Reference (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Invoice or receipt number"
              value={purchaseRef}
              onChange={(e) => setPurchaseRef(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={merchantInfo?.status !== 'approved'}
            style={{ width: '100%' }}
          >
            {merchantInfo?.status === 'approved' ? 'Issue Points' : 'Not Authorized'}
          </button>
        </form>
      </div>

      {/* Product Management */}
      {merchantInfo && merchantInfo.status === 'approved' && (
        <ProductManagement merchantId={merchantInfo.id} />
      )}

      {/* Recent Transactions */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Issuances</h3>
          <button className="btn btn-secondary btn-sm">View All</button>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h4 className="empty-state-title">No recent issuances</h4>
          <p className="empty-state-description">
            Points you issue to customers will appear here
          </p>
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;
