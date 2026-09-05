import { Link } from 'react-router-dom';
import { EmptyState, StockBadge, StockMeter, TableSkeleton, formatMoney, formatNumber } from './ui.jsx';

/**
 * ตารางสินค้า — ใช้ซ้ำได้ทั้งหน้า "รายการสินค้า" และ "สินค้าใกล้หมด"
 */
export default function ProductTable({ products, loading, threshold, onAdjust, emptyState }) {
  return (
    <div className="table-wrap">
      <table className="table" data-role="product-table">
        <caption className="sr-only">ตารางรายการสินค้าคงคลัง</caption>
        <thead>
          <tr>
            <th scope="col">SKU</th>
            <th scope="col">ชื่อสินค้า</th>
            <th scope="col">หมวดหมู่</th>
            <th scope="col" className="num">
              ต้นทุน/ชิ้น
            </th>
            <th scope="col" className="num">
              คงเหลือ
            </th>
            <th scope="col">สถานะ</th>
            <th scope="col" className="actions">
              จัดการ
            </th>
          </tr>
        </thead>

        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="sku">{p.sku}</span>
                </td>
                <td>
                  <Link to={`/products/${p.id}`} className="cell-title" style={{ color: 'var(--brand-600)' }}>
                    {p.name}
                  </Link>
                </td>
                <td>
                  {p.category ? (
                    <span className="badge badge--muted">{p.category.name}</span>
                  ) : (
                    <span className="subtle">— ไม่ระบุ —</span>
                  )}
                </td>
                <td className="num">{formatMoney(p.costPrice)}</td>
                <td className="num">
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <strong>{formatNumber(p.stockQuantity)}</strong>
                    <StockMeter qty={p.stockQuantity} />
                  </div>
                </td>
                <td>
                  <StockBadge qty={p.stockQuantity} threshold={threshold} />
                </td>
                <td className="actions">
                  <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn--sm btn--primary" onClick={() => onAdjust(p)}>
                      ปรับสต็อก
                    </button>
                    <Link to={`/products/${p.id}`} className="btn btn--sm">
                      ดูประวัติ
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>

      {!loading && products.length === 0 && (emptyState || <EmptyState title="ยังไม่มีข้อมูลสินค้า" />)}
    </div>
  );
}
