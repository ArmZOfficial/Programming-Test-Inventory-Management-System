import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, getLowStock } from '../api/inventoryApi';
import ProductTable from '../components/ProductTable.jsx';
import StockAdjustModal from '../components/StockAdjustModal.jsx';
import { EmptyState, ErrorState, formatNumber } from '../components/ui.jsx';

const PRESETS = [3, 5, 10, 20];

/** หน้าแจ้งเตือนสินค้าใกล้หมด — ปรับเกณฑ์ (threshold) ได้เอง ค่าเริ่มต้น < 5 ตามโจทย์ */
export default function LowStockPage({ onChanged }) {
  const [threshold, setThreshold] = useState(5);
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [adjusting, setAdjusting] = useState(null);

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const { data } = await getLowStock(threshold);
      setItems(data.data);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err) });
    }
  }, [threshold]);

  useEffect(() => {
    load();
  }, [load]);

  const outOfStock = items.filter((p) => p.stockQuantity <= 0).length;

  return (
    <div data-page="low-stock">
      <div className="page-head">
        <div className="page-head__text">
          <h1>🔔 สินค้าใกล้หมด</h1>
          <p>
            สินค้าที่มีจำนวนคงเหลือ <strong>น้อยกว่า {threshold} ชิ้น</strong> — ควรเติมสต็อกก่อนขายไม่ได้
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/products" className="btn">
            ดูสินค้าทั้งหมด
          </Link>
        </div>
      </div>

      {!state.loading && items.length > 0 && (
        <div className="alert alert--warn" role="status">
          <span aria-hidden="true">⚠️</span>
          <div>
            พบ <strong>{formatNumber(items.length)}</strong> รายการที่ต้องเติมสต็อก
            {outOfStock > 0 && (
              <>
                {' '}
                และในจำนวนนี้ <strong>{formatNumber(outOfStock)}</strong> รายการหมดสต็อกแล้ว
              </>
            )}
          </div>
        </div>
      )}

      <section className="card">
        <div className="card__head">
          <div className="toolbar" style={{ width: '100%' }}>
            <span className="card__title">เกณฑ์แจ้งเตือน (threshold)</span>
            <div className="btn-group">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn btn--sm${threshold === n ? ' btn--primary' : ''}`}
                  onClick={() => setThreshold(n)}
                >
                  &lt; {n}
                </button>
              ))}
            </div>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              style={{ width: 110, marginLeft: 'auto' }}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
              aria-label="กำหนดเกณฑ์แจ้งเตือนเอง"
            />
            <button type="button" className="btn" onClick={load} disabled={state.loading}>
              ↻ รีเฟรช
            </button>
          </div>
        </div>

        {state.error ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : (
          <ProductTable
            products={items}
            loading={state.loading}
            threshold={threshold}
            onAdjust={setAdjusting}
            emptyState={
              <EmptyState
                icon="🎉"
                title="ไม่มีสินค้าที่ใกล้หมด"
                text={`ทุกรายการมีสต็อกตั้งแต่ ${threshold} ชิ้นขึ้นไป`}
                action={
                  <Link to="/products" className="btn">
                    ดูสินค้าทั้งหมด
                  </Link>
                }
              />
            }
          />
        )}
      </section>

      {adjusting && (
        <StockAdjustModal
          product={adjusting}
          onClose={() => setAdjusting(null)}
          onSuccess={() => {
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
