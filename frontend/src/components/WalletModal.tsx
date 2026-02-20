import { FC, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (walletName: string) => void;
}

const WalletModal: FC<WalletModalProps> = ({ open, onClose, onSelect }) => {
  // Read wallet list for display; selection is handled by parent (Navbar)
  const { wallets, wallet: connectedWallet } = useWallet();

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSelect = useCallback(
    (walletName: string) => {
      onSelect(walletName);
    },
    [onSelect]
  );


  if (!open) return null;

  // Deduplicate by name (e.g. two MetaMask extensions showing up)
  const seen = new Set<string>();
  const uniqueWallets = wallets.filter((w) => {
    if (seen.has(w.adapter.name)) return false;
    seen.add(w.adapter.name);
    return true;
  });

  const detectedWallets = uniqueWallets.filter(
    (w) => w.readyState === 'Installed' || w.readyState === 'Loadable'
  );
  const otherWallets = uniqueWallets.filter(
    (w) => w.readyState !== 'Installed' && w.readyState !== 'Loadable'
  );

  return (
    <>
      {/* Backdrop */}
      <div className="wm-backdrop" onClick={onClose} />

      {/* Modal card */}
      <div className="wm-card" role="dialog" aria-modal="true" aria-label="Select wallet">
        {/* Header */}
        <div className="wm-header">
          <div className="wm-header-icon">💎</div>
          <div>
            <h2 className="wm-title">Connect Wallet</h2>
            <p className="wm-subtitle">Choose your Solana wallet to continue</p>
          </div>
          <button className="wm-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Wallet list */}
        <div className="wm-list">
          {detectedWallets.length === 0 && otherWallets.length === 0 && (
            <div className="wm-empty">
              <span style={{ fontSize: 32 }}>🔍</span>
              <p>No wallets detected. Install Phantom or Backpack to continue.</p>
            </div>
          )}

          {/* Detected / installed wallets */}
          {detectedWallets.length > 0 && (
            <>
              {detectedWallets.map((w) => (
                <button
                  key={w.adapter.name}
                  className={`wm-wallet-btn${connectedWallet?.adapter.name === w.adapter.name ? ' wm-wallet-btn--active' : ''}`}
                  onClick={() => handleSelect(w.adapter.name)}
                >
                  <img
                    src={w.adapter.icon}
                    alt={w.adapter.name}
                    className="wm-wallet-icon"
                  />
                  <span className="wm-wallet-name">{w.adapter.name}</span>
                  <span className="wm-badge wm-badge--detected">Detected</span>
                </button>
              ))}
            </>
          )}

          {/* Other (not installed) wallets */}
          {otherWallets.length > 0 && (
            <>
              <div className="wm-divider">
                <span>More wallets</span>
              </div>
              {otherWallets.map((w) => (
                <button
                  key={w.adapter.name}
                  className="wm-wallet-btn wm-wallet-btn--dim"
                  onClick={() => handleSelect(w.adapter.name)}
                >
                  <img
                    src={w.adapter.icon}
                    alt={w.adapter.name}
                    className="wm-wallet-icon"
                  />
                  <span className="wm-wallet-name">{w.adapter.name}</span>
                  <span className="wm-badge wm-badge--install">Not installed</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="wm-footer">
          New to Solana?{' '}
          <a href="https://phantom.app" target="_blank" rel="noopener noreferrer">
            Get Phantom →
          </a>
        </p>
      </div>

      <style>{`
        /* ── Backdrop ── */
        .wm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(5, 5, 20, 0.75);
          backdrop-filter: blur(6px);
          z-index: 998;
          animation: wm-fade-in 0.2s ease;
        }

        /* ── Card ── */
        .wm-card {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 999;
          width: 420px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 48px);
          overflow-y: auto;
          background: rgba(14, 16, 36, 0.96);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 24px;
          padding: 28px;
          box-shadow:
            0 0 0 1px rgba(99, 102, 241, 0.1),
            0 24px 64px rgba(0, 0, 0, 0.6),
            0 0 80px rgba(99, 102, 241, 0.08);
          animation: wm-slide-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* scrollbar */
        .wm-card::-webkit-scrollbar { width: 4px; }
        .wm-card::-webkit-scrollbar-track { background: transparent; }
        .wm-card::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.4); border-radius: 4px; }

        /* ── Header ── */
        .wm-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }

        .wm-header-icon {
          font-size: 28px;
          line-height: 1;
          flex-shrink: 0;
          filter: drop-shadow(0 0 12px rgba(99,102,241,0.6));
        }

        .wm-title {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 2px;
          background: linear-gradient(135deg, #a5b4fc, #e879f9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .wm-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }

        .wm-close {
          margin-left: auto;
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .wm-close:hover {
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.3);
          color: #f87171;
        }

        /* ── List ── */
        .wm-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── Wallet button ── */
        .wm-wallet-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #f1f5f9;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .wm-wallet-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08));
          opacity: 0;
          transition: opacity 0.2s ease;
          border-radius: inherit;
        }

        .wm-wallet-btn:hover {
          border-color: rgba(99,102,241,0.5);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99,102,241,0.2);
        }

        .wm-wallet-btn:hover::before { opacity: 1; }

        .wm-wallet-btn:active { transform: translateY(0); }

        .wm-wallet-btn--active {
          border-color: rgba(20, 241, 149, 0.5);
          background: rgba(20, 241, 149, 0.06);
        }

        .wm-wallet-btn--dim {
          opacity: 0.55;
        }
        .wm-wallet-btn--dim:hover {
          opacity: 0.85;
        }

        /* ── Wallet icon ── */
        .wm-wallet-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          object-fit: contain;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        /* ── Wallet name ── */
        .wm-wallet-name {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        /* ── Badges ── */
        .wm-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 20px;
          position: relative;
          z-index: 1;
          letter-spacing: 0.02em;
        }

        .wm-badge--detected {
          background: rgba(20, 241, 149, 0.15);
          border: 1px solid rgba(20, 241, 149, 0.35);
          color: #14f195;
        }

        .wm-badge--install {
          background: rgba(100, 116, 139, 0.15);
          border: 1px solid rgba(100, 116, 139, 0.3);
          color: #94a3b8;
        }

        /* ── Divider ── */
        .wm-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 8px 0 4px;
          color: #475569;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .wm-divider::before,
        .wm-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }

        /* ── Empty state ── */
        .wm-empty {
          text-align: center;
          padding: 28px;
          color: #64748b;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        /* ── Footer ── */
        .wm-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 13px;
          color: #475569;
        }
        .wm-footer a {
          color: #818cf8;
          font-weight: 600;
          transition: color 0.2s;
        }
        .wm-footer a:hover { color: #a5b4fc; }

        /* ── Animations ── */
        @keyframes wm-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes wm-slide-up {
          from { opacity: 0; transform: translate(-50%, -46%) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
};

export default WalletModal;
