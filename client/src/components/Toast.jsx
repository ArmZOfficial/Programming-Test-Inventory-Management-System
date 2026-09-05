import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { IconClose, IconInfo, IconSuccess, IconWarning } from './icons.jsx';

/**
 * ระบบแจ้งเตือนแบบ toast — ให้ feedback ทุกครั้งที่ผู้ใช้ทำ action
 * ใช้งาน:  const toast = useToast();  toast.success('บันทึกแล้ว')
 */
const ToastContext = createContext(null);

let seq = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, title, msg, ttl = 4200) => {
      const id = ++seq;
      setItems((prev) => [...prev, { id, type, title, msg }]);
      setTimeout(() => remove(id), ttl);
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      success: (title, msg) => push('success', title, msg),
      error: (title, msg) => push('error', title, msg, 6000),
      info: (title, msg) => push('info', title, msg),
    }),
    [push]
  );

  const icons = { success: IconSuccess, error: IconWarning, info: IconInfo };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite" data-role="toast-stack">
        {items.map((t) => {
          const Icon = icons[t.type];
          return (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <Icon size={18} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
            <div className="col">
              <span className="toast__title">{t.title}</span>
              {t.msg && <span className="toast__msg">{t.msg}</span>}
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => remove(t.id)}
              aria-label="ปิดการแจ้งเตือน"
              style={{ marginLeft: 'auto' }}
            >
              <IconClose size={14} />
            </button>
          </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast ต้องอยู่ภายใน <ToastProvider>');
  return ctx;
}
