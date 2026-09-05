import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, getLowStock, getProducts, getTransactions } from '../api/inventoryApi';
import {
  Card,
  EmptyState,
  ErrorState,
  StockBadge,
  formatDateTime,
  formatMoney,
  formatNumber,
} from '../components/ui.jsx';

/** หน้าแรก — สรุปตัวเลขสำคัญให้เห็นสถานะคลังภายใน 3 วินาที */
export default function DashboardPage() {
  const [state, setState] = useState({ loading: true, error: null });
  const [products, setProducts] = useState([]);
  const [low, setLow] = useState([]);
  const [txs, setTxs] = useState([]);

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const [pRes, lRes, tRes] = await Promise.all([
        getProducts({ limit: 100 }),
        getLowStock(5),
        getTransactions(),
      ]);
      setProducts(pRes.data.data);
      setLow(lRes.data.data);
      setTxs(tRes.data.data.slice(0, 8));
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  const totalItems = products.reduce((s, p) => s + p.stockQuantity, 0);
  const totalValue = products.reduce((s, p) => s + p.stockQuantity * p.costPrice, 0);
  const outOfStock = products.filter((p) => p.stockQuantity <= 0).length;

  const stats = [
    { icon: '📦', tone: '', label: 'สินค้าทั้งหมด', value: formatNumber(products.length), hint: 'รายการ (SKU)' },
    { icon: '🧮', tone: 'ok', label: 'จำนวนชิ้นในคลัง', value: formatNumber(totalItems), hint: 'ชิ้น' },
    { icon: '⚠️', tone: 'warn', label: 'ใกล้หมด (< 5)', value: formatNumber(low.length), hint: 'ต้องเติมสต็อก' },
    { icon: '⛔', tone: 'danger', label: 'หมดสต็อก', value: formatNumber(outOfStock), hint: 'ขายไม่ได้' },
  ];

  return (
    <div data-page="dashboard">
      <div className="page-head">
        <div className="page-head__text">
          <h1>ภาพรวมคลังสินค้า</h1>
          <p>สรุปสถานะสต็อกและความเคลื่อนไหวล่าสุดของคลัง</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn" onClick={load} disabled={state.loading}>
            {state.loading ? <span className="spinner" /> : '↻'} รีเฟรช
          </button>
          <Link to="/products/new" className="btn btn--primary">
            ➕ เพิ่มสินค้า
          </Link>
        </div>
      </div>

      <div className="stats">
        {stats.map((s) => (
          <article className="stat" key={s.label}>
            <div className={`stat__icon${s.tone ? ` stat__icon--${s.tone}` : ''}`} aria-hidden="true">
              {s.icon}
            </div>
            <div className="col">
              <span className="stat__label">{s.label}</span>
              <span className="stat__value">{state.loading ? '—' : s.value}</span>
              <span className="stat__hint">{s.hint}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="stats" style={{ gridTemplateColumns: '1fr' }}>
        <article className="stat">
          <div className="stat__icon stat__icon--ok" aria-hidden="true">
            💰
          </div>
          <div className="col">
            <span className="stat__label">มูลค่าสินค้าคงคลังรวม (ราคาทุน)</span>
            <span className="stat__value">{state.loading ? '—' : formatMoney(totalValue)}</span>
            <span className="stat__hint">คำนวณจาก ต้นทุนต่อชิ้น × จำนวนคงเหลือ ของสินค้าทุกรายการ</span>
          </div>
        </article>
      </div>

      <div className="grid-2 mt-lg">
        <Card
          title="ความเคลื่อนไหวล่าสุด"
          actions={
            <Link to="/transactions" className="btn btn--sm">
              ดูทั้งหมด
            </Link>
          }
        >
          {txs.length === 0 ? (
            <EmptyState icon="🕘" title="ยังไม่มีการเคลื่อนไหว" text="เมื่อมีการรับเข้า/จ่ายออก จะแสดงที่นี่" />
          ) : (
            <div className="timeline">
              {txs.map((t) => (
                <div className="timeline__item" key={t.id}>
                  <div className={`timeline__dot timeline__dot--${t.type.toLowerCase()}`} aria-hidden="true">
                    {t.type === 'IN' ? '⬇' : '⬆'}
                  </div>
                  <div className="col">
                    <span className="timeline__reason">{t.product?.name || `สินค้า #${t.productId}`}</span>
                    <span className="timeline__meta">
                      {t.reason} · {formatDateTime(t.createdAt)}
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

        <Card
          title="ต้องเติมสต็อกด่วน"
          actions={
            <Link to="/low-stock" className="btn btn--sm">
              จัดการ
            </Link>
          }
        >
          {low.length === 0 ? (
            <EmptyState icon="🎉" title="สต็อกทุกรายการเพียงพอ" text="ไม่มีสินค้าที่ต่ำกว่าเกณฑ์ 5 ชิ้น" />
          ) : (
            <div className="timeline">
              {low.slice(0, 6).map((p) => (
                <div className="timeline__item" key={p.id}>
                  <div
                    className={`timeline__dot timeline__dot--${p.stockQuantity <= 0 ? 'out' : 'in'}`}
                    aria-hidden="true"
                  >
                    {p.stockQuantity}
                  </div>
                  <div className="col">
                    <Link to={`/products/${p.id}`} className="timeline__reason">
                      {p.name}
                    </Link>
                    <span className="timeline__meta">{p.sku}</span>
                  </div>
                  <StockBadge qty={p.stockQuantity} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
