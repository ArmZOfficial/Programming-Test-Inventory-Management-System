import { useEffect, useState } from 'react';

/**
 * แถบแบ่งหน้า — กดเลือกเลขหน้าได้โดยตรง
 * ถ้ามีหลายหน้าจะย่อด้วย … และมีช่อง "ไปหน้า" ให้พิมพ์เลขกระโดดไปได้เลย
 *
 * แสดงเสมอ: หน้าแรก, หน้าสุดท้าย, หน้าปัจจุบัน และหน้าข้างเคียง (siblings)
 */
function buildPages(current, total, siblings = 1) {
  const maxSlots = siblings * 2 + 5; // แรก + สุดท้าย + ปัจจุบัน + ข้างเคียง + … 2 ตัว
  if (total <= maxSlots) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeftDots = left > 2;
  const showRightDots = right < total - 1;

  const pages = [1];
  if (showLeftDots) pages.push('…');
  for (let p = showLeftDots ? left : 2; p <= (showRightDots ? right : total - 1); p++) pages.push(p);
  if (showRightDots) pages.push('…');
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, total, showing, onChange }) {
  const [jump, setJump] = useState('');

  useEffect(() => setJump(''), [page]);

  if (totalPages <= 1) return null;

  const go = (p) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== page) onChange(next);
  };

  const handleJump = (e) => {
    e.preventDefault();
    const n = Number(jump);
    if (Number.isInteger(n) && n >= 1 && n <= totalPages) go(n);
  };

  return (
    <nav className="pagination" aria-label="แบ่งหน้า" data-role="pagination">
      <span className="pagination__info">
        หน้า {page} จาก {totalPages}
        {total !== undefined && ` · แสดง ${showing ?? 0} จาก ${total.toLocaleString('th-TH')} รายการ`}
      </span>

      <div className="pager">
        <button
          type="button"
          className="btn btn--sm"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label="หน้าก่อนหน้า"
        >
          ←
        </button>

        {buildPages(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`dots-${i}`} className="pager__dots" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`btn btn--sm pager__page${p === page ? ' btn--primary' : ''}`}
              onClick={() => go(p)}
              aria-label={`ไปหน้า ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="btn btn--sm"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          aria-label="หน้าถัดไป"
        >
          →
        </button>
      </div>

      {totalPages > 5 && (
        <form className="pager__jump" onSubmit={handleJump}>
          <label htmlFor="jump-page">ไปหน้า</label>
          <input
            id="jump-page"
            className="input"
            type="number"
            min="1"
            max={totalPages}
            inputMode="numeric"
            placeholder={String(page)}
            value={jump}
            onChange={(e) => setJump(e.target.value)}
          />
          <button type="submit" className="btn btn--sm" disabled={jump === ''}>
            ไป
          </button>
        </form>
      )}
    </nav>
  );
}
