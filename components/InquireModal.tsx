'use client';
import { useEffect, useState, type FormEvent } from 'react';
import type { Residence } from '@/lib/data';
import { Eyebrow } from './Eyebrow';
import { CloseIcon } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  residence: Residence;
}

export function InquireModal({ open, onClose, residence }: Props) {
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!open) setSent(false);
  }, [open]);

  return (
    <div
      className={'modal-backdrop' + (open ? ' open' : '')}
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'transparent',
            border: 0,
          }}
        >
          <CloseIcon size={18} />
        </button>
        {!sent ? (
          <>
            <Eyebrow style={{ marginBottom: 14 }}>INQUIRE</Eyebrow>
            <h2 className="h2 serif" style={{ marginBottom: 8 }}>
              {residence.name}
            </h2>
            <p className="small muted" style={{ marginBottom: 32 }}>
              A member of our team will respond within one business day.
            </p>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <label className="field">
                <Eyebrow>FULL NAME</Eyebrow>
                <input className="input" required />
              </label>
              <label className="field">
                <Eyebrow>EMAIL</Eyebrow>
                <input className="input" type="email" required />
              </label>
              <label className="field">
                <Eyebrow>MESSAGE</Eyebrow>
                <textarea
                  className="input"
                  rows={3}
                  defaultValue={`I am interested in ${residence.name}.`}
                />
              </label>
              <button
                type="submit"
                className="btn btn-primary full-w"
                style={{ width: '100%', marginTop: 12 }}
              >
                Send inquiry
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Eyebrow style={{ marginBottom: 14 }}>THANK YOU</Eyebrow>
            <h2 className="h2 serif" style={{ marginBottom: 12 }}>
              Your inquiry is with us.
            </h2>
            <p className="body muted" style={{ marginBottom: 28 }}>
              We&apos;ll be in touch within one business day.
            </p>
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
