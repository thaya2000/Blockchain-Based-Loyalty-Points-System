import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface Merchant {
  id: string;
  walletAddress: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  businessAddress: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PlatformStats {
  merchants: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  products: {
    total: number;
  };
  orders: {
    total: number;
    confirmed: number;
    fulfilled: number;
    totalSolRevenue: number;
  };
}

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const [pendingMerchants, setPendingMerchants] = useState<Merchant[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'stats'>('pending');
  const [allMerchants, setAllMerchants] = useState<Merchant[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (publicKey) {
      checkAdminStatus();
    } else {
      setCheckingAdmin(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingMerchants();
      fetchStats();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!publicKey) return;

    setCheckingAdmin(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/admin/check?wallet=${publicKey.toBase58()}`
      );
      const data = await response.json();

      if (data.success) {
        setIsAdmin(data.isAdmin);
        if (!data.isAdmin) {
          alert('Access Denied: You do not have admin privileges');
        }
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const fetchPendingMerchants = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch('http://localhost:3001/api/admin/merchants/pending', {
        headers: {
          'X-Wallet-Address': publicKey.toBase58(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setPendingMerchants(data.data);
      }
    } catch (error) {
      console.error('Error fetching pending merchants:', error);
    }
  };

  const fetchAllMerchants = async (status?: string) => {
    if (!publicKey) return;

    try {
      const url = status 
        ? `http://localhost:3001/api/admin/merchants?status=${status}`
        : 'http://localhost:3001/api/admin/merchants';
      const response = await fetch(url, {
        headers: {
          'X-Wallet-Address': publicKey.toBase58(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setAllMerchants(data.data);
      }
    } catch (error) {
      console.error('Error fetching all merchants:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (merchantId: string) => {
    if (!publicKey) return;
    if (!confirm('Are you sure you want to approve this merchant?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/admin/merchants/${merchantId}/approve`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': publicKey.toBase58(),
        },
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchPendingMerchants();
        fetchStats();
        if (activeTab === 'all') fetchAllMerchants();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving merchant:', error);
      alert('Failed to approve merchant');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (merchantId: string) => {
    if (!publicKey) return;
    if (!confirm('Are you sure you want to reject this merchant?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/admin/merchants/${merchantId}/reject`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': publicKey.toBase58(),
        },
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchPendingMerchants();
        fetchStats();
        if (activeTab === 'all') fetchAllMerchants();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error rejecting merchant:', error);
      alert('Failed to reject merchant');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      food_beverage: 'Food & Beverage',
      retail: 'Retail',
      services: 'Services',
      entertainment: 'Entertainment',
      health_wellness: 'Health & Wellness',
      other: 'Other',
    };
    return labels[category] || category;
  };

  if (!publicKey) {
    return (
      <div className="admin-dashboard">
        <div className="connect-prompt">
          <h2>🔐 Admin Access Required</h2>
          <p>Please connect your admin wallet to access the dashboard</p>
        </div>
      </div>
    );
  }

  if (checkingAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="connect-prompt">
          <h2>🔍 Verifying Admin Access...</h2>
          <p>Checking your authorization...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="admin-dashboard">
        <div className="connect-prompt" style={{ color: '#ff4444' }}>
          <h2>🚫 Access Denied</h2>
          <p>You do not have admin privileges</p>
          <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
            Your wallet: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <p className="admin-wallet">Admin: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>👥 Merchants</h3>
            <div className="stat-value">{stats.merchants.total}</div>
            <div className="stat-details">
              <span className="stat-badge approved">✓ {stats.merchants.approved} Approved</span>
              <span className="stat-badge pending">⏳ {stats.merchants.pending} Pending</span>
              <span className="stat-badge rejected">✗ {stats.merchants.rejected} Rejected</span>
            </div>
          </div>
          <div className="stat-card">
            <h3>📦 Products</h3>
            <div className="stat-value">{stats.products.total}</div>
            <div className="stat-details">Active Products</div>
          </div>
          <div className="stat-card">
            <h3>🛒 Orders</h3>
            <div className="stat-value">{stats.orders.total}</div>
            <div className="stat-details">
              <span>{stats.orders.confirmed} Confirmed</span>
              <span>{stats.orders.fulfilled} Fulfilled</span>
            </div>
          </div>
          <div className="stat-card">
            <h3>💰 Revenue</h3>
            <div className="stat-value">{(stats.orders.totalSolRevenue / 1e9).toFixed(2)} SOL</div>
            <div className="stat-details">Total Platform Revenue</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pending Approvals ({pendingMerchants.length})
        </button>
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('all');
            fetchAllMerchants();
          }}
        >
          📋 All Merchants
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {activeTab === 'pending' && (
          <div className="merchants-list">
            <h2>Pending Merchant Applications</h2>
            {pendingMerchants.length === 0 ? (
              <div className="empty-state">
                <p>✨ No pending applications</p>
              </div>
            ) : (
              <div className="merchant-cards">
                {pendingMerchants.map((merchant) => (
                  <div key={merchant.id} className="merchant-card">
                    <div className="merchant-header">
                      <h3>{merchant.businessName}</h3>
                      <span className="category-badge">{getCategoryLabel(merchant.category)}</span>
                    </div>
                    <div className="merchant-details">
                      <div className="detail-row">
                        <strong>📧 Email:</strong>
                        <span>{merchant.contactEmail}</span>
                      </div>
                      <div className="detail-row">
                        <strong>📞 Phone:</strong>
                        <span>{merchant.contactPhone}</span>
                      </div>
                      <div className="detail-row">
                        <strong>📍 Address:</strong>
                        <span>{merchant.businessAddress}</span>
                      </div>
                      <div className="detail-row">
                        <strong>👛 Wallet:</strong>
                        <span className="wallet-address">
                          {merchant.walletAddress.slice(0, 8)}...{merchant.walletAddress.slice(-8)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <strong>📅 Applied:</strong>
                        <span>{formatDate(merchant.createdAt)}</span>
                      </div>
                    </div>
                    <div className="merchant-actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleApprove(merchant.id)}
                        disabled={loading}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => handleReject(merchant.id)}
                        disabled={loading}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="merchants-list">
            <div className="list-header">
              <h2>All Merchants</h2>
              <div className="filter-buttons">
                <button onClick={() => fetchAllMerchants()}>All</button>
                <button onClick={() => fetchAllMerchants('approved')}>Approved</button>
                <button onClick={() => fetchAllMerchants('pending')}>Pending</button>
                <button onClick={() => fetchAllMerchants('rejected')}>Rejected</button>
              </div>
            </div>
            <div className="merchants-table">
              <table>
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Category</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allMerchants.map((merchant) => (
                    <tr key={merchant.id}>
                      <td>{merchant.businessName}</td>
                      <td>{getCategoryLabel(merchant.category)}</td>
                      <td>{merchant.contactEmail}</td>
                      <td>
                        <span className={`status-badge ${merchant.status}`}>
                          {merchant.status}
                        </span>
                      </td>
                      <td>{formatDate(merchant.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .admin-dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .admin-header {
          margin-bottom: 2rem;
        }

        .admin-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
        }

        .admin-wallet {
          color: #666;
          font-family: monospace;
        }

        .connect-prompt {
          text-align: center;
          padding: 4rem 2rem;
          background: #f8f9fa;
          border-radius: 12px;
          margin: 2rem 0;
        }

        .connect-prompt h2 {
          margin: 0 0 1rem 0;
          font-size: 1.8rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .stat-card h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          color: #666;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: bold;
          color: #14f195;
          margin: 0.5rem 0;
        }

        .stat-details {
          font-size: 0.9rem;
          color: #666;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .stat-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .stat-badge.approved {
          background: #d4edda;
          color: #155724;
        }

        .stat-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .stat-badge.rejected {
          background: #f8d7da;
          color: #721c24;
        }

        .admin-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .tab:hover {
          background: #f8f9fa;
        }

        .tab.active {
          border-bottom-color: #14f195;
          font-weight: bold;
        }

        .merchants-list h2 {
          margin: 0 0 1.5rem 0;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          background: #f8f9fa;
          border-radius: 12px;
          color: #666;
          font-size: 1.2rem;
        }

        .merchant-cards {
          display: grid;
          gap: 1.5rem;
        }

        .merchant-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .merchant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .merchant-header h3 {
          margin: 0;
          font-size: 1.3rem;
        }

        .category-badge {
          padding: 0.25rem 0.75rem;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 20px;
          font-size: 0.85rem;
        }

        .merchant-details {
          display: grid;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-row strong {
          color: #666;
        }

        .wallet-address {
          font-family: monospace;
          background: #f8f9fa;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .merchant-actions {
          display: flex;
          gap: 1rem;
        }

        .merchant-actions button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .merchant-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-approve {
          background: #14f195;
          color: black;
        }

        .btn-approve:hover:not(:disabled) {
          background: #0fd980;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(20, 241, 149, 0.3);
        }

        .btn-reject {
          background: #f44336;
          color: white;
        }

        .btn-reject:hover:not(:disabled) {
          background: #d32f2f;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .filter-buttons button {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-buttons button:hover {
          background: #14f195;
          border-color: #14f195;
        }

        .merchants-table {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .merchants-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .merchants-table th,
        .merchants-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #f0f0f0;
        }

        .merchants-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #666;
        }

        .merchants-table tr:hover {
          background: #f8f9fa;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          text-transform: capitalize;
        }

        .status-badge.approved {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.rejected {
          background: #f8d7da;
          color: #721c24;
        }
      `}</style>
    </div>
  );
}
