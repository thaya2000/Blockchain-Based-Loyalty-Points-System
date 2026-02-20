import { FC, useEffect, useState, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useUserRole } from '../context/UserRoleContext';

/* ── colour tokens ── */
const C = {
  bg: '#0a0f1e',
  surface: '#0f1628',
  white: '#ffffff',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  emerald: '#14f195',
  emeraldDark: '#0fcf7f',
  lime: '#a3e635',
  violet: '#9945ff',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
};

/* ── reusable style fragments ── */
const absOverlay: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
};

const HomePage: FC = () => {
  const { connected, connecting, connect, select, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { role, loading: roleLoading } = useUserRole();
  const [vis, setVis] = useState(false);
  
  useEffect(() => { setVis(true); }, []);

  // Log connection state changes
  useEffect(() => {
    console.log('📊 HomePage connection state:', { 
      connected, 
      connecting, 
      publicKey: publicKey?.toBase58().slice(0, 8) + '...', 
      role, 
      roleLoading 
    });
  }, [connected, connecting, publicKey, role, roleLoading]);

  // Handle wallet connection with explicit modal
  const handleConnectWallet = () => {
    console.log('🔌 Opening wallet modal...');
    try {
      setVisible(true);
    } catch (error) {
      // Suppress Chrome extension messaging errors
      const errorMsg = String(error);
      if (!errorMsg.includes('message channel closed')) {
        console.error('❌ Wallet connection error:', error);
      }
    }
  };

  // Role-specific dashboard link
  const dashboardLink = role === 'admin' ? '/admin' : role === 'merchant' ? '/merchant' : '/dashboard';
  const dashboardLabel = role === 'admin' ? 'Go to Admin Panel' : role === 'merchant' ? 'Go to Merchant Portal' : 'Go to Dashboard';

  const fadeIn = (delay = 0): CSSProperties => ({
    opacity: vis ? 1 : 0,
    transform: vis ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.9s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.9s cubic-bezier(.16,1,.3,1) ${delay}s`,
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.white,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
      margin: '-24px',
      width: 'calc(100% + 48px)',
    }}>

      {/* ══════ HERO ══════ */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {/* Gradient orbs */}
        <div style={{ ...absOverlay, top: '-15%', left: '8%', width: 550, height: 550, borderRadius: '50%', background: 'rgba(20,241,149,0.09)', filter: 'blur(120px)' }} />
        <div style={{ ...absOverlay, top: '5%', right: '4%', width: 480, height: 480, borderRadius: '50%', background: 'rgba(153,69,255,0.08)', filter: 'blur(110px)' }} />
        <div style={{ ...absOverlay, bottom: '-5%', left: '35%', width: 360, height: 360, borderRadius: '50%', background: 'rgba(245,158,11,0.06)', filter: 'blur(100px)' }} />

        {/* Subtle dot grid */}
        <div style={{
          ...absOverlay,
          inset: 0,
          opacity: 0.035,
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Hero content */}
        <section style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px 20px',
        }}>
          <div style={{ maxWidth: 720, width: '100%', textAlign: 'center', ...fadeIn(0) }}>

            {/* Badge */}
            {/* <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 100,
                border: `1px solid rgba(20,241,149,0.25)`,
                background: 'rgba(20,241,149,0.06)',
                padding: '8px 20px',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                color: 'rgba(20,241,149,0.85)',
                fontWeight: 600,
              }}>
                <span style={{ position: 'relative', width: 8, height: 8, display: 'inline-flex' }}>
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: C.emerald, opacity: 0.6,
                    animation: 'homePing 1.5s cubic-bezier(0,0,0.2,1) infinite',
                  }} />
                  <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: C.emerald }} />
                </span>
                Solana powered · Non-custodial
              </div>
            </div> */}

            {/* Headline */}
            <h1 style={{
              fontFamily: "'Fraunces', 'Space Grotesk', serif",
              fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 12,
            }}>
              <span style={{
                display: 'block',
                background: 'linear-gradient(to bottom right, #fff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Rewards That
              </span>
              <span style={{
                display: 'block',
                background: `linear-gradient(135deg, ${C.emerald}, ${C.lime})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Travel With You
              </span>
            </h1>

            {/* Subheadline */}
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: C.slate400,
              lineHeight: 1.7,
              maxWidth: 480,
              margin: '0 auto 16px',
              fontWeight: 300,
            }}>
              Earn loyalty points at any partner. Redeem anywhere.{' '}
              <span style={{ color: C.slate300 }}>Your wallet, your control.</span>
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16, ...fadeIn(0.15) }}>
              {!connected ? (
                <>
                  <button
                    onClick={handleConnectWallet}
                    disabled={connecting}
                    className="wallet-button-connect"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      height: '48px',
                      background: `linear-gradient(135deg, ${C.emerald}, ${C.lime})`,
                      color: C.bg,
                      fontWeight: 700,
                      fontSize: 15,
                      padding: '0 32px',
                      borderRadius: 14,
                      border: 'none',
                      cursor: connecting ? 'not-allowed' : 'pointer',
                      boxShadow: `0 8px 32px rgba(20,241,149,0.25)`,
                      transition: 'all 0.25s',
                      opacity: connecting ? 0.7 : 1,
                    }}
                  >
                    {connecting ? (
                      <>
                        <div style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: C.bg,
                          opacity: 0.6,
                          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                        }} />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      'Connect Wallet'
                    )}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to={dashboardLink}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      height: '48px',
                      padding: '0 32px',
                      borderRadius: 14,
                      background: `linear-gradient(135deg, ${C.emerald}, ${C.lime})`,
                      color: C.bg,
                      fontWeight: 700,
                      fontSize: 15,
                      textDecoration: 'none',
                      boxShadow: `0 8px 32px rgba(20,241,149,0.25)`,
                      transition: 'all 0.25s',
                    }}
                  >
                    {dashboardLabel}
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    to="/marketplace"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      height: '48px',
                      padding: '0 32px',
                      borderRadius: 14,
                      border: `1px solid ${C.borderHover}`,
                      background: 'rgba(255,255,255,0.04)',
                      color: C.slate300,
                      fontWeight: 600,
                      fontSize: 15,
                      textDecoration: 'none',
                      transition: 'all 0.25s',
                    }}
                  >
                    Browse marketplace
                  </Link>
                </>
              )}
            </div>

            {/* Trust indicators */}
            {!connected && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap', ...fadeIn(0.3) }}>
                {connecting ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.emerald, fontSize: 14, fontWeight: 500 }}>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: C.emerald,
                      opacity: 0.6,
                      animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                    }} />
                    <span>Select account in your wallet...</span>
                  </div>
                ) : (
                  ['No signup required', 'Instant setup', '100% on-chain'].map((t) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: C.slate400 }}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={C.emerald} strokeWidth={2.5} style={{ opacity: 0.7 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {t}
                    </div>
                  ))
                )}
              </div>
            )}


          </div>
        </section>

        {/* ══════ HOW IT WORKS ══════ */}
        <section style={{ position: 'relative', padding: '16px 24px 24px', ...fadeIn(0.45) }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
              {([
                {
                  step: '01',
                  icon: 'M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3',
                  title: 'Connect wallet',
                  desc: 'Link your Solana wallet in seconds. No registration needed.',
                },
                {
                  step: '02',
                  icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                  title: 'Earn points',
                  desc: 'Accumulate LoyaltyChain points at participating partners instantly.',
                },
                {
                  step: '03',
                  icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
                  title: 'Redeem anywhere',
                  desc: 'Use points for rewards across our entire partner network global.',
                },
              ] as const).map(({ step, icon, title, desc }) => (
                <div key={step} style={{
                  borderRadius: 20,
                  border: `1px solid rgba(20,241,149,0.12)`,
                  background: 'rgba(20,241,149,0.03)',
                  padding: '16px 18px',
                  transition: 'all 0.3s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: 'rgba(20,241,149,0.35)', fontFamily: "'Space Grotesk', monospace" }}>{step}</span>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'rgba(20,241,149,0.08)',
                      border: '1px solid rgba(20,241,149,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={C.emerald} strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                    </div>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 4 }}>{title}</h3>
                  <p style={{ fontSize: 12, color: C.slate500, lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ══════ FOOTER ══════ */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: '16px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        maxWidth: 900,
        margin: '0 auto',
        width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.emerald}, ${C.lime})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: C.bg,
          }}>LC</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.white }}>LoyaltyChain</span>
        </div>

        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          {[
            { label: 'Home', to: '/' },
            { label: 'Marketplace', to: '/marketplace' },
            { label: 'Docs', to: '#' },
          ].map(({ label, to }) => (
            <Link key={label} to={to} style={{ color: C.slate500, textDecoration: 'none', transition: 'color 0.2s' }}>{label}</Link>
          ))}
        </div>

        <p style={{ fontSize: 12, color: C.slate600 }}>
          © {new Date().getFullYear()} LoyaltyChain. All rights reserved.
        </p>
      </footer>

      {/* keyframes for ping animation */}
      <style>{`
        @keyframes homePing {
          75%, 100% { transform: scale(2); opacity: 0; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .wallet-button-connect {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif !important;
        }

        .wallet-button-connect:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 40px rgba(20,241,149,0.35) !important;
        }

        .wallet-button-connect:active:not(:disabled) {
          transform: translateY(0) !important;
        }

        .wallet-button-connect:disabled {
          opacity: 0.7 !important;
          cursor: not-allowed !important;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
