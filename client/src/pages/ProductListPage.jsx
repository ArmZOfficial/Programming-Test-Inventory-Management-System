import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getErrorMessage, getProducts } from '../api/inventoryApi';
import ProductTable from '../components/ProductTable.jsx';
import StockAdjustModal from '../components/StockAdjustModal.jsx';
import { EmptyState, ErrorState } from '../components/ui.jsx';

/** หน้ารายการสินค้า — ค้นหา / กรองหมวดหมู่ / แบ่งหน้า / ปรับสต็อกได้ในตัว */
export default function ProductListPage({ onChanged }) {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: '', categoryId: '', page: 1 });
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ loading: true, error: null });
  const [adjusting, setAdjusting] = useState(null);

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const params = { page: filters.page, limit: 10 };
      if (filters.q) params.q = filters.q;
      if (filters.categoryId) params.categoryId = filters.categoryId;

      const { data } = await getProducts(params);
      setProducts(data.data);
      setMeta({ page: data.page, totalPages: data.totalPages, total: data.total });
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err) });
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getCategories()
      .then((r) => setCategories(r.data.data))
      .catch(() => setCategories([]));
  }, []);

  // debounce การค้นหา เพื่อไม่ยิง API ทุกตัวอักษร
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: search, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const hasFilter = filters.q !== '' || filters.categoryId !== '';

  return (
    <div data-page="product-list">
      <div className="page-head">
        <div className="page-head__text">
          <h1>รายการสินค้า</h1>
          <p>
            ทั้งหมด <strong>{meta.total}</strong> รายการ — คลิกชื่อสินค้าเพื่อดูประวัติการเคลื่อนไหว
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/products/new" className="btn btn--primary">
            ➕ เพิ่มสินค้า
          </Link>
        </div>
      </div>

      <section className="card">
        <div className="card__head">
          <div className="toolbar" style={{ width: '100%' }}>
            <div className="search">
              <span className="search__icon" aria-hidden="true">
                🔍
              </span>
              <input
                className="input"
                type="search"
                placeholder="ค้นหาจากชื่อสินค้า หรือ SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="ค้นหาสินค้า"
              />
            </div>

            <select
              className="select"
              style={{ width: 'auto', minWidth: 180 }}
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, page: 1 }))}
              aria-label="กรองตามหมวดหมู่"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {hasFilter && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setSearch('');
                  setFilters({ q: '', categoryId: '', page: 1 });
                }}
              >
                ✕ ล้างตัวกรอง
              </button>
            )}

            <button type="button" className="btn" onClick={load} disabled={state.loading}>
              ↻ รีเฟรช
            </button>
          </div>
        </div>

        {state.error ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : (
          <>
            <ProductTable
              products={products}
              loading={state.loading}
              onAdjust={setAdjusting}
              emptyState={
                hasFilter ? (
                  <EmptyState
                    icon="🔍"
                    title="ไม่พบสินค้าที่ตรงกับเงื่อนไข"
                    text="ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองดู"
                    action={
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setSearch('');
                          setFilters({ q: '', categoryId: '', page: 1 });
                        }}
                      >
                        ล้างตัวกรอง
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon="📦"
                    title="ยังไม่มีสินค้าในระบบ"
                    text="เริ่มต้นด้วยการเพิ่มสินค้ารายการแรกของคุณ"
                    action={
                      <Link to="/products/new" className="btn btn--primary">
                        ➕ เพิ่มสินค้า
                      </Link>
                    }
                  />
                )
              }
            />

            {meta.totalPages > 1 && (
              <div className="pagination">
                <span>
                  หน้า {meta.page} จาก {meta.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={meta.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  ← ก่อนหน้า
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  ถัดไป →
                </button>
              </div>
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
