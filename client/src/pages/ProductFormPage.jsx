import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProduct, getCategories, getErrorMessage } from '../api/inventoryApi';
import { useToast } from '../components/Toast.jsx';
import { IconArrowLeft, IconTip, IconWarning } from '../components/icons.jsx';
import { Card, formatMoney } from '../components/ui.jsx';

const EMPTY = { name: '', sku: '', categoryId: '', costPrice: '', stockQuantity: '0' };

/** ฟอร์มเพิ่มสินค้า — validate ฝั่ง client ก่อน แล้วค่อยพึ่ง error จาก API เป็นด่านสุดท้าย */
export default function ProductFormPage({ onChanged }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    getCategories()
      .then((r) => setCategories(r.data.data))
      .catch(() => setCategories([]));
  }, []);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'กรุณากรอกชื่อสินค้า';
    if (!form.sku.trim()) e.sku = 'กรุณากรอก SKU';
    else if (!/^[A-Za-z0-9._-]+$/.test(form.sku.trim()))
      e.sku = 'SKU ใช้ได้เฉพาะ A-Z, 0-9, ขีดกลาง, จุด และ _';

    const price = Number(form.costPrice);
    if (form.costPrice === '' || Number.isNaN(price)) e.costPrice = 'กรุณากรอกราคาทุนเป็นตัวเลข';
    else if (price < 0) e.costPrice = 'ราคาทุนห้ามติดลบ';

    const stock = Number(form.stockQuantity);
    if (!Number.isInteger(stock)) e.stockQuantity = 'จำนวนต้องเป็นจำนวนเต็ม';
    else if (stock < 0) e.stockQuantity = 'จำนวนสต็อกห้ามติดลบ';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      toast.error('ข้อมูลยังไม่ครบถ้วน', 'กรุณาตรวจสอบช่องที่มีข้อความสีแดง');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        costPrice: Number(form.costPrice),
        stockQuantity: Number(form.stockQuantity),
      };
      if (form.categoryId) payload.categoryId = Number(form.categoryId);

      const { data } = await createProduct(payload);
      toast.success('เพิ่มสินค้าสำเร็จ', `${data.name} (${data.sku}) ถูกบันทึกแล้ว`);
      onChanged?.();
      navigate(`/products/${data.id}`);
    } catch (err) {
      const msg = getErrorMessage(err);
      if (err?.response?.status === 409) setErrors((p) => ({ ...p, sku: msg }));
      toast.error('บันทึกไม่สำเร็จ', msg);
    } finally {
      setSubmitting(false);
    }
  }

  const previewValue = Number(form.costPrice || 0) * Number(form.stockQuantity || 0);

  return (
    <div data-page="product-form">
      <div className="page-head">
        <div className="page-head__text">
          <h1>เพิ่มสินค้าใหม่</h1>
          <p>กรอกข้อมูลสินค้าเพื่อบันทึกเข้าคลัง — ช่องที่มี * จำเป็นต้องกรอก</p>
        </div>
        <div className="page-head__actions">
          <Link to="/products" className="btn">
            <IconArrowLeft size={16} /> กลับไปรายการสินค้า
          </Link>
        </div>
      </div>

      <div className="grid-2">
        <Card title="ข้อมูลสินค้า">
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="name">
                ชื่อสินค้า<span className="req">*</span>
              </label>
              <input
                id="name"
                className="input"
                placeholder="เช่น Notebook Acer Aspire A14"
                value={form.name}
                onChange={set('name')}
                aria-invalid={!!errors.name}
                autoFocus
              />
              {errors.name && <span className="field__error"><IconWarning size={14} /> {errors.name}</span>}
            </div>

            <div className="form-grid">
              <div className="field">
                <label className="field__label" htmlFor="sku">
                  SKU (รหัสสินค้า)<span className="req">*</span>
                </label>
                <input
                  id="sku"
                  className="input input--mono"
                  placeholder="ACER-A14-001"
                  value={form.sku}
                  onChange={set('sku')}
                  aria-invalid={!!errors.sku}
                />
                {errors.sku ? (
                  <span className="field__error"><IconWarning size={14} /> {errors.sku}</span>
                ) : (
                  <span className="field__hint">ต้องไม่ซ้ำกับสินค้าอื่นในระบบ</span>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="categoryId">
                  หมวดหมู่
                </label>
                <select id="categoryId" className="select" value={form.categoryId} onChange={set('categoryId')}>
                  <option value="">— ไม่ระบุ —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="field__hint">
                  ยังไม่มีหมวดหมู่ที่ต้องการ? <Link to="/categories">เพิ่มหมวดหมู่</Link>
                </span>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="costPrice">
                  ราคาทุนต่อชิ้น (บาท)<span className="req">*</span>
                </label>
                <input
                  id="costPrice"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="15900"
                  value={form.costPrice}
                  onChange={set('costPrice')}
                  aria-invalid={!!errors.costPrice}
                />
                {errors.costPrice && <span className="field__error"><IconWarning size={14} /> {errors.costPrice}</span>}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="stockQuantity">
                  จำนวนสต็อกตั้งต้น
                </label>
                <input
                  id="stockQuantity"
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.stockQuantity}
                  onChange={set('stockQuantity')}
                  aria-invalid={!!errors.stockQuantity}
                />
                {errors.stockQuantity ? (
                  <span className="field__error"><IconWarning size={14} /> {errors.stockQuantity}</span>
                ) : (
                  <span className="field__hint">ถ้ามากกว่า 0 ระบบจะบันทึกเป็นรายการรับเข้า (IN) ให้อัตโนมัติ</span>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting && <span className="spinner" aria-hidden="true" />} บันทึกสินค้า
              </button>
              <button type="button" className="btn" onClick={() => setForm(EMPTY)} disabled={submitting}>
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        </Card>

        <Card title="ตัวอย่างข้อมูลที่จะบันทึก">
          <div className="col gap-lg">
            <div>
              <div className="subtle">ชื่อสินค้า</div>
              <div className="cell-title">{form.name || '— ยังไม่ได้กรอก —'}</div>
            </div>
            <div>
              <div className="subtle">SKU</div>
              <span className="sku">{form.sku ? form.sku.toUpperCase() : 'SKU-XXXX'}</span>
            </div>
            <div>
              <div className="subtle">มูลค่าสต็อกตั้งต้น</div>
              <div className="stat__value">{formatMoney(previewValue)}</div>
              <div className="subtle">
                {formatMoney(Number(form.costPrice || 0))} × {form.stockQuantity || 0} ชิ้น
              </div>
            </div>
            <div className="alert alert--info" style={{ marginBottom: 0 }}>
              <IconTip size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
              <div>SKU ซ้ำจะถูกปฏิเสธจากเซิร์ฟเวอร์ (HTTP 409) เพื่อกันสินค้าซ้ำในระบบ</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
