'use client';

/* CMS — shared admin UI primitives: toast notifications, form field,
   and a small confirm helper. */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconAlert, IconCheck } from './icons';

/* ---------- Toasts ---------- */

interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

const ToastContext = createContext<(kind: Toast['kind'], message: string) => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="adm-toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast ${t.kind}`}>
            {t.kind === 'success' ? <IconCheck /> : <IconAlert />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Form field ---------- */

export function Field({
  label,
  required,
  help,
  children,
  span2,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={`adm-field${span2 ? ' span-2' : ''}`}>
      <span className="adm-label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {help && <span className="adm-help">{help}</span>}
    </div>
  );
}

/* ---------- Confirm dialog (branded replacement for window.confirm) ---------- */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="adm-overlay"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div className="adm-modal" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="adm-modal-title">{title}</div>
        {body && <div className="adm-modal-body">{body}</div>}
        <div className="adm-row" style={{ justifyContent: 'flex-end', marginTop: 22 }}>
          <button className="adm-btn ghost sm" onClick={onCancel} autoFocus disabled={busy}>
            Cancel
          </button>
          <button
            className={`adm-btn sm${danger ? ' danger-solid' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page header ---------- */

export function PageHead({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="adm-page-head">
      <div>
        <div className="adm-eyebrow">{eyebrow}</div>
        <h1 className="adm-title">{title}</h1>
        {lede && <p className="adm-lede">{lede}</p>}
      </div>
      {actions && <div className="adm-row">{actions}</div>}
    </div>
  );
}
