import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  getErrorMessage,
  updateCategory,
} from '../api/inventoryApi';
import { useToast } from '../components/Toast.jsx';
import {
  IconClose,
  IconPackage,
  IconPlus,
  IconRefresh,
  IconTag,
  IconWarning,
} from '../components/icons.jsx';
import { Card, EmptyState, ErrorState, StockBadge, formatMoney, formatNumber } from '../components/ui.jsx';

const EMPTY_FORM = { name: '', description: '' };

/**
 * จัดการหมวดหมู่สินค้าแบบครบวงจร (CRUD)
 *   Create — ฟอร์มด้านขวา
 *   Read   — ตารางรายการ + คลิกดูรายละเอียดพร้อมสินค้าในหมวด
 *   Update — กดแก้ไข ฟอร์มด้านขวาจะสลับเป็นโหมดแก้ไข
 *   Delete — มีหน้าต่างยืนยัน และเตือนเมื่อหมวดหมู่ยังมีสินค้าอยู่
 */
export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
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

  /* ------------------------------ Read ------------------------------ */
  async function openDetail(id) {
    setDetailLoading(true);
    try {
      const { data } = await getCategory(id);
      setDetail(data);
    } catch (err) {
      toast.error('เปิดรายละเอียดไม่สำเร็จ', getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  /* -------------------------- Create / Update ----------------------- */
  function startEdit(cat) {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('กรอกชื่อหมวดหมู่ก่อน');
      return;
    }

    setSubmitting(true);
    const payload = { name: form.name.trim(), description: form.description.trim() || null };
    try {
      if (editingId) {
        await updateCategory(editingId, payload);
        toast.success('แก้ไขหมวดหมู่สำเร็จ', payload.name);
        if (detail?.id === editingId) openDetail(editingId);
      } else {
        await createCategory(payload);
        toast.success('เพิ่มหมวดหมู่สำเร็จ', payload.name);
      }
      cancelEdit();
      load();
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------ Delete ---------------------------- */
  async function handleDelete(force) {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { data } = await deleteCategory(confirmDelete.id, force);
      toast.success(
        'ลบหมวดหมู่เรียบร้อย',
        data.detachedProducts > 0
          ? `สินค้า ${data.detachedProducts} รายการถูกย้ายไปเป็น "ไม่ระบุหมวดหมู่"`
          : confirmDelete.name
      );
      if (detail?.id === confirmDelete.id) setDetail(null);
      if (editingId === confirmDelete.id) cancelEdit();
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error('ลบไม่สำเร็จ', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const productCount = confirmDelete?._count?.products ?? 0;

  return (
    <div data-page="categories">
      <div className="page-head">
        <div className="page-head__text">
          <h1>หมวดหมู่สินค้า</h1>
          <p>เพิ่ม แก้ไข ลบ และดูรายละเอียดหมวดหมู่ พร้อมรายการสินค้าที่อยู่ในแต่ละหมวด</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn" onClick={load} disabled={state.loading}>
            <IconRefresh size={15} /> รีเฟรช
          </button>
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
            <EmptyState icon={IconTag} title="ยังไม่มีหมวดหมู่" text="เพิ่มหมวดหมู่แรกจากฟอร์มด้านขวา" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">ชื่อหมวดหมู่</th>
                    <th scope="col">คำอธิบาย</th>
                    <th scope="col" className="num">
                      สินค้า
                    </th>
                    <th scope="col" className="actions">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className={editingId === c.id ? 'is-editing' : undefined}>
                      <td>
                        <button
                          type="button"
                          className="link-btn cell-title"
                          onClick={() => openDetail(c.id)}
                          title="ดูรายละเอียด"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="muted">{c.description || '—'}</td>
                      <td className="num">
                        <span className="badge badge--info">{formatNumber(c._count?.products ?? 0)}</span>
                      </td>
                      <td className="actions">
                        <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn--sm" onClick={() => openDetail(c.id)}>
                            รายละเอียด
                          </button>
                          <button type="button" className="btn btn--sm" onClick={() => startEdit(c)}>
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--danger-outline"
                            onClick={() => setConfirmDelete(c)}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={editingId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}>
          <form onSubmit={handleSubmit}>
            {editingId && (
              <div className="alert alert--info">
                <IconWarning size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
                <div>
                  กำลังแก้ไขหมวดหมู่ <strong>{items.find((c) => c.id === editingId)?.name}</strong>
                </div>
              </div>
            )}

            <div className="field">
              <label className="field__label" htmlFor="cat-name">
                ชื่อหมวดหมู่<span className="req">*</span>
              </label>
              <input
                id="cat-name"
                className="input"
                placeholder="เช่น IT, Office Supply, Furniture"
                value={form.name}
                maxLength={100}
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
                {submitting ? <span className="spinner" aria-hidden="true" /> : <IconPlus size={16} />}
                {editingId ? 'บันทึกการแก้ไข' : 'บันทึกหมวดหมู่'}
              </button>
              {editingId && (
                <button type="button" className="btn" onClick={cancelEdit} disabled={submitting}>
                  ยกเลิก
                </button>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* ---------------- รายละเอียดหมวดหมู่ + สินค้าในหมวด ---------------- */}
      {(detail || detailLoading) && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}
          data-role="category-detail-modal"
        >
          <div className="modal" role="dialog" aria-modal="true" style={{ width: 'min(680px, 100%)' }}>
            <header className="modal__head">
              <div>
                <h2 className="modal__title">{detailLoading ? 'กำลังโหลด…' : detail?.name}</h2>
                <p className="modal__sub">{detail?.description || 'ไม่มีคำอธิบาย'}</p>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => setDetail(null)}
                aria-label="ปิด"
                style={{ marginLeft: 'auto' }}
              >
                <IconClose size={16} />
              </button>
            </header>

            <div className="modal__body">
              {detailLoading || !detail ? (
                <div className="col gap-lg">
                  <div className="skeleton" style={{ width: '60%' }} />
                  <div className="skeleton" style={{ width: '80%' }} />
                </div>
              ) : detail.products.length === 0 ? (
                <EmptyState
                  icon={IconPackage}
                  title="ยังไม่มีสินค้าในหมวดหมู่นี้"
                  text="เพิ่มสินค้าแล้วเลือกหมวดหมู่นี้ได้จากหน้าเพิ่มสินค้า"
                  action={
                    <Link to="/products/new" className="btn btn--primary">
                      <IconPlus size={16} /> เพิ่มสินค้า
                    </Link>
                  }
                />
              ) : (
                <>
                  <p className="muted" style={{ marginTop: 0 }}>
                    มีสินค้าทั้งหมด <strong>{formatNumber(detail._count.products)}</strong> รายการ
                  </p>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th scope="col">SKU</th>
                          <th scope="col">ชื่อสินค้า</th>
                          <th scope="col" className="num">
                            ต้นทุน
                          </th>
                          <th scope="col" className="num">
                            คงเหลือ
                          </th>
                          <th scope="col">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.products.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <span className="sku">{p.sku}</span>
                            </td>
                            <td>
                              <Link
                                to={`/products/${p.id}`}
                                className="cell-title"
                                style={{ color: 'var(--brand-600)' }}
                                onClick={() => setDetail(null)}
                              >
                                {p.name}
                              </Link>
                            </td>
                            <td className="num">{formatMoney(p.costPrice)}</td>
                            <td className="num">{formatNumber(p.stockQuantity)}</td>
                            <td>
                              <StockBadge qty={p.stockQuantity} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <footer className="modal__foot">
              <button type="button" className="btn" onClick={() => setDetail(null)}>
                ปิด
              </button>
              {detail && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    startEdit(detail);
                    setDetail(null);
                  }}
                >
                  แก้ไขหมวดหมู่นี้
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* ---------------------- ยืนยันการลบ ---------------------- */}
      {confirmDelete && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
          data-role="category-delete-modal"
        >
          <div className="modal" role="alertdialog" aria-modal="true" style={{ width: 'min(460px, 100%)' }}>
            <header className="modal__head">
              <div>
                <h2 className="modal__title">ยืนยันการลบหมวดหมู่</h2>
                <p className="modal__sub">{confirmDelete.name}</p>
              </div>
            </header>

            <div className="modal__body">
              {productCount > 0 ? (
                <div className="alert alert--warn" style={{ marginBottom: 0 }}>
                  <IconWarning size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
                  <div>
                    หมวดหมู่นี้มีสินค้าอยู่ <strong>{formatNumber(productCount)}</strong> รายการ
                    <br />
                    ถ้ายืนยันลบ สินค้าจะ<strong>ไม่ถูกลบ</strong> แต่จะย้ายไปเป็น &quot;ไม่ระบุหมวดหมู่&quot;
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  หมวดหมู่นี้ยังไม่มีสินค้า สามารถลบได้ทันที — การลบไม่สามารถย้อนกลับได้
                </p>
              )}
            </div>

            <footer className="modal__foot">
              <button type="button" className="btn" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => handleDelete(productCount > 0)}
                disabled={deleting}
              >
                {deleting && <span className="spinner" aria-hidden="true" />}
                {productCount > 0 ? 'ยืนยันลบและย้ายสินค้าออก' : 'ยืนยันลบ'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
