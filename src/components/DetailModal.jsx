import React, { useEffect, useRef } from 'react';

export default function DetailModal({ isOpen, onClose, title, children, size = 'md' }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    // Focus trap en modal
    const handleKeyDown = (e) => {
      if (!modalRef.current) return;
      
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      modalRef.current?.addEventListener('keydown', handleKeyDown);
      
      // Focus al primer elemento cuando abre
      const firstButton = modalRef.current?.querySelector('button');
      firstButton?.focus();
      
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEsc);
        modalRef.current?.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'auto';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = size === 'lg' ? 'max-w-4xl' : 'max-w-2xl';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
      onClick={onClose}
      role="presentation"
    >
      <div 
        ref={modalRef}
        className={`glass bg-[#1a1d27] rounded-2xl w-full ${maxWidthClass} overflow-hidden shadow-2xl border border-gray-700 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-[#21253a]/50">
          <h2 id="modal-title" className="text-xl font-bold text-white tracking-wide">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors text-2xl leading-none"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
