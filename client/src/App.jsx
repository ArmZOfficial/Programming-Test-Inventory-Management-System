import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getHealth, getLowStock } from './api/inventoryApi';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductListPage from './pages/ProductListPage.jsx';
import ProductFormPage from './pages/ProductFormPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import LowStockPage from './pages/LowStockPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';

const NAV = [
  { to: '/dashboard', label: 'ภาพรวม', icon: '📊' },
  { to: '/products', label: 'รายการสินค้า', icon: '📦' },
  { to: '/products/new', label: 'เพิ่มสินค้า', icon: '➕' },
  { to: '/low-stock', label: 'สินค้าใกล้หมด', icon: '🔔', badge: 'lowStock' },
  { to: '/transactions', label: 'ประวัติสต็อก', icon: '🕘' },
  { to: '/categories', label: 'หมวดหมู่', icon: '🏷️' },
];

const TITLES = {
  '/dashboard': 'ภาพรวมคลังสินค้า',
  '/products': 'รายการสินค้า',
  '/products/new': 'เพิ่มสินค้าใหม่',
  '/low-stock': 'สินค้าใกล้หมด',
  '/transactions': 'ประวัติการเคลื่อนไหวสต็อก',
  '/categories': 'หมวดหมู่สินค้า',
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('inv-theme') || 'light');
  const [apiUp, setApiUp] = useState(null);
  const [lowCount, setLowCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('inv-theme', theme);
  }, [theme]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  /** เช็คสถานะ API + จำนวนสินค้าใกล้หมด (ใช้โชว์ badge บนเมนู) */
  const refreshStatus = useCallback(async () => {
    try {
      await getHealth();
      setApiUp(true);
      const { data } = await getLowStock(5);
      setLowCount(data.count ?? 0);
    } catch {
      setApiUp(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus, location.pathname]);

  const title = TITLES[location.pathname] || 'ระบบจัดการสินค้าคงคลัง';

  return (
    <div className="app">
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar${menuOpen ? ' is-open' : ''}`} data-role="sidebar">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            📦
          </div>
          <div className="col">
            <span className="brand__name">สินค้าคงคลัง</span>
            <span className="brand__sub">Inventory</span>
          </div>
        </div>

        <nav className="nav" aria-label="เมนูหลัก">
          <span className="nav__label">เมนู</span>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/products'}
              className={({ isActive }) => `nav__item${isActive ? ' is-active' : ''}`}
            >
              <span className="nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
              {item.badge === 'lowStock' && lowCount > 0 && <span className="nav__count">{lowCount}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="api-status" data-role="api-status">
            <span
              className={`dot${apiUp === true ? ' dot--ok' : apiUp === false ? ' dot--down' : ''}`}
              aria-hidden="true"
            />
            {apiUp === null ? 'กำลังเชื่อมต่อ API…' : apiUp ? 'API พร้อมใช้งาน' : 'เชื่อมต่อ API ไม่ได้'}
          </div>
          <span>v1.0.0 · Express + Prisma</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="btn btn--ghost btn--icon menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="เปิด/ปิดเมนู"
          >
            ☰
          </button>
          <span className="topbar__title">{title}</span>
          <div className="topbar__spacer" />
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}
            title={theme === 'dark' ? 'ธีมสว่าง' : 'ธีมมืด'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>

        <main className="content">
          {apiUp === false && (
            <div className="alert alert--danger" role="alert">
              <span aria-hidden="true">🔌</span>
              <div>
                <strong>เชื่อมต่อ API ไม่ได้</strong>
                <div>
                  เปิด terminal แล้วรัน <code>cd server &amp;&amp; npm run dev</code> เพื่อเริ่ม backend ที่
                  http://localhost:4000
                </div>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage onChanged={refreshStatus} />} />
            <Route path="/products" element={<ProductListPage onChanged={refreshStatus} />} />
            <Route path="/products/new" element={<ProductFormPage onChanged={refreshStatus} />} />
            <Route path="/products/:id" element={<ProductDetailPage onChanged={refreshStatus} />} />
            <Route path="/low-stock" element={<LowStockPage onChanged={refreshStatus} />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route
              path="*"
              element={
                <div className="state">
                  <div className="state__icon">🧭</div>
                  <p className="state__title">ไม่พบหน้าที่ต้องการ</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
