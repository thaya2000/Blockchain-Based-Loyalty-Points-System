import React, { useEffect } from 'react';

interface MessageModalProps {
  isOpen: boolean;
  type?: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  onClose: () => void;
  autoCloseDuration?: number; // ms, 0 = no auto close
}

export default function MessageModal({
  isOpen,
  type = 'success',
  title,
  message,
  onClose,
  autoCloseDuration = 3500,
}: MessageModalProps) {
  useEffect(() => {
    if (isOpen && autoCloseDuration > 0) {
      const timer = setTimeout(onClose, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDuration, onClose]);

  if (!isOpen) return null;

  const icons: Record<string, string> = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className={`message-modal message-modal-${type}`}>
        <div className="message-modal-content">
          <div className="message-icon">{icons[type]}</div>
          {title && <h3 className="message-title">{title}</h3>}
          <p className="message-text">{message}</p>
          <button className="message-close-btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>

      <style>{`
        .message-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          z-index: 9999;
          max-width: 450px;
          width: 90%;
          animation: slideIn 0.3s ease;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .message-modal-success {
          background: linear-gradient(135deg, rgba(20, 241, 149, 0.15), rgba(6, 214, 160, 0.1));
          border: 1px solid rgba(20, 241, 149, 0.4);
        }

        .message-modal-error {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .message-modal-info {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.4);
        }

        .message-modal-content {
          padding: 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .message-icon {
          font-size: 3rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 700;
        }

        .message-modal-success .message-icon {
          background: rgba(20, 241, 149, 0.2);
          color: #14f195;
        }

        .message-modal-error .message-icon {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .message-modal-info .message-icon {
          background: rgba(99, 102, 241, 0.2);
          color: #6366f1;
        }

        .message-title {
          margin: 0;
          font-size: 1.3rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.01em;
        }

        .message-text {
          margin: 0;
          color: #cbd5e1;
          font-size: 1rem;
          line-height: 1.6;
          white-space: pre-line;
        }

        .message-close-btn {
          margin-top: 0.5rem;
          padding: 0.75rem 2rem;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 100px;
        }

        .message-modal-success .message-close-btn {
          background: linear-gradient(135deg, #14f195, #06d6a0);
          color: #0a0f1e;
        }

        .message-modal-success .message-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(20, 241, 149, 0.4);
        }

        .message-modal-error .message-close-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff;
        }

        .message-modal-error .message-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
        }

        .message-modal-info .message-close-btn {
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          color: #fff;
        }

        .message-modal-info .message-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </>
  );
}
