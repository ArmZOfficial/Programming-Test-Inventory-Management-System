import { useEffect, useMemo, useState } from 'react';
import { adjustStock, getErrorMessage } from '../api/inventoryApi';
import { useToast } from './Toast.jsx';
import { IconClose, IconIn, IconOut, IconWarning } from './icons.jsx';
import { formatNumber } from './ui.jsx';

const REASONS_IN = ['รับสินค้าจาก PO', 'คืนสินค้าจากลูกค้า', 'ปรับยอดหลังนับสต็อก', 'โอนย้ายเข้าคลัง'];
const REASONS_OUT = ['ขายหน้าร้าน', 'สินค้าชำรุด', 'ตัวอย่างสินค้า', 'โอนย้ายออกจากคลัง'];

/**
 * ฟอร์มปรับสต็อก — ออกแบบให้ผู้ใช้ "ไม่ต้องคิดเรื่องเครื่องหมายลบ"
 * เลือกทิศทาง (รับเข้า/จ่ายออก) แล้วกรอกจำนวนเป็นบวกเสมอ
 * พร้อมพรีวิวยอดคงเหลือหลังปรับ และกันตัดเกินสต็อกตั้งแต่ฝั่ง UI
 */
export default function StockAdjustModal({ product, onClose, onSuccess }) {
  const [direction, setDirection] = useState('in');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const amount = Number(qty);
  const validAmount = Number.isInteger(amount) && amount > 0;
  const delta = direction === 'in' ? amount : -amount;
  const projected = useMemo(
    () => (validAmount ? product.stockQuantity + delta : product.stockQuantity),
    [validAmount, product.stockQuantity, delta]
  );

  const notEnough = direction === 'out' && validAmount && projected < 0;
  const canSubmit = validAmount && reason.trim() !== '' && !notEnough && !submitting;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const { data } = await adjustStock({
        productId: product.id,
        quantity: delta,
        reason: reason.trim(),
      });
      toast.success(
        direction === 'in' ? 'รับสินค้าเข้าสต็อกแล้ว' : 'ตัดสต็อกเรียบร้อย',
        `${product.name} — คงเหลือ ${formatNumber(data.stockQuantity)} ชิ้น`
      );
      onSuccess?.(data);
      onClose();
    } catch (err) {
      toast.error('ปรับสต็อกไม่สำเร็จ', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const chips = direction === 'in' ? REASONS_IN : REASONS_OUT;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      data-role="stock-adjust-modal"
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="adjust-title">
        <header className="modal__head">
          <div>
            <h2 className="modal__title" id="adjust-title">
              ปรับสต็อกสินค้า
            </h2>
            <p className="modal__sub">
              {product.name} · <span className="sku">{product.sku}</span>
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            style={{ marginLeft: 'auto' }}
          >
            <IconClose size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="field">
              <span className="field__label">ประเภทการเคลื่อนไหว</span>
              <div className="segmented" role="radiogroup" aria-label="ประเภทการเคลื่อนไหว">
                <button
                  type="button"
                  role="radio"
                  aria-checked={direction === 'in'}
                  data-kind="in"
                  className={`segmented__opt${direction === 'in' ? ' is-active' : ''}`}
                  onClick={() => setDirection('in')}
                >
                  <IconIn size={18} aria-hidden="true" /> รับเข้า
                  <small>เพิ่มสต็อก (IN)</small>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={direction === 'out'}
                  data-kind="out"
                  className={`segmented__opt${direction === 'out' ? ' is-active' : ''}`}
                  onClick={() => setDirection('out')}
                >
                  <IconOut size={18} aria-hidden="true" /> จ่ายออก
                  <small>ลดสต็อก (OUT)</small>
                </button>
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="adjust-qty">
                จำนวน (ชิ้น)<span className="req">*</span>
              </label>
              <input
                id="adjust-qty"
                className="input"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="เช่น 10"
                value={qty}
                autoFocus
                aria-invalid={notEnough}
                onChange={(e) => setQty(e.target.value)}
              />
              {notEnough ? (
                <span className="field__error">
                  <IconWarning size={14} /> สต็อกไม่เพียงพอ — คงเหลือเพียง {formatNumber(product.stockQuantity)} ชิ้น
                </span>
              ) : (
                <span className="field__hint">กรอกเป็นจำนวนเต็มบวก ระบบจะคิดเครื่องหมายให้อัตโนมัติ</span>
              )}
            </div>

            <div className="stock-preview" data-role="stock-preview">
              <span className="muted">คงเหลือปัจจุบัน</span>
              <span className="stock-preview__num">{formatNumber(product.stockQuantity)}</span>
              <span aria-hidden="true">→</span>
              <span className="muted">หลังปรับ</span>
              <span
                className="stock-preview__num"
                style={{ color: notEnough ? 'var(--danger-fg)' : 'var(--brand-600)' }}
              >
                {formatNumber(projected)}
              </span>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label className="field__label" htmlFor="adjust-reason">
                เหตุผล<span className="req">*</span>
              </label>
              <input
                id="adjust-reason"
                className="input"
                placeholder="เช่น รับสินค้าจาก PO#001"
                value={reason}
                maxLength={200}
                onChange={(e) => setReason(e.target.value)}
              />
              <span className="field__hint">ทุกการเคลื่อนไหวถูกบันทึกเป็นประวัติที่ย้อนดูได้เสมอ</span>
              <div className="chips">
                {chips.map((c) => (
                  <button key={c} type="button" className="chip" onClick={() => setReason(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <footer className="modal__foot">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
              {submitting && <span className="spinner" aria-hidden="true" />}
              {direction === 'in' ? 'ยืนยันรับเข้า' : 'ยืนยันจ่ายออก'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
