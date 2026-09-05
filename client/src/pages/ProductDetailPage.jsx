import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage, getProduct } from '../api/inventoryApi';
import StockAdjustModal from '../components/StockAdjustModal.jsx';
import {
  Card,
  EmptyState,
  ErrorState,
  StockBadge,
  formatDateTime,
  formatMoney,
  formatNumber,
} from '../components/ui.jsx';

/** หน้ารายละเอียดสินค้า + ไทม์ไลน์ประวัติการเคลื่อนไหวสต็อกทั้งหมด */
export default function ProductDetailPage({ onChanged }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [state, setState] = useState({ loading: true, error: null });
  const [adjusting, setAdjusting] = useState(false);

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const { data } = await getProduct(id);
      setProduct(data);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err) });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) {
    return (
      <div className="card">
        <div className="card__body col gap-lg">
          <div className="skeleton" style={{ width: '40%', height: 24 }} />
          <div className="skeleton" style={{ width: '70%' }} />
          <div className="skeleton" style={{ width: '55%' }} />
        </div>
      </div>
    );
  }

  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  if (!product) return null;

  const totalIn = product.transactions.filter((t) => t.type === 'IN').reduce((s, t) => s + t.quantity, 0);
  const totalOut = product.transactions.filter((t) => t.type === 'OUT').reduce((s, t) => s + t.quantity, 0);

  return (
    <div data-page="product-detail">
      <div className="page-head">
        <div className="page-head__text">
          <div className="row" style={{ marginBottom: 4 }}>
            <span className="sku">{product.sku}</span>
            <StockBadge qty={product.stockQuantity} />
          </div>
          <h1>{product.name}</h1>
          <p>
            {product.category ? `หมวดหมู่: ${product.category.name}` : 'ไม่ได้ระบุหมวดหมู่'} · สร้างเมื่อ{' '}
            {formatDateTime(product.createdAt)}
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/products" className="btn">
            ← กลับ
          </Link>
          <button type="button" className="btn btn--primary" onClick={() => setAdjusting(true)}>
            ปรับสต็อก
          </button>
        </div>
      </div>

      <div className="stats">
        <article className="stat">
          <div className="stat__icon" aria-hidden="true">
            📦
          </div>
          <div className="col">
            <span className="stat__label">คงเหลือปัจจุบัน</span>
            <span className="stat__value">{formatNumber(product.stockQuantity)}</span>
            <span className="stat__hint">ชิ้น</span>
          </div>
        </article>
        <article className="stat">
          <div className="stat__icon stat__icon--ok" aria-hidden="true">
            ⬇
          </div>
          <div className="col">
            <span className="stat__label">รับเข้าสะสม</span>
            <span className="stat__value">{formatNumber(totalIn)}</span>
            <span className="stat__hint">ชิ้น</span>
          </div>
        </article>
        <article className="stat">
          <div className="stat__icon stat__icon--danger" aria-hidden="true">
            ⬆
          </div>
          <div className="col">
            <span className="stat__label">จ่ายออกสะสม</span>
            <span className="stat__value">{formatNumber(totalOut)}</span>
            <span className="stat__hint">ชิ้น</span>
          </div>
        </article>
        <article className="stat">
          <div className="stat__icon stat__icon--warn" aria-hidden="true">
            💰
          </div>
          <div className="col">
            <span className="stat__label">มูลค่าคงคลัง</span>
            <span className="stat__value">{formatMoney(product.costPrice * product.stockQuantity)}</span>
            <span className="stat__hint">ต้นทุน {formatMoney(product.costPrice)}/ชิ้น</span>
          </div>
        </article>
      </div>

      <Card title={`ประวัติการเคลื่อนไหว (${product.transactions.length} รายการ)`}>
        {product.transactions.length === 0 ? (
          <EmptyState icon="🕘" title="ยังไม่มีประวัติ" text="เมื่อมีการปรับสต็อก รายการจะแสดงที่นี่" />
        ) : (
          <div className="timeline">
            {product.transactions.map((t) => (
              <div className="timeline__item" key={t.id}>
                <div className={`timeline__dot timeline__dot--${t.type.toLowerCase()}`} aria-hidden="true">
                  {t.type === 'IN' ? '⬇' : '⬆'}
                </div>
                <div className="col">
                  <span className="timeline__reason">{t.reason}</span>
                  <span className="timeline__meta">
                    {t.type === 'IN' ? 'รับเข้า' : 'จ่ายออก'} · {formatDateTime(t.createdAt)}
                  </span>
                </div>
                <span
                  className="timeline__qty"
                  style={{ color: t.type === 'IN' ? 'var(--ok-fg)' : 'var(--danger-fg)' }}
                >
                  {t.type === 'IN' ? '+' : '−'}
                  {formatNumber(t.quantity)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {adjusting && (
        <StockAdjustModal
          product={product}
          onClose={() => setAdjusting(false)}
          onSuccess={() => {
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
