import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import MessageModal from '../components/MessageModal';

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
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  const [pendingMerchants, setPendingMerchants] = useState<Merchant[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [allMerchants, setAllMerchants] = useState<Merchant[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    merchantId?: string;
    merchantName?: string;
    action?: 'approve' | 'reject';
  }>({ isOpen: false });
  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title?: string;
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  useEffect(() => {
    if (!connected || !publicKey) {
      navigate('/', { replace: true });
    }
  }, [connected, publicKey, navigate]);

  if (!connected || !publicKey) {
    return null;
  }

  useEffect(() => {
    if (publicKey && connected) {
      fetchPendingMerchants();
      fetchStats();
    }
  }, [publicKey, connected]);

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
    if (!publicKey) return;
    try {
      const response = await fetch('http://localhost:3001/api/admin/stats', {
        headers: {
          'X-Wallet-Address': publicKey.toBase58(),
        },
      });
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
    const merchant = pendingMerchants.find(m => m.id === merchantId);
    setConfirmModal({
      isOpen: true,
      merchantId,
      merchantName: merchant?.businessName,
      action: 'approve',
    });
  };

  const handleApproveConfirm = async () => {
    if (!publicKey || !confirmModal.merchantId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/admin/merchants/${confirmModal.merchantId}/approve`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': publicKey.toBase58(),
        },
      });
      const data = await response.json();
      setConfirmModal({ isOpen: false });
      
      if (data.success) {
        setMessageModal({
          isOpen: true,
          type: 'success',
          title: 'Merchant Approved',
          message: data.message,
        });
        fetchPendingMerchants();
        fetchStats();
        if (activeTab === 'all') fetchAllMerchants();
      } else {
        setMessageModal({
          isOpen: true,
          type: 'error',
          title: 'Approval Failed',
          message: data.error || 'Failed to approve merchant',
        });
      }
    } catch (error) {
      console.error('Error approving merchant:', error);
      setConfirmModal({ isOpen: false });
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to approve merchant',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (merchantId: string) => {
    if (!publicKey) return;
    const merchant = pendingMerchants.find(m => m.id === merchantId);
    setConfirmModal({
      isOpen: true,
      merchantId,
      merchantName: merchant?.businessName,
      action: 'reject',
    });
  };

  const handleRejectConfirm = async () => {
    if (!publicKey || !confirmModal.merchantId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/admin/merchants/${confirmModal.merchantId}/reject`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': publicKey.toBase58(),
        },
      });
      const data = await response.json();
      setConfirmModal({ isOpen: false });
      
      if (data.success) {
        setMessageModal({
          isOpen: true,
          type: 'success',
          title: 'Merchant Rejected',
          message: data.message,
        });
        fetchPendingMerchants();
        fetchStats();
        if (activeTab === 'all') fetchAllMerchants();
      } else {
        setMessageModal({
          isOpen: true,
          type: 'error',
          title: 'Rejection Failed',
          message: data.error || 'Failed to reject merchant',
        });
      }
    } catch (error) {
      console.error('Error rejecting merchant:', error);
      setConfirmModal({ isOpen: false });
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to reject merchant',
      });
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

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
      </div>

      {/* Stats Overview - Full Width */}
      {stats && (
        <div className="stats-section">
          <div className="stats-row">
            <div className="stat-card merchant-stat">
              <div className="stat-content">
                <h3>Merchants</h3>
                <div className="stat-main-value">{stats.merchants.total}</div>
                <div className="stat-mini-badges">
                  <span className="badge approved">{stats.merchants.approved} Approved</span>
                  <span className="badge pending">{stats.merchants.pending} Pending</span>
                  <span className="badge rejected">{stats.merchants.rejected} Rejected</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h3>Products</h3>
                <div className="stat-main-value">{stats.products.total}</div>
                <div className="stat-mini-label">Active Products</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h3>Orders</h3>
                <div className="stat-main-value">{stats.orders.total}</div>
                <div className="stat-mini-badges">
                  <span>{stats.orders.confirmed} Confirmed</span>
                  <span>{stats.orders.fulfilled} Fulfilled</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h3>Revenue</h3>
                <div className="stat-main-value">{(stats.orders.totalSolRevenue / 1e9).toFixed(2)}</div>
                <div className="stat-mini-label">SOL</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <div className="tab-bar">
          <button
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <span className="tab-icon">⏳</span>
            <span>Pending Approvals</span>
            <span className="tab-count">{pendingMerchants.length}</span>
          </button>
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('all');
              fetchAllMerchants();
            }}
          >
            <span className="tab-icon">📋</span>
            <span>All Merchants</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-content">
        {activeTab === 'pending' && (
          <div className="section-pending">
            {pendingMerchants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <h3>No Pending Applications</h3>
                <p>All merchant applications have been reviewed</p>
              </div>
            ) : (
              <>
                <div className="section-header">
                  <h2>Pending Merchant Applications</h2>
                  <div className="section-meta">{pendingMerchants.length} application{pendingMerchants.length !== 1 ? 's' : ''} awaiting review</div>
                </div>
                <div className={`pending-cards ${pendingMerchants.length > 2 ? 'has-scroll' : ''}`}>
                  {pendingMerchants.map((merchant) => (
                    <div 
                      key={merchant.id} 
                      className={`pending-card ${expandedCard === merchant.id ? 'expanded' : 'compact'}`}
                    >
                      <div className="card-header-compact">
                        <div className="card-title-section">
                          <h3>{merchant.businessName}</h3>
                          <span className="category-badge">{getCategoryLabel(merchant.category)}</span>
                        </div>
                        <button 
                          className="expand-btn"
                          onClick={() => setExpandedCard(expandedCard === merchant.id ? null : merchant.id)}
                          title={expandedCard === merchant.id ? "Collapse" : "Expand"}
                        >
                          {expandedCard === merchant.id ? '▼' : '▶'}
                        </button>
                      </div>

                      {expandedCard === merchant.id && (
                        <div className="card-details-expanded">
                          <div className="details-grid">
                            <div className="detail-item">
                              <span className="detail-label">📧 Email</span>
                              <span className="detail-value">{merchant.contactEmail}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">📞 Phone</span>
                              <span className="detail-value">{merchant.contactPhone}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">📍 Address</span>
                              <span className="detail-value">{merchant.businessAddress}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">👛 Wallet</span>
                              <span className="detail-value wallet-address">{merchant.walletAddress.slice(0, 8)}...{merchant.walletAddress.slice(-8)}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">📅 Applied</span>
                              <span className="detail-value">{formatDate(merchant.createdAt)}</span>
                            </div>
                          </div>

                          <div className="card-actions">
                            <button
                              className="btn-approve"
                              onClick={() => handleApprove(merchant.id)}
                              disabled={loading}
                            >
                              <span>✓</span> Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleReject(merchant.id)}
                              disabled={loading}
                            >
                              <span>✗</span> Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {expandedCard !== merchant.id && (
                        <div className="card-preview">
                          <div className="preview-line">
                            <strong>Email:</strong> {merchant.contactEmail || 'N/A'}
                          </div>
                          <div className="card-actions">
                            <button
                              className="btn-approve"
                              onClick={() => handleApprove(merchant.id)}
                              disabled={loading}
                            >
                              <span>✓</span> Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleReject(merchant.id)}
                              disabled={loading}
                            >
                              <span>✗</span> Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="section-all">
            <div className="section-header">
              <h2>All Merchants</h2>
              <div className="filter-buttons">
                <button onClick={() => fetchAllMerchants()} className="filter-btn">All</button>
                <button onClick={() => fetchAllMerchants('approved')} className="filter-btn">✓ Approved</button>
                <button onClick={() => fetchAllMerchants('pending')} className="filter-btn">⏳ Pending</button>
                <button onClick={() => fetchAllMerchants('rejected')} className="filter-btn">✗ Rejected</button>
              </div>
            </div>
            <div className="merchants-table-wrapper">
              {allMerchants.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No Merchants Found</h3>
                </div>
              ) : (
                <div className="merchants-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Business Name</th>
                        <th>Category</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Applied Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMerchants.map((merchant) => (
                        <tr key={merchant.id}>
                          <td className="name-cell">{merchant.businessName}</td>
                          <td>{getCategoryLabel(merchant.category)}</td>
                          <td className="email-cell">{merchant.contactEmail}</td>
                          <td>
                            <span className={`status-badge ${merchant.status}`}>
                              {merchant.status === 'approved' && '✓'} 
                              {merchant.status === 'pending' && '⏳'} 
                              {merchant.status === 'rejected' && '✗'} 
                              {' '}{merchant.status}
                            </span>
                          </td>
                          <td>{formatDate(merchant.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-dashboard {
          padding: 0;
          margin: 0;
          background: linear-gradient(135deg, #0a0f1e 0%, #0f1628 100%);
          min-height: 100vh;
          color: #f8fafc;
          padding-top: 180px;
        }

        .admin-header {
          position: fixed;
          top: 65px;
          left: 0;
          right: 0;
          z-index: 999;
          padding: 2.5rem 2rem;
          text-align: center;
          background: linear-gradient(180deg, rgba(24,33,50,0.95) 0%, rgba(15,22,40,0.8) 100%);
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          backdrop-filter: blur(10px);
        }

        .admin-header h1 {
          margin: 0 0 0.75rem 0;
          font-size: 2.8rem;
          background: linear-gradient(135deg, #a5b4fc, #14f195);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .admin-wallet {
          color: #94a3b8;
          font-family: 'Monaco', monospace;
          font-size: 0.9rem;
          letter-spacing: 0.5px;
          margin: 0;
        }

        /* Stats Section */
        .stats-section {
          padding: 2.5rem 2rem;
          background: linear-gradient(180deg, rgba(15,22,40,0.6) 0%, rgba(10,15,30,0.8) 100%);
          border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          max-width: 1600px;
          margin: 0 auto;
        }

        .stat-card {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          background: rgba(15, 22, 40, 0.8);
          backdrop-filter: blur(10px);
          padding: 1.75rem;
          border-radius: 14px;
          border: 1px solid rgba(99, 102, 241, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          border-color: rgba(20, 241, 149, 0.3);
          transform: translateY(-2px);
          background: rgba(15, 22, 40, 0.95);
          box-shadow: 0 12px 48px rgba(20, 241, 149, 0.1);
        }

        .stat-icon {
          font-size: 2.8rem;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-width: 60px;
          margin-top: 0.2rem;
        }

        .stat-content {
          flex: 1;
        }

        .stat-card h3 {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
        }

        .stat-main-value {
          font-size: 2.2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a5b4fc, #14f195);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0.25rem 0;
        }

        .stat-mini-label {
          font-size: 0.85rem;
          color: #64748b;
        }

        .stat-mini-badges {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
          justify-content: center;
          align-items: center;
        }

        .stat-mini-badges .badge,
        .stat-mini-badges span {
          font-size: 0.8rem;
          color: #cbd5e1;
          text-align: center;
        }

        .badge {
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-weight: 600;
          border: 1px solid;
          display: inline-block;
          width: fit-content;
          font-size: 0.75rem;
        }

        .badge.approved {
          background: rgba(20, 241, 149, 0.15);
          border-color: rgba(20, 241, 149, 0.4);
          color: #14f195;
        }

        .badge.pending {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.4);
          color: #fbbf24;
        }

        .badge.rejected {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .merchant-stat {
          grid-column: span 1;
        }

        /* Tabs */
        .admin-tabs {
          padding: 1.5rem 2rem 0 2rem;
          background: linear-gradient(180deg, rgba(10,15,30,0.8) 0%, rgba(15,22,40,0.6) 100%);
          border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        }

        .tab-bar {
          display: flex;
          gap: 0;
          max-width: 1600px;
          margin: 0 auto;
          border-bottom: 2px solid rgba(99, 102, 241, 0.1);
        }

        .tab {
          padding: 1.25rem 2rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.3s;
          font-weight: 600;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-transform: none;
          letter-spacing: 0;
          white-space: nowrap;
        }

        .tab-icon {
          font-size: 1.2rem;
        }

        .tab-count {
          background: rgba(20, 241, 149, 0.2);
          color: #14f195;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .tab:hover {
          color: #cbd5e1;
          background: rgba(99, 102, 241, 0.1);
        }

        .tab.active {
          border-bottom-color: #14f195;
          color: #14f195;
        }

        .tab.active .tab-count {
          background: #14f195;
          color: #0a0f1e;
        }

        /* Content */
        .admin-content {
          padding: 2.5rem 2rem;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem;
          background: rgba(20, 241, 149, 0.08);
          border: 2px dashed rgba(20, 241, 149, 0.3);
          border-radius: 16px;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin: 0.5rem 0;
          font-size: 1.3rem;
          color: #cbd5e1;
        }

        .empty-state p {
          margin: 0.5rem 0 0 0;
          font-size: 0.95rem;
        }

        /* Section Headers */
        .section-header {
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.6rem;
          color: #f8fafc;
          font-weight: 700;
        }

        .section-meta {
          font-size: 0.9rem;
          color: #94a3b8;
          background: rgba(99, 102, 241, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
        }

        /* Pending Cards */
        .pending-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .pending-cards.has-scroll {
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        }

        .pending-card {
          background: linear-gradient(135deg, rgba(20, 241, 149, 0.05) 0%, rgba(153, 69, 255, 0.05) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(20, 241, 149, 0.2);
          border-radius: 14px;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .pending-card:hover {
          border-color: rgba(20, 241, 149, 0.4);
          box-shadow: 0 12px 48px rgba(20, 241, 149, 0.15);
          transform: translateY(-2px);
        }

        .card-header-compact {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
        }

        .card-title-section {
          flex: 1;
        }

        .card-header-compact h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          color: #f8fafc;
          font-weight: 700;
        }

        .category-badge {
          display: inline-block;
          padding: 0.4rem 0.9rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
          border: 1px solid rgba(99, 102, 241, 0.4);
          color: #a5b4fc;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .expand-btn {
          background: none;
          border: none;
          color: #a5b4fc;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.5rem;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .expand-btn:hover {
          color: #14f195;
        }

        .card-preview {
          padding: 1rem 1.5rem;
          background: rgba(6, 9, 18, 0.4);
          border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        }

        .card-preview .preview-line {
          display: flex;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #cbd5e1;
          margin-bottom: 1rem;
        }

        .card-preview .card-actions {
          padding-top: 0;
          border-top: none;
          margin-top: 0;
        }

        .preview-line strong {
          color: #a5b4fc;
          font-weight: 600;
        }

        .card-details-expanded {
          padding: 1.5rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.2rem;
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .detail-label {
          font-size: 0.8rem;
          color: #a5b4fc;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .detail-value {
          font-size: 0.95rem;
          color: #e2e8f0;
          word-break: break-word;
        }

        .wallet-address {
          font-family: 'Monaco', monospace;
          background: rgba(15, 22, 40, 0.6);
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(99, 102, 241, 0.2);
          font-size: 0.85rem !important;
          letter-spacing: 0.5px;
        }

        .card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(99, 102, 241, 0.2);
        }

        .card-actions button {
          padding: 0.875rem 1.25rem;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s;
        }

        .card-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-approve {
          background: linear-gradient(135deg, #14f195, #0fd980);
          color: #0a0f1e;
          box-shadow: 0 4px 15px rgba(20, 241, 149, 0.3);
        }

        .btn-approve:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(20, 241, 149, 0.5);
        }

        .btn-reject {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        .btn-reject:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(239, 68, 68, 0.5);
        }

        /* All Merchants Table */
        .section-all {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .section-header {
          margin-bottom: 0;
        }

        .filter-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.625rem 1.25rem;
          border: 1px solid rgba(99, 102, 241, 0.3);
          background: rgba(15, 22, 40, 0.8);
          border-radius: 10px;
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filter-btn:hover {
          background: rgba(20, 241, 149, 0.15);
          border-color: rgba(20, 241, 149, 0.4);
          color: #14f195;
        }

        .merchants-table-wrapper {
          overflow-x: auto;
        }

        .merchants-table {
          background: rgba(15, 22, 40, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(99, 102, 241, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .merchants-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .merchants-table th,
        .merchants-table td {
          padding: 1.25rem;
          text-align: left;
          border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        }

        .merchants-table th {
          background: rgba(6, 9, 18, 0.8);
          font-weight: 600;
          color: #a5b4fc;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.85rem;
        }

        .merchants-table td {
          color: #e2e8f0;
        }

        .name-cell, .email-cell {
          font-size: 0.95rem;
        }

        .merchants-table tr:hover {
          background: rgba(20, 241, 149, 0.08);
        }

        .status-badge {
          padding: 0.4rem 0.9rem;
          border-radius: 10px;
          font-size: 0.8rem;
          text-transform: uppercase;
          font-weight: 600;
          border: 1px solid;
          display: inline-block;
          letter-spacing: 0.05em;
        }

        .status-badge.approved {
          background: rgba(20, 241, 149, 0.15);
          border-color: rgba(20, 241, 149, 0.4);
          color: #14f195;
        }

        .status-badge.pending {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.4);
          color: #fbbf24;
        }

        .status-badge.rejected {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-dashboard {
            padding: 0;
          }

          .admin-header {
            padding: 2rem 1.5rem;
          }

          .admin-header h1 {
            font-size: 2rem;
          }

          .stats-row {
            grid-template-columns: 1fr;
            gap: 1rem;
            padding: 0;
          }

          .stat-card {
            padding: 1.25rem;
          }

          .pending-cards {
            grid-template-columns: 1fr;
          }

          .admin-content {
            padding: 1.5rem;
          }

          .card-actions {
            grid-template-columns: 1fr;
          }

          .tab {
            padding: 1rem 1.25rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.action === 'approve' ? 'Approve Merchant' : 'Reject Merchant'}
        message={
          <>
            <strong>{confirmModal.merchantName}</strong>
            <br />
            <br />
            {confirmModal.action === 'approve' 
              ? 'Are you sure you want to approve this merchant? They will be able to access the dashboard and manage products.'
              : 'Are you sure you want to reject this merchant? This action cannot be undone.'}
          </>
        }
        confirmText={confirmModal.action === 'approve' ? '✓ Approve' : '✗ Reject'}
        confirmButtonClass={confirmModal.action === 'approve' ? 'success' : 'danger'}
        onConfirm={confirmModal.action === 'approve' ? handleApproveConfirm : handleRejectConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
        isLoading={loading}
      />

      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal({ isOpen: false, type: 'success', message: '' })}
        autoCloseDuration={messageModal.type === 'success' ? 3000 : 4000}
      />
    </div>
  );
}
