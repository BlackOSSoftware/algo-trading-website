"use client";
import { useEffect, useId, useRef } from "react";

export function BrokerIcon({ kind = "feed" }: { kind?: "feed" | "candle" | "shield" | "key" }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "feed" ? <><path d="M3 12h4l3-7 4 14 3-7h4" /></> : kind === "candle" ? <><path d="M6 3v4m0 10v4M12 3v9m0 6v3M18 3v3m0 9v6" /><path d="M4 7h4v10H4zM10 12h4v6h-4zM16 6h4v9h-4z" /></> : kind === "key" ? <><circle cx="8" cy="9" r="4" /><path d="m11 12 9 9m-3-3 3-3m-6 0 3-3" /></> : <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" /><path d="m8 12 3 3 5-6" /></>}
  </svg>;
}

export function BrokerModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open) dialog.current?.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={dialog} className="broker-modal" aria-labelledby={titleId} onCancel={onClose} onClose={onClose}>
    <header><div><span className="broker-eyebrow">ACCOUNT SETUP</span><h2 id={titleId}>{title}</h2></div><button type="button" className="broker-close" aria-label="Close account setup" onClick={onClose}>×</button></header>
    <div className="broker-modal-body">{children}</div>
  </dialog>;
}
