import { useEffect, useRef } from 'react';
export default function LocationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (previous instanceof HTMLElement) previous.focus(); };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return <div className="info-overlay" onClick={onClose}><section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="location-title" onClick={event => event.stopPropagation()}><h2 id="location-title">About delivery locations</h2><p>Offers reflect the catalog location supplied by our price provider. Your address is selected on the store’s website, where local stock, final prices, and delivery charges are confirmed.</p><p>DealDock does not currently support address-specific comparisons.</p><button ref={closeRef} type="button" onClick={onClose}>Got it</button></section></div>;
}
