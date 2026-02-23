import React, { ReactNode } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: 'danger' | 'success' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onCancel} />
      <div className="confirm-modal">
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`modal-btn modal-btn-${confirmButtonClass}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Processing...' : confirmText}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 9998;
          animation: fadeIn 0.2s ease;
        }

        .confirm-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #1a2847 0%, #0f1628 100%);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          z-index: 9999;
          max-width: 500px;
          width: 90%;
          animation: slideIn 0.3s ease;
          overflow: hidden;
        }

        .modal-header {
          padding: 1.75rem 1.75rem 1rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          background: rgba(15, 22, 40, 0.8);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 700;
          background: linear-gradient(135deg, #a5b4fc, #14f195);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.01em;
        }

        .modal-body {
          padding: 1.75rem;
          color: #cbd5e1;
          font-size: 1rem;
          line-height: 1.6;
        }

        .modal-body p {
          margin: 0;
        }

        .modal-footer {
          padding: 1.5rem 1.75rem;
          background: rgba(10, 15, 30, 0.6);
          border-top: 1px solid rgba(99, 102, 241, 0.1);
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .modal-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 100px;
          text-align: center;
        }

        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-btn-cancel {
          background: rgba(148, 163, 184, 0.15);
          color: #cbd5e1;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .modal-btn-cancel:hover:not(:disabled) {
          background: rgba(148, 163, 184, 0.25);
          border-color: rgba(148, 163, 184, 0.5);
        }

        .modal-btn-primary {
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          color: #fff;
          border: none;
        }

        .modal-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }

        .modal-btn-success {
          background: linear-gradient(135deg, #14f195, #06d6a0);
          color: #0a0f1e;
          border: none;
          font-weight: 700;
        }

        .modal-btn-success:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(20, 241, 149, 0.4);
        }

        .modal-btn-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff;
          border: none;
        }

        .modal-btn-danger:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            transform: translate(-50%, -45%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
