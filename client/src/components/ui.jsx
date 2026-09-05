/**
 * ชิ้นส่วน UI เล็กๆ ที่ใช้ซ้ำทั้งระบบ + ตัวช่วย format
 * ทุกตัวมี data-role เพื่อให้เปลี่ยนไปใช้ UI library ทีหลังได้โดยไม่ต้องรื้อ logic
 */
import { IconEmpty, IconOutOfStock, IconPlug, IconSuccess, IconWarning } from './icons.jsx';

export const LOW_STOCK_THRESHOLD = 5;

export const formatMoney = (n) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(
    Number(n || 0)
  );

export const formatNumber = (n) => new Intl.NumberFormat('th-TH').format(Number(n || 0));

export const formatDateTime = (iso) =>
  new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));

/** จัดระดับสต็อกเป็น 3 ระดับ เพื่อสื่อสารด้วยสีให้ผู้ใช้เข้าใจทันที */
export function stockLevel(qty, threshold = LOW_STOCK_THRESHOLD) {
  if (qty <= 0) return { tone: 'danger', label: 'หมดสต็อก', Icon: IconOutOfStock };
  if (qty < threshold) return { tone: 'warn', label: 'ใกล้หมด', Icon: IconWarning };
  return { tone: 'ok', label: 'ปกติ', Icon: IconSuccess };
}

export function StockBadge({ qty, threshold = LOW_STOCK_THRESHOLD }) {
  const lv = stockLevel(qty, threshold);
  return (
    <span className={`badge badge--${lv.tone}`} data-role="stock-badge" title={`คงเหลือ ${qty} ชิ้น`}>
      <lv.Icon size={14} aria-hidden="true" />
      {lv.label}
    </span>
  );
}

export function StockMeter({ qty, max = 30 }) {
  const lv = stockLevel(qty);
  const pct = Math.max(3, Math.min(100, (qty / max) * 100));
  return (
    <div className="meter" role="img" aria-label={`ระดับสต็อก ${lv.label}`}>
      <div
        className={`meter__fill${lv.tone === 'ok' ? '' : ` meter__fill--${lv.tone}`}`}
        style={{ width: `${qty <= 0 ? 100 : pct}%` }}
      />
    </div>
  );
}

export function Card({ title, actions, children, bodyless = false }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card__head">
          {title && <h2 className="card__title">{title}</h2>}
          {actions && <div style={{ marginLeft: 'auto' }}>{actions}</div>}
        </header>
      )}
      {bodyless ? children : <div className="card__body">{children}</div>}
    </section>
  );
}

export function EmptyState({ icon: Icon = IconEmpty, title, text, action }) {
  return (
    <div className="state" data-role="empty-state">
      <div className="state__icon" aria-hidden="true">
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <p className="state__title">{title}</p>
      {text && <p className="state__text">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state" data-role="error-state">
      <div className="state__icon" aria-hidden="true">
        <IconPlug size={40} strokeWidth={1.5} />
      </div>
      <p className="state__title">โหลดข้อมูลไม่สำเร็จ</p>
      <p className="state__text">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          ลองใหม่อีกครั้ง
        </button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <tbody data-role="skeleton">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <div className="skeleton" style={{ width: c === 1 ? '70%' : '45%' }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
