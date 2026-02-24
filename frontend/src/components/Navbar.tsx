import { FC, useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { useUserRole } from "../context/UserRoleContext";
import MerchantRegisterModal from "./MerchantRegisterModal";
import WalletModal from "./WalletModal";

const Navbar: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, loading, merchantInfo } = useUserRole();
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const [showRegister, setShowRegister] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [clickedConnect, setClickedConnect] = useState(false);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connecting = isConnecting || clickedConnect;

  // Once the wallet actually starts connecting or connects, clear our interim flag
  useEffect(() => {
    if (connecting || connected) {
      setClickedConnect(false);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    }
  }, [connecting, connected]);

  // Called when user picks a wallet from the modal.
  // Best practice: only call select() here. WalletProvider's autoConnect
  // handles connect() internally via useEffect after React commits the state,
  // avoiding the WalletNotSelectedError race condition.
  const handleWalletSelect = useCallback(
    (walletName: string) => {
      setShowWalletModal(false);
      // @ts-ignore - WalletName is a branded string
      select(walletName);
      // Set interim flag so the button shows a loading state during the
      // brief gap before connecting=true propagates.
      setClickedConnect(true);
      // Safety timeout: reset flag if wallet never connects in 5s
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(
        () => setClickedConnect(false),
        5000,
      );
    },
    [select],
  );

  const isActive = (path: string) => location.pathname === path;

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : "";

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span>💎</span>
          <span>LoyaltyChain</span>
        </Link>

        <div className="navbar-links">
          <Link
            to="/"
            className={`navbar-link ${isActive("/") ? "active" : ""}`}
          >
            Home
          </Link>

          {/* Shop - visible to consumers and admins only, not merchants */}
          {role !== "merchant" && (
            <Link
              to="/marketplace"
              className={`navbar-link ${
                isActive("/marketplace") ? "active" : ""
              }`}
            >
              🛒 Shop
            </Link>
          )}

          {/* Consumer-only links */}
          {role === "consumer" && (
            <Link
              to="/dashboard"
              className={`navbar-link ${
                isActive("/dashboard") ? "active" : ""
              }`}
            >
              My Points
            </Link>
          )}

          {/* Merchant-only link */}
          {role === "merchant" && (
            <Link
              to="/merchant"
              className={`navbar-link ${isActive("/merchant") ? "active" : ""}`}
            >
              🏪 Merchant
            </Link>
          )}

          {/* Admin-only link */}
          {role === "admin" && (
            <Link
              to="/admin"
              className={`navbar-link ${isActive("/admin") ? "active" : ""}`}
            >
              🛡️ Admin
            </Link>
          )}

          {/* Become a Merchant — visible only to consumers */}
          {role === "consumer" && !merchantInfo && (
            <button
              className="become-merchant-btn"
              onClick={() => setShowRegister(true)}
            >
              <span className="become-merchant-icon">🏪</span>
              Become a Merchant
            </button>
          )}

          {/* Show status if merchant application exists but not approved */}
          {role === "consumer" && merchantInfo && (
            <div className="merchant-status-badge">
              <span className="status-icon">
                {merchantInfo.status === "pending"
                  ? "⏳"
                  : merchantInfo.status === "rejected"
                  ? "❌"
                  : "📋"}
              </span>
              <span className="status-text">
                {merchantInfo.status === "pending"
                  ? "Application Pending"
                  : merchantInfo.status === "rejected"
                  ? "Application Rejected"
                  : `Application ${merchantInfo.status}`}
              </span>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <span
              className="navbar-link"
              style={{ opacity: 0.5, cursor: "default" }}
            >
              ⏳
            </span>
          )}
        </div>

        {/* ── Wallet button ── */}
        {connected && publicKey ? (
          <div className="nb-wallet-connected">
            <div className="nb-address">
              <span className="nb-dot" />
              {shortAddress}
            </div>
            <button
              className="nb-disconnect"
              onClick={() => {
                disconnect();
                navigate("/");
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className={`nb-connect-btn${
              isConnecting ? " nb-connect-btn--loading" : ""
            }`}
            onClick={() => !isConnecting && setShowWalletModal(true)}
            disabled={isConnecting}
          >
            <span className="nb-connect-icon">
              {isConnecting ? "⏳" : "⚡"}
            </span>
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </nav>

      {/* Wallet selection modal */}
      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={handleWalletSelect}
      />

      {/* Registration modal */}
      <MerchantRegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      <style>{`
        /* ── Connect Wallet button ── */
        .nb-connect-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          border: 1px solid rgba(99, 102, 241, 0.4);
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1));
          color: #a5b4fc;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
          font-family: inherit;
        }
        .nb-connect-btn:hover {
          border-color: rgba(99,102,241,0.7);
          background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.18));
          color: #c7d2fe;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99,102,241,0.25);
        }
        .nb-connect-btn:active { transform: translateY(0); }
        .nb-connect-btn--loading {
          opacity: 0.65;
          cursor: not-allowed;
          pointer-events: none;
        }

        .nb-connect-icon {
          font-size: 13px;
        }

        /* ── Connected state ── */
        .nb-wallet-connected {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nb-address {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid rgba(20, 241, 149, 0.25);
          background: rgba(20, 241, 149, 0.07);
          color: #14f195;
          font-size: 13px;
          font-weight: 600;
          font-family: monospace;
        }

        .nb-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #14f195;
          box-shadow: 0 0 8px #14f195;
          flex-shrink: 0;
          animation: nb-pulse 2s ease infinite;
        }

        @keyframes nb-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .nb-disconnect {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid rgba(239, 68, 68, 0.25);
          background: rgba(239, 68, 68, 0.07);
          color: #f87171;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .nb-disconnect:hover {
          border-color: rgba(239,68,68,0.5);
          background: rgba(239,68,68,0.15);
          transform: translateY(-1px);
        }

        /* ── Become Merchant button ── */
        .become-merchant-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 10px;
          border: 1px solid rgba(20, 241, 149, 0.3);
          background: linear-gradient(135deg, rgba(20, 241, 149, 0.08), rgba(163, 230, 53, 0.06));
          color: #14f195;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }

        .become-merchant-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(20, 241, 149, 0.12), rgba(163, 230, 53, 0.1));
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .become-merchant-btn:hover {
          border-color: rgba(20, 241, 149, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(20, 241, 149, 0.15), 0 0 40px rgba(20, 241, 149, 0.05);
        }

        .become-merchant-btn:hover::before { opacity: 1; }
        .become-merchant-btn:active { transform: translateY(0); }

        .become-merchant-icon {
          font-size: 14px;
          position: relative;
          z-index: 1;
        }

        /* ── Merchant Status Badge ── */
        .merchant-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 10px;
          border: 1px solid rgba(245, 158, 11, 0.3);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(251, 191, 36, 0.06));
          color: #fbbf24;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          font-family: inherit;
        }

        .merchant-status-badge .status-icon {
          font-size: 14px;
        }

        .merchant-status-badge .status-text {
          font-size: 13px;
        }
      `}</style>
    </>
  );
};

export default Navbar;
