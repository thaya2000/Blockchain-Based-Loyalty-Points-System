import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const HomePage: FC = () => {
  const { connected } = useWallet();

  return (
    <div>
      {/* Hero Section */}
      <section className="page-header" style={{ padding: '80px 0' }}>
        <h1 className="page-title" style={{ fontSize: '3.5rem' }}>
          Earn Rewards Everywhere
        </h1>
        <p className="page-subtitle" style={{ maxWidth: '600px', margin: '0 auto 32px' }}>
          Collect loyalty points at any participating merchant and redeem them
          anywhere in our network. Powered by Solana blockchain for transparency
          and security.
        </p>
        {!connected ? (
          <WalletMultiButton />
        ) : (
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            Go to Dashboard →
          </Link>
        )}
      </section>

      {/* Stats Section */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">50+</div>
          <div className="stat-label">Partner Merchants</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">10K+</div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">1M+</div>
          <div className="stat-label">Points Issued</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">100%</div>
          <div className="stat-label">On-Chain</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-3 mb-lg" style={{ marginTop: '48px' }}>
        <div className="card">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
          <h3 className="card-title">Universal Points</h3>
          <p className="card-subtitle">
            Earn points at any merchant and use them anywhere in the network.
            No more siloed loyalty programs.
          </p>
        </div>
        <div className="card">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3 className="card-title">You Own Your Points</h3>
          <p className="card-subtitle">
            Your loyalty tokens live in your wallet. Transfer, hold, or redeem
            them - you're in full control.
          </p>
        </div>
        <div className="card">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 className="card-title">Transparent & Auditable</h3>
          <p className="card-subtitle">
            Every point earned and redeemed is recorded on Solana blockchain.
            Fully verifiable and immutable.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ marginTop: '64px' }}>
        <h2 className="page-title" style={{ fontSize: '2rem', marginBottom: '32px' }}>
          How It Works
        </h2>
        <div className="grid grid-4">
          <div className="card text-center">
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>1️⃣</div>
            <h4 style={{ marginBottom: '8px' }}>Connect Wallet</h4>
            <p className="card-subtitle">
              Use Phantom or Solflare to connect your Solana wallet
            </p>
          </div>
          <div className="card text-center">
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>2️⃣</div>
            <h4 style={{ marginBottom: '8px' }}>Shop & Earn</h4>
            <p className="card-subtitle">
              Make purchases at participating merchants to earn points
            </p>
          </div>
          <div className="card text-center">
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>3️⃣</div>
            <h4 style={{ marginBottom: '8px' }}>Track Balance</h4>
            <p className="card-subtitle">
              View your points balance directly from your wallet
            </p>
          </div>
          <div className="card text-center">
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>4️⃣</div>
            <h4 style={{ marginBottom: '8px' }}>Redeem Rewards</h4>
            <p className="card-subtitle">
              Browse rewards and redeem points at any merchant
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center" style={{ marginTop: '80px', padding: '48px 0' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>
          Ready to Start Earning?
        </h2>
        <p className="page-subtitle" style={{ marginBottom: '24px' }}>
          Connect your wallet and join the future of loyalty rewards
        </p>
        {!connected ? (
          <WalletMultiButton />
        ) : (
          <div className="flex-center gap-md">
            <Link to="/rewards" className="btn btn-primary btn-lg">
              Browse Rewards
            </Link>
            <Link to="/dashboard" className="btn btn-secondary btn-lg">
              View Dashboard
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
