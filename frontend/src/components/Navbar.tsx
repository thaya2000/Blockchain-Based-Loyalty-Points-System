import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Navbar: FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span>💎</span>
        <span>LoyaltyChain</span>
      </Link>

      <div className="navbar-links">
        <Link
          to="/"
          className={`navbar-link ${isActive('/') ? 'active' : ''}`}
        >
          Home
        </Link>
        <Link
          to="/dashboard"
          className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
        >
          My Points
        </Link>
        <Link
          to="/rewards"
          className={`navbar-link ${isActive('/rewards') ? 'active' : ''}`}
        >
          Rewards
        </Link>
        <Link
          to="/merchant"
          className={`navbar-link ${isActive('/merchant') ? 'active' : ''}`}
        >
          Merchant
        </Link>
      </div>

      <WalletMultiButton />
    </nav>
  );
};

export default Navbar;
