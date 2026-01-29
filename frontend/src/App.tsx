import { FC, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ConsumerDashboard from './pages/ConsumerDashboard';
import MerchantDashboard from './pages/MerchantDashboard';
import RewardsPage from './pages/RewardsPage';
import AdminDashboard from './pages/AdminDashboard';
import ProductMarketplace from './pages/ProductMarketplace';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const App: FC = () => {
  // Configure Solana network
  const endpoint = useMemo(
    () => import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('devnet'),
    []
  );

  // Configure wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Backpack is detected automatically by the wallet adapter
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <BrowserRouter>
            <div className="app">
              <Navbar />
              <main className="app-container">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dashboard" element={<ConsumerDashboard />} />
                  <Route path="/merchant" element={<MerchantDashboard />} />
                  <Route path="/rewards" element={<RewardsPage />} />
                  <Route path="/marketplace" element={<ProductMarketplace />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
