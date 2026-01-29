import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const HomePage: FC = () => {
  const { connected, connecting } = useWallet();
  const displayFont = { fontFamily: '"Fraunces", "Space Grotesk", serif' };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col">
      <div className="flex-1">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(20,241,149,0.18),_transparent_60%)]"></div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(245,158,11,0.18),_transparent_55%)]"></div>
          <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(90deg,_rgba(255,255,255,0.06)_1px,_transparent_1px),linear-gradient(180deg,_rgba(255,255,255,0.06)_1px,_transparent_1px)] bg-[size:48px_48px]"></div>

          <section className="container mx-auto max-w-4xl px-4 py-20 sm:py-24 lg:py-32">
            <div className="rounded-[28px] border border-white/10 bg-white/5 px-8 py-12 sm:px-12 sm:py-16 backdrop-blur-xl shadow-2xl">
              {/* Badge */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
                  <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                    Solana native
                  </span>
                  <span className="text-[11px]">Non-custodial</span>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6 mb-8 text-center">
                <h1 style={displayFont} className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight">
                  Loyalty points that travel with you.
                </h1>
                <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                  Earn at any partner, redeem anywhere. Your rewards, your wallet, your control.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
                {!connected ? (
                  <>
                    <WalletMultiButton className="!text-base !font-bold !px-10 !py-4 !rounded-xl !bg-emerald-400 !text-[#0b0f17] hover:!bg-emerald-300 transition-all" />
                    <Link
                      to="/rewards"
                      className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-center text-sm font-semibold text-white hover:bg-white/10 transition-all"
                    >
                      Explore rewards
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/dashboard"
                      className="group rounded-xl bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 px-10 py-4 text-center text-base font-bold text-[#0b0f17] shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                    >
                      <span className="flex items-center justify-center gap-2">
                        Go to dashboard
                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </Link>
                    <Link to="/marketplace" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-10 py-4 text-center text-base font-semibold text-emerald-100 hover:bg-emerald-400/20 transition-all">
                      Browse marketplace
                    </Link>
                  </>
                )}
              </div>

              {/* Helper text */}
              {!connected && (
                <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
                  {connecting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <span>✓ No signup • ✓ Instant • ✓ Secure</span>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Features Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-6">
              {[
                { icon: '🔗', title: 'Universal', desc: 'Use at any merchant in our network' },
                { icon: '🔒', title: 'Yours', desc: 'Full control of your rewards always' },
                { icon: '📊', title: 'Transparent', desc: 'Every transaction on-chain' },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="group relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-white/5 to-amber-500/5 p-8 hover:border-emerald-400/60 hover:bg-gradient-to-br hover:from-emerald-500/15 hover:via-white/10 hover:to-amber-500/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-400/20 blur-2xl group-hover:bg-emerald-400/30 transition-all"></div>
                  <div className="relative text-center space-y-3">
                    <div className="text-5xl group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                    <h3 className="font-semibold text-white text-lg">{item.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-white/5 to-amber-500/10 p-12 shadow-2xl shadow-emerald-500/10">
            <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/30 blur-3xl"></div>
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-40 w-40 rounded-full bg-amber-400/30 blur-3xl"></div>

            <div className="relative text-center space-y-6">
              <h2 style={displayFont} className="text-3xl sm:text-4xl font-semibold text-white">
                Start earning rewards now
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">Join thousands earning loyalty points across our network</p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                {!connected ? (
                  <>
                    <WalletMultiButton className="!text-base !font-bold !px-12 !py-4 !rounded-xl !bg-emerald-400 !text-[#0b0f17] hover:!bg-emerald-300 hover:!shadow-lg hover:!shadow-emerald-500/30 transition-all" />
                    <Link to="/rewards" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-10 py-4 text-base font-semibold text-emerald-100 hover:bg-emerald-400/20 hover:border-emerald-400/60 transition-all">
                      View rewards
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/marketplace" className="rounded-xl bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 px-12 py-4 text-base font-bold text-[#0b0f17] shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl">
                      Browse marketplace
                    </Link>
                    <Link to="/dashboard" className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-10 py-4 text-base font-semibold text-emerald-100 hover:bg-emerald-400/20 hover:border-emerald-400/60 transition-all">
                      View dashboard
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-gradient-to-b from-white/2.5 to-white/0 px-4 py-16 mt-20">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-amber-400 text-sm font-bold text-[#0b0f17]">
                LC
              </div>
              <div>
                <p className="font-semibold text-white text-sm">LoyaltyChain</p>
                <p className="text-xs text-slate-400">Rewards that travel with you</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <Link to="/" className="text-slate-400 hover:text-emerald-400 transition-colors font-medium">Home</Link>
              <Link to="/rewards" className="text-slate-400 hover:text-emerald-400 transition-colors font-medium">Rewards</Link>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors font-medium">Docs</a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors font-medium">Support</a>
            </div>

            {/* Copyright */}
            <p className="text-xs text-slate-500 text-center md:text-right">
              © 2024 LoyaltyChain. Powered by Solana.
            </p>
          </div>
          
          {/* Divider */}
          <div className="border-t border-white/5 mt-8 pt-8">
            <p className="text-center text-xs text-slate-600">
              Fast • Transparent • Secure
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
