import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, getTransactions } from '../api/inventoryApi';
import Pagination from '../components/Pagination.jsx';
import { Card, EmptyState, ErrorState, formatDateTime, formatNumber } from '../components/ui.jsx';

/** ประวัติการเคลื่อนไหวสต็อกทั้งระบบ — กรองด้วยประเภท IN / OUT */
const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [state, setState] = useState({ loading: true, error: null });

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const params = { page, limit: PAGE_SIZE };
      if (type) params.type = type;

      const { data } = await getTransactions(params);
      setItems(data.data);
      setMeta({ page: data.page, totalPages: data.totalPages, total: data.total });
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err) });
    }
  }, [type, page]);

  useEffect(() => {
    load();
  }, [load]);

  /** เปลี่ยนตัวกรองแล้วต้องกลับไปหน้าแรกเสมอ ไม่งั้นอาจค้างอยู่หน้าที่ไม่มีข้อมูล */
  const changeType = (value) => {
    setType(value);
    setPage(1);
  };

  const filters = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'IN', label: '⬇ รับเข้า' },
    { value: 'OUT', label: '⬆ จ่ายออก' },
  ];

  return (
    <div data-page="transactions">
      <div className="page-head">
        <div className="page-head__text">
          <h1>ประวัติการเคลื่อนไหวสต็อก</h1>
          <p>ทุกการรับเข้า/จ่ายออกถูกบันทึกไว้ทั้งหมด ตรวจสอบย้อนหลังได้เสมอ</p>
        </div>
      </div>

      <Card
        title={`พบ ${formatNumber(meta.total)} รายการ`}
        actions={
          <div className="btn-group">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`btn btn--sm${type === f.value ? ' btn--primary' : ''}`}
                onClick={() => changeType(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
        bodyless
      >
        {state.error ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : state.loading ? (
          <div className="card__body col gap-lg">
            {[0, 1, 2, 3].map((i) => (
              <div className="skeleton" key={i} style={{ width: `${80 - i * 8}%` }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="🕘" title="ยังไม่มีประวัติการเคลื่อนไหว" text="เริ่มต้นด้วยการปรับสต็อกสินค้าสักรายการ" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">วันที่-เวลา</th>
                  <th scope="col">สินค้า</th>
                  <th scope="col">ประเภท</th>
                  <th scope="col" className="num">
                    จำนวน
                  </th>
                  <th scope="col">เหตุผล</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td className="nowrap subtle">{formatDateTime(t.createdAt)}</td>
                    <td>
                      <Link to={`/products/${t.productId}`} className="cell-title" style={{ color: 'var(--brand-600)' }}>
                        {t.product?.name || `สินค้า #${t.productId}`}
                      </Link>
                      <div className="cell-sub">{t.product?.sku}</div>
                    </td>
                    <td>
                      <span className={`badge badge--${t.type === 'IN' ? 'ok' : 'danger'}`}>
                        {t.type === 'IN' ? '⬇ รับเข้า' : '⬆ จ่ายออก'}
                      </span>
                    </td>
                    <td className="num">
                      <strong style={{ color: t.type === 'IN' ? 'var(--ok-fg)' : 'var(--danger-fg)' }}>
                        {t.type === 'IN' ? '+' : '−'}
                        {formatNumber(t.quantity)}
                      </strong>
                    </td>
                    <td>{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!state.error && !state.loading && (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            showing={items.length}
            onChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
