import { FC, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';

import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import { UserRoleProvider, useUserRole, UserRole } from './context/UserRoleContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ConsumerDashboard from './pages/ConsumerDashboard';
import MerchantDashboard from './pages/MerchantDashboard';
import RewardsPage from './pages/RewardsPage';
import AdminDashboard from './pages/AdminDashboard';
import ProductMarketplace from './pages/ProductMarketplace';

/* ── Protected Route wrapper ── */
function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <h2 style={{ marginBottom: '8px' }}>Verifying Access…</h2>
        <p style={{ color: '#888' }}>Checking your wallet role</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
        <h2 style={{ marginBottom: '8px' }}>Wallet Not Connected</h2>
        <p style={{ color: '#888' }}>Please connect your wallet to access this page</p>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ marginBottom: '8px', color: '#ff4444' }}>Access Denied</h2>
        <p style={{ color: '#888' }}>
          Your wallet role (<strong>{role}</strong>) does not have access to this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/* ── Inner app (needs to be inside BrowserRouter + providers to use hooks) ── */
const AppRoutes: FC = () => {
  return (
    <div className="app">
      <Navbar />
      <main className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<ProductMarketplace />} />

          {/* Consumer only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['consumer']}>
                <ConsumerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <ProtectedRoute allowedRoles={['consumer']}>
                <RewardsPage />
              </ProtectedRoute>
            }
          />

          {/* Merchant only */}
          <Route
            path="/merchant"
            element={
              <ProtectedRoute allowedRoles={['merchant']}>
                <MerchantDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: FC = () => {
  // Suppress Chrome extension messaging errors globally
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Suppress "message channel closed" errors from wallet extensions
      if (event.message?.includes('message channel closed')) {
        event.preventDefault();
      }
    };

    // Handle uncaught errors
    window.addEventListener('error', handleError);
    
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('message channel closed')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

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
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <BrowserRouter>
            <UserRoleProvider>
              <AppRoutes />
            </UserRoleProvider>
          </BrowserRouter>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
