import { FC, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia, localhost } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

import {
  UserRoleProvider,
  useUserRole,
  UserRole,
} from "./context/UserRoleContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import MerchantDashboard from "./pages/MerchantDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProductMarketplace from "./pages/ProductMarketplace";

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
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
        <h2 style={{ marginBottom: "8px" }}>Verifying Access…</h2>
        <p style={{ color: "#888" }}>Checking your wallet role</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔐</div>
        <h2 style={{ marginBottom: "8px" }}>Wallet Not Connected</h2>
        <p style={{ color: "#888" }}>
          Please connect your wallet to access this page
        </p>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
        <h2 style={{ marginBottom: "8px", color: "#ff4444" }}>Access Denied</h2>
        <p style={{ color: "#888" }}>
          Your wallet role (<strong>{role}</strong>) does not have access to
          this page.
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
              <ProtectedRoute allowedRoles={["consumer"]}>
                <ConsumerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Merchant only */}
          <Route
            path="/merchant"
            element={
              <ProtectedRoute allowedRoles={["merchant"]}>
                <MerchantDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
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
      if (event.message?.includes("message channel closed")) {
        event.preventDefault();
      }
    };

    // Handle uncaught errors
    window.addEventListener("error", handleError);

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes("message channel closed")) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  // Configure Ethereum network based on environment
  const chainId = parseInt(import.meta.env.VITE_CHAIN_ID || "1337");
  const network =
    chainId === 11155111 ? sepolia : chainId === 1 ? mainnet : localhost;

  // Configure wagmi
  const config = createConfig(
    getDefaultConfig({
      chains: [network],
      transports: {
        [network.id]: http(
          import.meta.env.VITE_RPC_URL || "http://localhost:8545",
        ),
      },
      walletConnectProjectId:
        import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo",
      appName: "Loyalty Platform",
      appDescription: "Blockchain-Based Loyalty Points System",
      appUrl: "https://localhost:5173",
      appIcon: "https://localhost:5173/logo.png",
    }),
  );

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <BrowserRouter>
            <UserRoleProvider>
              <AppRoutes />
            </UserRoleProvider>
          </BrowserRouter>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
