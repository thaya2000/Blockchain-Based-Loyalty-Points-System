import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = [
  { value: 'food_beverage', label: '🍕 Food & Beverage' },
  { value: 'retail', label: '🛍️ Retail' },
  { value: 'services', label: '⚙️ Services' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'health_wellness', label: '💊 Health & Wellness' },
  { value: 'other', label: '📦 Other' },
];

const MerchantRegisterModal: FC<Props> = ({ open, onClose, onSuccess }) => {
  const { publicKey } = useWallet();
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    contactEmail: '',
    contactPhone: '',
    businessAddress: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const update = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!publicKey) return;
    if (!form.businessName.trim()) {
      setError('Business name is required');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch('http://localhost:3001/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          businessName: form.businessName.trim(),
          category: form.category || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          businessAddress: form.businessAddress.trim() || undefined,
        }),
      });

      const data = await resp.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        select {
          color-scheme: dark;
        }
        select option {
          background: #1f2937;
          color: #fff;
          padding: 6px 0;
        }
        select option:hover {
          background: #374151;
        }
        select option:checked {
          background: linear-gradient(135deg, #14f195, #a3e635);
          background-color: #14f195;
          color: #0a0f1e;
        }
      `}</style>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🏪 Become a Merchant</h2>
            <p style={styles.subtitle}>
              Register your business to start issuing loyalty points
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Status note */}
        <div style={styles.infoBar}>
          <span style={{ fontSize: 16 }}>ℹ️</span>
          <span>Your application will be reviewed by a platform admin before activation.</span>
        </div>

        {error && (
          <div style={styles.errorBar}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Business Name */}
          <div style={styles.field}>
            <label style={styles.label}>Business Name *</label>
            <input
              style={styles.input}
              placeholder="e.g. Urban Coffee Roasters"
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div style={styles.field}>
            <label style={styles.label}>Category</label>
            <select
              style={styles.input}
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
            >
              <option value="">— Select a category —</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Two-column: email + phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={styles.field}>
              <label style={styles.label}>Contact Email</label>
              <input
                style={styles.input}
                type="email"
                placeholder="you@business.com"
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input
                style={styles.input}
                type="tel"
                placeholder="+1 555-0123"
                value={form.contactPhone}
                onChange={(e) => update('contactPhone', e.target.value)}
              />
            </div>
          </div>

          {/* Address */}
          <div style={styles.field}>
            <label style={styles.label}>Business Address</label>
            <input
              style={styles.input}
              placeholder="123 Main St, City, Country"
              value={form.businessAddress}
              onChange={(e) => update('businessAddress', e.target.value)}
            />
          </div>

          {/* Wallet display */}
          <div style={styles.walletRow}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Wallet</span>
            <code style={styles.walletCode}>
              {publicKey?.toBase58().slice(0, 6)}…{publicKey?.toBase58().slice(-6)}
            </code>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
              disabled={submitting}
            >
              {submitting ? '⏳ Submitting…' : '🚀 Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

/* ── styles ── */
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(6px)',
    zIndex: 9998,
    animation: 'fadeIn .2s ease',
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw',
    maxWidth: 520,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#111827',
    border: '1px solid rgba(20,241,149,0.15)',
    borderRadius: 20,
    padding: '28px 28px 24px',
    zIndex: 9999,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 80px rgba(20,241,149,0.06)',
    animation: 'slideUp .3s cubic-bezier(.16,1,.3,1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#94a3b8',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#94a3b8',
    fontSize: 16,
    width: 36,
    height: 36,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all .2s',
  },
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 12,
    background: 'rgba(59,130,246,0.08)',
    border: '1px solid rgba(59,130,246,0.2)',
    fontSize: 13,
    color: '#93c5fd',
    marginBottom: 20,
  },
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 12,
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    fontSize: 13,
    color: '#fca5a5',
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    transition: 'border .2s',
    boxSizing: 'border-box' as const,
    colorScheme: 'dark',
  },
  walletRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  walletCode: {
    fontSize: 13,
    color: '#14f195',
    fontFamily: "'Space Grotesk', monospace",
  },
  actions: {
    display: 'flex',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 0',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .2s',
  },
  submitBtn: {
    flex: 2,
    padding: '12px 0',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #14f195, #a3e635)',
    color: '#0a0f1e',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all .2s',
    boxShadow: '0 4px 20px rgba(20,241,149,0.25)',
  },
};

export default MerchantRegisterModal;
