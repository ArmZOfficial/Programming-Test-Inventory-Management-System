import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createCategory, getCategories, getErrorMessage } from '../api/inventoryApi';
import { useToast } from '../components/Toast.jsx';
import { Card, EmptyState, ErrorState, formatNumber } from '../components/ui.jsx';

/** จัดการหมวดหมู่สินค้า — ฟอร์มเพิ่มอยู่คู่กับรายการ เห็นผลทันทีหลังบันทึก */
export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const { data } = await getCategories();
      setItems(data.data);
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('กรอกชื่อหมวดหมู่ก่อน');
      return;
    }
    setSubmitting(true);
    try {
      await createCategory({ name: form.name.trim(), description: form.description.trim() || null });
      toast.success('เพิ่มหมวดหมู่สำเร็จ', form.name.trim());
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div data-page="categories">
      <div className="page-head">
        <div className="page-head__text">
          <h1>หมวดหมู่สินค้า</h1>
          <p>จัดกลุ่มสินค้าเพื่อค้นหาและออกรายงานได้ง่ายขึ้น</p>
        </div>
      </div>

      <div className="grid-2">
        <Card title={`หมวดหมู่ทั้งหมด (${items.length})`} bodyless>
          {state.error ? (
            <ErrorState message={state.error} onRetry={load} />
          ) : state.loading ? (
            <div className="card__body col gap-lg">
              {[0, 1, 2].map((i) => (
                <div className="skeleton" key={i} style={{ width: `${70 - i * 10}%` }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon="🏷️" title="ยังไม่มีหมวดหมู่" text="เพิ่มหมวดหมู่แรกจากฟอร์มด้านขวา" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">ชื่อหมวดหมู่</th>
                    <th scope="col">คำอธิบาย</th>
                    <th scope="col" className="num">
                      จำนวนสินค้า
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-title">{c.name}</td>
                      <td className="muted">{c.description || '—'}</td>
                      <td className="num">
                        <Link to={`/products?categoryId=${c.id}`} className="badge badge--info">
                          {formatNumber(c._count?.products ?? 0)} รายการ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="เพิ่มหมวดหมู่ใหม่">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field__label" htmlFor="cat-name">
                ชื่อหมวดหมู่<span className="req">*</span>
              </label>
              <input
                id="cat-name"
                className="input"
                placeholder="เช่น IT, Office Supply, Furniture"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <span className="field__hint">ชื่อหมวดหมู่ต้องไม่ซ้ำกัน</span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="cat-desc">
                คำอธิบาย
              </label>
              <textarea
                id="cat-desc"
                className="textarea"
                rows={3}
                placeholder="อธิบายสั้นๆ ว่าหมวดหมู่นี้ใช้เก็บสินค้าประเภทไหน"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting && <span className="spinner" aria-hidden="true" />} บันทึกหมวดหมู่
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
