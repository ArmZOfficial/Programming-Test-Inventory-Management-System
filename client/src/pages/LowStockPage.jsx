import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, getLowStock } from '../api/inventoryApi';
import Pagination from '../components/Pagination.jsx';
import ProductTable from '../components/ProductTable.jsx';
import StockAdjustModal from '../components/StockAdjustModal.jsx';
import { IconBell, IconCelebrate, IconRefresh, IconWarning } from '../components/icons.jsx';
import { EmptyState, ErrorState, formatNumber } from '../components/ui.jsx';

const PRESETS = [3, 5, 10, 20];
const PAGE_SIZE = 10;

/** หน้าแจ้งเตือนสินค้าใกล้หมด — ปรับเกณฑ์ (threshold) ได้เอง ค่าเริ่มต้น < 5 ตามโจทย์ */
export default function LowStockPage({ onChanged }) {
  const [threshold, setThreshold] = useState(5);
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [adjusting, setAdjusting] = useState(null);
  const [page, setPage] = useState(1);

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

  // เปลี่ยนเกณฑ์แล้วกลับไปหน้าแรกเสมอ
  useEffect(() => setPage(1), [threshold]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);
  const outOfStock = items.filter((p) => p.stockQuantity <= 0).length;

  return (
    <div data-page="low-stock">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="row">
            <IconBell size={22} aria-hidden="true" /> สินค้าใกล้หมด
          </h1>
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
          <IconWarning size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
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
              <IconRefresh size={15} /> รีเฟรช
            </button>
          </div>
        </div>

        {state.error ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : (
          <>
          <ProductTable
            products={pageItems}
            loading={state.loading}
            threshold={threshold}
            onAdjust={setAdjusting}
            emptyState={
              <EmptyState
                icon={IconCelebrate}
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
          {!state.loading && (
            <Pagination page={page} totalPages={totalPages} total={items.length} showing={pageItems.length} onChange={setPage} />
          )}
          </>
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
