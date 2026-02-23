import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import RewardCard from '../components/RewardCard';
import MessageModal from '../components/MessageModal';

interface Reward {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
  merchantId: string;
  merchantName?: string;
}

interface Merchant {
  id: string;
  businessName: string;
  category?: string;
}

const RewardsPage: FC = () => {
  const { publicKey } = useWallet();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBalance, setUserBalance] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [redeemingReward, setRedeemingReward] = useState<Reward | null>(null);
  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title?: string;
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch rewards
        const rewardsRes = await fetch('/api/rewards');
        const rewardsData = await rewardsRes.json();
        if (rewardsData.success) {
          setRewards(rewardsData.data);
        }

        // Fetch merchants for categories
        const merchantsRes = await fetch('/api/merchants');
        const merchantsData = await merchantsRes.json();
        if (merchantsData.success) {
          setMerchants(merchantsData.data);
        }

        // Fetch user balance if connected
        if (publicKey) {
          const balanceRes = await fetch(`/api/users/${publicKey.toBase58()}/balance`);
          const balanceData = await balanceRes.json();
          if (balanceData.success) {
            setUserBalance(balanceData.data.balance);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [publicKey]);

  const handleRedeem = (reward: Reward) => {
    setRedeemingReward(reward);
    setMessageModal({
      isOpen: true,
      type: 'info',
      title: 'Redeeming Reward',
      message: `Redeeming ${reward.name} for ${reward.pointsCost / 1_000_000} points. In a real implementation, this would build a redeem_points transaction and submit to the blockchain.`,
    });
  };

  // Get unique categories
  const categories = [...new Set(merchants.map((m) => m.category).filter(Boolean))];

  // Filter rewards
  const filteredRewards = rewards.filter((reward) => {
    const merchant = merchants.find((m) => m.id === reward.merchantId);
    const matchesCategory =
      selectedCategory === 'all' || merchant?.category === selectedCategory;
    const matchesSearch =
      reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reward.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Enrich rewards with merchant names
  const enrichedRewards = filteredRewards.map((reward) => {
    const merchant = merchants.find((m) => m.id === reward.merchantId);
    return { ...reward, merchantName: merchant?.businessName };
  });

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Rewards Catalog</h1>
        <p className="page-subtitle">
          Browse and redeem rewards from our partner merchants
        </p>
      </header>

      {/* Filters */}
      <div className="card mb-lg">
        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search rewards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Balance Display (if connected) */}
      {publicKey && (
        <div
          className="card mb-lg flex-between"
          style={{ background: 'var(--gradient-secondary)' }}
        >
          <div>
            <p style={{ opacity: 0.8, marginBottom: '4px' }}>Your Balance</p>
            <p style={{ fontSize: '24px', fontWeight: 700 }}>
              {(userBalance / 1_000_000).toLocaleString()} pts
            </p>
          </div>
          <div className="text-right">
            <p style={{ opacity: 0.8 }}>
              {enrichedRewards.filter((r) => r.pointsCost <= userBalance).length} rewards
              you can afford
            </p>
          </div>
        </div>
      )}

      {/* Rewards Grid */}
      {loading ? (
        <div className="grid grid-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: '160px', marginBottom: '16px' }} />
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '16px', width: '40%' }} />
            </div>
          ))}
        </div>
      ) : enrichedRewards.length > 0 ? (
        <div className="grid grid-3">
          {enrichedRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onRedeem={publicKey ? handleRedeem : undefined}
              userBalance={userBalance}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🎁</div>
          <h3 className="empty-state-title">No rewards found</h3>
          <p className="empty-state-description">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'Check back soon for new rewards!'}
          </p>
        </div>
      )}

      {/* Merchant Partners */}
      <section style={{ marginTop: '64px' }}>
        <h2 style={{ marginBottom: '24px' }}>Partner Merchants</h2>
        <div className="grid grid-4">
          {merchants.slice(0, 8).map((merchant) => (
            <div key={merchant.id} className="card text-center">
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: '24px',
                }}
              >
                🏪
              </div>
              <h4>{merchant.businessName}</h4>
              <p className="card-subtitle">{merchant.category}</p>
            </div>
          ))}
        </div>
      </section>

      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal({ isOpen: false, type: 'success', message: '' })}
        autoCloseDuration={messageModal.type === 'success' ? 3000 : 4000}
      />
};

export default RewardsPage;
