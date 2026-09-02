import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CartProvider, useCart } from './CartContext';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Package,
  Layers,
  Clock,
  ArrowRight,
  X,
  Sparkles,
  SlidersHorizontal,
  Eye,
  Star,
  Lock,
  Truck,
  Check,
  Archive,
  Activity,
  FolderPlus,
  PlusCircle,
  LogOut,
  Edit2,
  Boxes,
  Save,
  AlertTriangle,
  Zap
} from 'lucide-react';

const API_BASE = 'https://shopcore-backend-aapu.onrender.com/api/';
const syncChannel = typeof window !== 'undefined' && window.BroadcastChannel ? new BroadcastChannel('shopcore_sync') : null;

const STATUS_STAGES = ['Ordered', 'Preparing Shipment', 'Out for Delivery', 'Delivered'];

// Ensures images load securely over HTTPS to avoid Vercel mixed-content blocking
function formatImageUrl(url) {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  if (url.startsWith('/')) {
    return `https://shopcore-backend-aapu.onrender.com${url}`;
  }
  return url;
}

function getStatusBadgeColor(status) {
  switch (status) {
    case 'Ordered':
      return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    case 'Preparing Shipment':
      return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    case 'Out for Delivery':
      return { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' };
    case 'Delivered':
      return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    case 'Cancelled':
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    default:
      return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  }
}

function getStockBadge(stock) {
  if (stock === 0) {
    return (
      <span style={{ padding: '4px 10px', borderRadius: '20px', background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #fca5a5' }}>
        Out of Stock (0)
      </span>
    );
  }
  if (stock < 5) {
    return (
      <span style={{ padding: '4px 10px', borderRadius: '20px', background: '#ffedd5', color: '#c2410c', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #fdba74', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <AlertTriangle size={12} /> Critical Stock ({stock})
      </span>
    );
  }
  if (stock <= 10) {
    return (
      <span style={{ padding: '4px 10px', borderRadius: '20px', background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #fde68a' }}>
        Low Stock ({stock})
      </span>
    );
  }
  return (
    <span style={{ padding: '4px 10px', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #86efac' }}>
      In Stock ({stock})
    </span>
  );
}

function getStockNumberColor(stock) {
  if (stock === 0) return '#dc2626';
  if (stock < 5) return '#ea580c';
  if (stock <= 10) return '#d97706';
  return '#059669';
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */
function AdminDashboard({ onLogout, showToast }) {
  const [activeNavTab, setActiveNavTab] = useState('inventory');
  const [adminOrders, setAdminOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');

  // Editing Product Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [editImageUrl, setEditImageUrl] = useState('');

  // New Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');

  // New Product Form State
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImage, setProdImage] = useState(null);
  const [prodImageUrl, setProdImageUrl] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}orders/admin/orders/`, { headers: getAuthHeaders() });
      setAdminOrders(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (err) {
      if (err.response?.status === 401) {
        onLogout();
      }
    }
  }, [onLogout]);

  const fetchCategories = useCallback(async () => {
    try {
      let res;
      try {
        res = await axios.get(`${API_BASE}products/categories/`);
      } catch {
        res = await axios.get(`${API_BASE}categories/`);
      }
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setCategories(data);
      if (data.length > 0 && !prodCategory) {
        setProdCategory(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [prodCategory]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}products/`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setProducts(list);
    } catch (err) {
      console.error('Error fetching inventory products:', err);
    }
  }, []);

  const refreshDashboardData = useCallback(async () => {
    await Promise.allSettled([fetchOrders(), fetchProducts(), fetchCategories()]);
  }, [fetchOrders, fetchProducts, fetchCategories]);

  useEffect(() => {
    refreshDashboardData();

    const interval = setInterval(() => {
      fetchOrders();
      fetchProducts();
    }, 5000);

    const handleBroadcast = (event) => {
      if (event.data?.type === 'ORDER_PLACED' || event.data?.type === 'CATALOG_UPDATED') {
        fetchOrders();
        fetchProducts();
        showToast('Live Update: Data refreshed.');
      }
    };

    if (syncChannel) {
      syncChannel.onmessage = handleBroadcast;
    }

    const handleFocus = () => {
      fetchOrders();
      fetchProducts();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (syncChannel) syncChannel.onmessage = null;
    };
  }, [fetchOrders, fetchProducts, refreshDashboardData, showToast]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API_BASE}orders/admin/orders/${orderId}/status/`, { status: newStatus }, { headers: getAuthHeaders() });
      setAdminOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      showToast(`Order #${orderId} status set to "${newStatus}"`);
      if (syncChannel) syncChannel.postMessage({ type: 'ORDER_STATUS_CHANGED' });
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const slug = newCatSlug || newCatName.toLowerCase().replace(/\s+/g, '-');
      let res;
      try {
        res = await axios.post(`${API_BASE}products/categories/`, { name: newCatName, slug }, { headers: getAuthHeaders() });
      } catch {
        res = await axios.post(`${API_BASE}categories/`, { name: newCatName, slug }, { headers: getAuthHeaders() });
      }
      setCategories([...categories, res.data]);
      setNewCatName('');
      setNewCatSlug('');
      showToast(`Category "${res.data.name}" created!`);
      if (syncChannel) syncChannel.postMessage({ type: 'CATALOG_UPDATED' });
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating category.');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('name', prodName);
    formData.append('price', prodPrice);
    formData.append('stock', prodStock || '0');
    formData.append('description', prodDescription);
    if (prodCategory) formData.append('category', prodCategory);
    if (prodImage) formData.append('image', prodImage);
    if (prodImageUrl) formData.append('image_url', prodImageUrl);

    try {
      const res = await axios.post(`${API_BASE}products/`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      showToast(`Product "${prodName}" published successfully!`);
      setProducts([res.data, ...products]);
      setProdName('');
      setProdPrice('');
      setProdStock('');
      setProdDescription('');
      setProdImage(null);
      setProdImageUrl('');
      setActiveNavTab('inventory');
      if (syncChannel) syncChannel.postMessage({ type: 'CATALOG_UPDATED' });
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating product.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(product.price);
    setEditStock(product.stock);
    setEditCategory(product.category || (categories[0]?.id ?? ''));
    setEditDescription(product.description || '');
    setEditImage(null);
    setEditImageUrl(product.image_url || '');
  };

  const handleSaveEditProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('name', editName);
    formData.append('price', editPrice);
    formData.append('stock', editStock);
    formData.append('description', editDescription);
    if (editCategory) formData.append('category', editCategory);
    if (editImage) formData.append('image', editImage);
    if (editImageUrl) formData.append('image_url', editImageUrl);

    try {
      const res = await axios.patch(`${API_BASE}products/${editingProduct.id}/`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? res.data : p));
      setEditingProduct(null);
      showToast(`"${editName}" updated successfully!`);
      if (syncChannel) syncChannel.postMessage({ type: 'CATALOG_UPDATED' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update product.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}" from the store catalog?`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}products/${productId}/`, { headers: getAuthHeaders() });
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast(`Product "${productName}" deleted.`);
      if (syncChannel) syncChannel.postMessage({ type: 'CATALOG_UPDATED' });
    } catch (err) {
      alert('Failed to delete product.');
    }
  };

  const activeOrders = adminOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const deliveredOrders = adminOrders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled');

  const filteredInventory = products.filter(p =>
    p.name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    (p.category_name && p.category_name.toLowerCase().includes(inventorySearch.toLowerCase())) ||
    (p.category?.name && p.category.name.toLowerCase().includes(inventorySearch.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0b1329', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#1e293b', padding: '8px', borderRadius: '8px' }}>
            <Truck color="#38bdf8" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>ShopCore Admin Console</h1>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.85rem' }}
        >
          <LogOut size={16} /> Log Out
        </button>
      </header>

      <div style={{ maxWidth: '1180px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveNavTab('inventory')}
            style={{
              background: activeNavTab === 'inventory' ? '#2563eb' : '#1e293b',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Boxes size={18} /> Goods Inventory ({products.length})
          </button>

          <button
            onClick={() => setActiveNavTab('active_orders')}
            style={{
              background: activeNavTab === 'active_orders' ? '#2563eb' : '#1e293b',
              color: activeNavTab === 'active_orders' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Activity size={18} color={activeNavTab === 'active_orders' ? '#fff' : '#38bdf8'} /> Active Orders ({activeOrders.length})
          </button>

          <button
            onClick={() => setActiveNavTab('order_history')}
            style={{
              background: activeNavTab === 'order_history' ? '#059669' : '#1e293b',
              color: activeNavTab === 'order_history' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Archive size={18} color={activeNavTab === 'order_history' ? '#fff' : '#34d399'} /> Order History ({deliveredOrders.length})
          </button>

          <button
            onClick={() => setActiveNavTab('products')}
            style={{
              background: activeNavTab === 'products' ? '#2563eb' : '#1e293b',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <PlusCircle size={18} /> Add Product
          </button>

          <button
            onClick={() => setActiveNavTab('categories')}
            style={{
              background: activeNavTab === 'categories' ? '#2563eb' : '#1e293b',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FolderPlus size={18} /> Add Category
          </button>
        </div>

        {activeNavTab === 'inventory' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', color: '#0f172a', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Boxes color="#2563eb" size={22} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>Goods Inventory Stock Tracker</h2>
              </div>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter stock by name or category..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Product</th>
                    <th style={{ padding: '14px 20px' }}>Category</th>
                    <th style={{ padding: '14px 20px' }}>Price</th>
                    <th style={{ padding: '14px 20px' }}>Stock Remaining</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No inventory items found.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                            {formatImageUrl(item.image || item.image_url) ? (
                              <img
                                src={formatImageUrl(item.image || item.image_url)}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = '📦';
                                }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <Package size={22} color="#94a3b8" />
                            )}
                          </div>
                          <div>
                            <strong style={{ display: 'block', color: '#0f172a' }}>{item.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: #{item.id}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', color: '#475569', fontWeight: '600' }}>
                          {item.category_name || item.category?.name || 'Unassigned'}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a' }}>
                          ${item.price}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: '800', fontSize: '1rem', color: getStockNumberColor(item.stock) }}>
                            {item.stock} units
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {getStockBadge(item.stock)}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              style={{ padding: '6px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#2563eb', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(item.id, item.name)}
                              style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeNavTab === 'active_orders' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', color: '#0f172a', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity color="#2563eb" size={22} /> Active In-Transit Orders ({activeOrders.length})
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Requires Processing / Shipping</span>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                  <Activity size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: '600' }}>No active customer orders requiring fulfillment.</p>
                </div>
              ) : (
                activeOrders.map((ord) => (
                  <div key={ord.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Order #{ord.id}</strong> — Customer: <span style={{ color: '#2563eb', fontWeight: '700' }}>{ord.customer_name || ord.full_name}</span>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '3px' }}>
                          Address: {ord.shipping_address || 'Standard Delivery'} | Total: <strong>${ord.total_amount}</strong>
                        </div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: getStatusBadgeColor(ord.status).bg, color: getStatusBadgeColor(ord.status).text, border: `1px solid ${getStatusBadgeColor(ord.status).border}` }}>
                        {ord.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', alignSelf: 'center', marginRight: '6px' }}>Change Status:</span>
                      {STATUS_STAGES.map((stg) => (
                        <button
                          key={stg}
                          onClick={() => handleUpdateOrderStatus(ord.id, stg)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: ord.status === stg ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            background: ord.status === stg ? '#eff6ff' : '#ffffff',
                            color: ord.status === stg ? '#2563eb' : '#334155',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {stg}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeNavTab === 'order_history' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', color: '#0f172a', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Archive color="#059669" size={22} /> Completed Order History ({deliveredOrders.length})
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Delivered / Archived Shipments</span>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {deliveredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                  <Archive size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: '600' }}>No completed order history records found.</p>
                </div>
              ) : (
                deliveredOrders.map((ord) => (
                  <div key={ord.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Order #{ord.id}</strong> — Customer: <span style={{ color: '#2563eb', fontWeight: '700' }}>{ord.customer_name || ord.full_name}</span>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '3px' }}>
                          Address: {ord.shipping_address || 'Standard Delivery'} | Total: <strong>${ord.total_amount}</strong>
                        </div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: getStatusBadgeColor(ord.status).bg, color: getStatusBadgeColor(ord.status).text, border: `1px solid ${getStatusBadgeColor(ord.status).border}` }}>
                        {ord.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', alignSelf: 'center', marginRight: '6px' }}>Change Status:</span>
                      {STATUS_STAGES.map((stg) => (
                        <button
                          key={stg}
                          onClick={() => handleUpdateOrderStatus(ord.id, stg)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: ord.status === stg ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            background: ord.status === stg ? '#eff6ff' : '#ffffff',
                            color: ord.status === stg ? '#2563eb' : '#334155',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {stg}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeNavTab === 'products' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', color: '#0f172a', padding: '28px', maxWidth: '640px', margin: '0 auto', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle color="#2563eb" size={22} /> Add New Catalog Product
            </h2>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Product Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Noise-Canceling Headphones"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="149.99"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Inventory Stock Quantity</label>
                <input
                  type="number"
                  required
                  placeholder="25"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Product Image File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProdImage(e.target.files[0])}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Direct Image URL (Optional Fallback)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea
                  rows="3"
                  placeholder="Enter detailed product specifications..."
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ marginTop: '8px', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                {loading ? 'Creating Product...' : 'Publish Product to Store'}
              </button>
            </form>
          </div>
        )}

        {activeNavTab === 'categories' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', color: '#0f172a', padding: '28px', maxWidth: '540px', margin: '0 auto', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderPlus color="#2563eb" size={22} /> Add New Category
            </h2>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Watches"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. smart-watches"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{ marginTop: '8px', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Create Category
              </button>
            </form>
          </div>
        )}
      </div>

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '28px', color: '#0f172a', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <button
              onClick={() => setEditingProduct(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 color="#2563eb" size={20} /> Edit Product #{editingProduct.id}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 18px' }}>
              Update stock quantities, pricing, or product descriptions.
            </p>

            <form onSubmit={handleSaveEditProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Product Title</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Replace Image File (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditImage(e.target.files[0])}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Direct Image URL (Optional Fallback)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows="3"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 2, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Save size={16} /> {loading ? 'Saving Changes...' : 'Save & Update Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   USER STOREFRONT
   ========================================================= */
function Storefront({ onLogout }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals & Panels
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [ordersTab, setOrdersTab] = useState('active');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Buy Now Modal State
  const [buyNowProduct, setBuyNowProduct] = useState(null);
  const [buyNowQty, setBuyNowQty] = useState(1);
  const [buyNowPromoCode, setBuyNowPromoCode] = useState('');
  const [buyNowDiscountPercent, setBuyNowDiscountPercent] = useState(0);
  const [buyNowShippingAddress, setBuyNowShippingAddress] = useState('');

  // Cart Promo Code
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('current_user') || null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('access_token') || null);

  // Orders State
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ordersHistory, setOrdersHistory] = useState([]);

  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalAmount, totalItemCount } = useCart();

  const loadData = useCallback(async () => {
    // 1. Fetch Products safely
    try {
      const prodUrl = search.trim()
        ? `${API_BASE}products/?search=${encodeURIComponent(search.trim())}`
        : `${API_BASE}products/`;
      const prodRes = await axios.get(prodUrl);
      const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.results || [];
      setProducts(prodList);

      // 2. Fetch Categories with Fallback
      try {
        let catRes;
        try {
          catRes = await axios.get(`${API_BASE}products/categories/`);
        } catch {
          catRes = await axios.get(`${API_BASE}categories/`);
        }
        const catList = Array.isArray(catRes.data) ? catRes.data : catRes.data?.results || [];
        if (catList.length > 0) {
          setCategories(catList);
        } else {
          // Derive categories directly from products if API endpoint has no records
          const derived = [...new Set(prodList.map(p => p.category_name).filter(Boolean))].map((cName, idx) => ({
            id: idx + 1,
            name: cName,
            slug: cName.toLowerCase().replace(/\s+/g, '-')
          }));
          setCategories(derived);
        }
      } catch {
        // Fallback: derive categories from products
        const derived = [...new Set(prodList.map(p => p.category_name).filter(Boolean))].map((cName, idx) => ({
          id: idx + 1,
          name: cName,
          slug: cName.toLowerCase().replace(/\s+/g, '-')
        }));
        setCategories(derived);
      }
    } catch (err) {
      console.error('Catalog load error:', err);
    }
  }, [search]);

  useEffect(() => {
    loadData();

    const handleBroadcast = (event) => {
      if (event.data?.type === 'ORDER_STATUS_CHANGED' || event.data?.type === 'CATALOG_UPDATED') {
        loadData();
      }
    };

    if (syncChannel) {
      syncChannel.onmessage = handleBroadcast;
    }

    return () => {
      if (syncChannel) syncChannel.onmessage = null;
    };
  }, [loadData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCartWithToast = (product) => {
    if (!authToken) {
      setAuthMode('signin');
      setIsAuthOpen(true);
      showToast('Please sign in to add items to your cart.');
      return;
    }
    addToCart(product);
    showToast(`Added "${product.name}" to bag!`);
  };

  const handleOpenBuyNow = (product) => {
    if (!authToken) {
      setAuthMode('signin');
      setIsAuthOpen(true);
      showToast('Please sign in to complete your purchase.');
      return;
    }
    setBuyNowProduct(product);
    setBuyNowQty(1);
    setBuyNowPromoCode('');
    setBuyNowDiscountPercent(0);
    setBuyNowShippingAddress('');
  };

  const handleApplyBuyNowPromo = (e) => {
    e.preventDefault();
    const code = buyNowPromoCode.trim().toUpperCase();
    if (code === 'SAVE10') {
      setBuyNowDiscountPercent(10);
      showToast('10% discount applied to your order!');
    } else if (code === 'VIP20') {
      setBuyNowDiscountPercent(20);
      showToast('20% VIP discount applied!');
    } else {
      alert('Invalid promo code. Use "SAVE10" or "VIP20"');
    }
  };

  const handleExecuteBuyNow = async (e) => {
    e.preventDefault();
    if (!authToken || !buyNowProduct) return;
    setLoading(true);

    const payload = {
      shipping_address: buyNowShippingAddress,
      items: [
        {
          product_id: buyNowProduct.id,
          quantity: buyNowQty,
        }
      ],
    };

    try {
      const res = await axios.post(`${API_BASE}orders/checkout/`, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setOrderSuccess(res.data);
      setBuyNowProduct(null);
      if (quickViewProduct) setQuickViewProduct(null);
      showToast(`Order #${res.data.id} placed directly!`);

      if (syncChannel) syncChannel.postMessage({ type: 'ORDER_PLACED' });

      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Direct purchase failed. Please check stock availability.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authMode === 'signup') {
      try {
        const res = await axios.post(`${API_BASE}orders/register/`, {
          username: username.trim(),
          password: password.trim(),
        });

        showToast('Account created successfully!');
        const token = res.data.access;
        const userIsAdmin = Boolean(res.data.is_staff);

        localStorage.setItem('access_token', token);
        localStorage.setItem('current_user', username.trim());
        localStorage.setItem('is_admin', userIsAdmin);

        setCurrentUser(username.trim());
        setAuthToken(token);
        setIsAuthOpen(false);
        window.location.reload();
      } catch (err) {
        alert(err.response?.data?.error || 'Registration failed. Check your input.');
      }
    } else {
      try {
        const res = await axios.post(`${API_BASE}token/`, {
          username: username.trim(),
          password: password.trim(),
        });

        const token = res.data.access;
        const userIsAdmin = username.trim() === 'admin';

        localStorage.setItem('access_token', token);
        localStorage.setItem('current_user', username.trim());
        localStorage.setItem('is_admin', userIsAdmin);

        setCurrentUser(username.trim());
        setAuthToken(token);
        setIsAuthOpen(false);
        window.location.reload();
      } catch (err) {
        alert('Invalid credentials. Check username and password.');
      }
    }
  };

  const handleOpenOrders = async () => {
    if (!authToken) {
      setAuthMode('signin');
      setIsAuthOpen(true);
      showToast('Please sign in to view your orders.');
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}orders/my-orders/`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setOrdersHistory(Array.isArray(res.data) ? res.data : res.data?.results || []);
      setIsHistoryOpen(true);
    } catch (err) {
      alert('Could not retrieve orders. Please log in again.');
      onLogout();
    }
  };

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'SAVE10') {
      setDiscountPercent(10);
      showToast('10% discount applied!');
    } else if (code === 'VIP20') {
      setDiscountPercent(20);
      showToast('20% VIP discount applied!');
    } else {
      alert('Invalid code. Try "SAVE10" or "VIP20"');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!authToken) {
      setIsAuthOpen(true);
      showToast('Sign in or register to complete your order.');
      return;
    }
    if (cart.length === 0) return;
    setLoading(true);

    const payload = {
      shipping_address: shippingAddress,
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    };

    try {
      const res = await axios.post(`${API_BASE}orders/checkout/`, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setOrderSuccess(res.data);
      clearCart();
      setIsCartOpen(false);
      setShippingAddress('');
      showToast('Order confirmed successfully!');

      if (syncChannel) syncChannel.postMessage({ type: 'ORDER_PLACED' });

      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Checkout failed. Please verify stock.');
    } finally {
      setLoading(false);
    }
  };

  const rawSubtotal = parseFloat(totalAmount) || 0;
  const discountAmount = rawSubtotal * (discountPercent / 100);
  const finalTotal = (rawSubtotal - discountAmount).toFixed(2);

  const buyNowRawSubtotal = buyNowProduct ? (parseFloat(buyNowProduct.price) || 0) * buyNowQty : 0;
  const buyNowDiscountAmount = buyNowRawSubtotal * (buyNowDiscountPercent / 100);
  const buyNowFinalTotal = (buyNowRawSubtotal - buyNowDiscountAmount).toFixed(2);

  // Normalization logic so categories match whether stored by string, slug, or object
  const filteredProducts = (Array.isArray(products) ? products : [])
    .filter(p => {
      if (selectedCategory === 'all') return true;
      const catSlug = p.category?.slug?.toLowerCase();
      const catName = (p.category_name || p.category?.name || '').toLowerCase();
      const target = selectedCategory.toLowerCase();
      return catSlug === target || catName === target;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
      return b.id - a.id;
    });

  const activeOrders = ordersHistory.filter(ord => ord.status !== 'Delivered' && ord.status !== 'Cancelled');
  const pastDeliveredOrders = ordersHistory.filter(ord => ord.status === 'Delivered' || ord.status === 'Cancelled');

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Top Banner */}
      <div style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.85rem', padding: '8px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Use promo code <strong>SAVE10</strong> for 10% off</span>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ cursor: 'pointer', color: '#e2e8f0' }} onClick={handleOpenOrders}>
            My Orders
          </span>

          {currentUser ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ color: '#38bdf8', fontWeight: '600' }}>Hi, {currentUser}</span>
              <span style={{ cursor: 'pointer', color: '#ef4444' }} onClick={onLogout}>Log Out</span>
            </div>
          ) : (
            <span style={{ cursor: 'pointer', color: '#38bdf8', fontWeight: 'bold' }} onClick={() => { setAuthMode('signin'); setIsAuthOpen(true); }}>
              Sign In / Register
            </span>
          )}
        </div>
      </div>

      {/* Navbar */}
      <nav style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '1.4rem', color: '#2563eb', cursor: 'pointer' }} onClick={() => setSelectedCategory('all')}>
          <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px' }}>
            <Package size={24} color="#2563eb" />
          </div>
          ShopCore
        </div>

        <div style={{ position: 'relative', width: '440px' }}>
          <Search size={18} style={{ position: 'absolute', top: '12px', left: '14px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search items, categories, descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', background: '#f8fafc' }}
          />
        </div>

        <button
          onClick={() => {
            if (!authToken) {
              setAuthMode('signin');
              setIsAuthOpen(true);
              showToast('Please sign in to view your bag.');
              return;
            }
            setIsCartOpen(true);
          }}
          style={{ position: 'relative', background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
        >
          <ShoppingBag size={18} />
          <span>Cart</span>
          {totalItemCount > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '2px 7px', borderRadius: '12px', fontWeight: 'bold' }}>
              {totalItemCount}
            </span>
          )}
        </button>
      </nav>

      {/* Main Catalog Grid */}
      <div style={{ maxWidth: '1280px', margin: '32px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '8px 18px',
                borderRadius: '24px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                background: selectedCategory === 'all' ? '#0f172a' : '#e2e8f0',
                color: selectedCategory === 'all' ? '#ffffff' : '#475569',
              }}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug || cat.name)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  background: (selectedCategory.toLowerCase() === (cat.slug || cat.name).toLowerCase()) ? '#0f172a' : '#e2e8f0',
                  color: (selectedCategory.toLowerCase() === (cat.slug || cat.name).toLowerCase()) ? '#ffffff' : '#475569',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={16} color="#64748b" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '600', color: '#334155', cursor: 'pointer', outline: 'none' }}
            >
              <option value="newest">Sort by: Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {orderSuccess && (
          <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', padding: '18px 24px', borderRadius: '12px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <CheckCircle color="#059669" size={28} />
              <div>
                <strong style={{ fontSize: '1.05rem', color: '#065f46' }}>Order #{orderSuccess.id} Placed Successfully!</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#047857' }}>
                  Total: <strong>${orderSuccess.total_amount}</strong> | Status: <strong>{orderSuccess.status}</strong>
                </p>
              </div>
            </div>
            <button onClick={() => setOrderSuccess(null)} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontWeight: 'bold' }}>Dismiss</button>
          </div>
        )}

        {/* Product Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '28px' }}>
          {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <Layers size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3>No products found</h3>
              <p>Try clearing filters or searching for another keyword.</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const productImg = formatImageUrl(product.image || product.image_url);
              return (
                <div
                  key={product.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    position: 'relative'
                  }}
                >
                  <div style={{ height: '220px', background: '#f1f5f9', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {productImg ? (
                      <img
                        src={productImg}
                        alt={product.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '📦';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Package size={52} color="#94a3b8" />
                    )}

                    {product.stock <= 10 && product.stock >= 5 && (
                      <span style={{ position: 'absolute', top: '12px', left: '12px', background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '6px' }}>
                        Low Stock ({product.stock})
                      </span>
                    )}
                    {product.stock < 5 && product.stock > 0 && (
                      <span style={{ position: 'absolute', top: '12px', left: '12px', background: '#ffedd5', color: '#c2410c', fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fdba74' }}>
                        Only {product.stock} Left!
                      </span>
                    )}
                    {product.stock === 0 && (
                      <span style={{ position: 'absolute', top: '12px', left: '12px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '6px' }}>
                        Sold Out
                      </span>
                    )}

                    <button
                      onClick={() => setQuickViewProduct(product)}
                      style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255, 255, 255, 0.95)', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                      <Eye size={14} /> Quick View
                    </button>
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {product.category_name || product.category?.name || 'General'}
                    </span>
                    <h3 style={{ margin: '8px 0 6px', fontSize: '1.15rem', fontWeight: '700' }}>{product.name}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', flexGrow: 1, margin: '0 0 16px', lineHeight: '1.4' }}>
                      {product.description || 'Premium quality verified.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Price</span>
                        <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>${product.price}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          onClick={() => handleAddToCartWithToast(product)}
                          disabled={product.stock <= 0}
                          style={{
                            padding: '10px 8px',
                            background: product.stock > 0 ? '#0f172a' : '#cbd5e1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          {authToken ? <Plus size={14} /> : <Lock size={12} />} {authToken ? 'Add to Bag' : 'Sign in'}
                        </button>

                        <button
                          onClick={() => handleOpenBuyNow(product)}
                          disabled={product.stock <= 0}
                          style={{
                            padding: '10px 8px',
                            background: product.stock > 0 ? '#2563eb' : '#e2e8f0',
                            color: product.stock > 0 ? '#ffffff' : '#94a3b8',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Zap size={14} /> Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DIRECT "BUY NOW" MODAL */}
      {buyNowProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '28px', color: '#0f172a', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <button
              onClick={() => setBuyNowProduct(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '6px' }}>
              <Zap size={20} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Express Checkout</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px' }}>
              Complete your order directly without adding to cart.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '8px', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                {formatImageUrl(buyNowProduct.image || buyNowProduct.image_url) ? (
                  <img src={formatImageUrl(buyNowProduct.image || buyNowProduct.image_url)} alt={buyNowProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Package size={24} color="#94a3b8" />
                )}
              </div>
              <div style={{ flexGrow: 1 }}>
                <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem' }}>{buyNowProduct.name}</h4>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>${buyNowProduct.price} each</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setBuyNowQty(Math.max(1, buyNowQty - 1))}
                  style={{ padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                >
                  <Minus size={12} />
                </button>
                <span style={{ fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>{buyNowQty}</span>
                <button
                  type="button"
                  onClick={() => setBuyNowQty(Math.min(buyNowProduct.stock, buyNowQty + 1))}
                  style={{ padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <form onSubmit={handleApplyBuyNowPromo} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Promo Code (SAVE10 / VIP20)"
                value={buyNowPromoCode}
                onChange={(e) => setBuyNowPromoCode(e.target.value)}
                style={{ flexGrow: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
              />
              <button
                type="submit"
                style={{ padding: '9px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
              >
                Apply
              </button>
            </form>

            <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal ({buyNowQty} item{buyNowQty > 1 ? 's' : ''}):</span>
                <span>${buyNowRawSubtotal.toFixed(2)}</span>
              </div>
              {buyNowDiscountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: '600' }}>
                  <span>Discount ({buyNowDiscountPercent}%):</span>
                  <span>-${buyNowDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.15rem', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                <span>Total Due:</span>
                <span>${buyNowFinalTotal}</span>
              </div>
            </div>

            <form onSubmit={handleExecuteBuyNow} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                required
                rows="2"
                placeholder="Enter shipping delivery address..."
                value={buyNowShippingAddress}
                onChange={(e) => setBuyNowShippingAddress(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? 'Processing Order...' : <>Complete Purchase <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User Orders Drawer */}
      {isHistoryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '480px', height: '100%', padding: '28px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>My Orders</h3>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', margin: '18px 0 12px' }}>
              <button
                onClick={() => setOrdersTab('active')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: ordersTab === 'active' ? '#ffffff' : 'transparent',
                  color: ordersTab === 'active' ? '#2563eb' : '#64748b',
                  boxShadow: ordersTab === 'active' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Activity size={15} /> Active Orders ({activeOrders.length})
              </button>
              <button
                onClick={() => setOrdersTab('delivered')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: ordersTab === 'delivered' ? '#ffffff' : 'transparent',
                  color: ordersTab === 'delivered' ? '#059669' : '#64748b',
                  boxShadow: ordersTab === 'delivered' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Archive size={15} /> Order History ({pastDeliveredOrders.length})
              </button>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px 0' }}>
              {ordersTab === 'active' ? (
                activeOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '50px', color: '#94a3b8' }}>
                    <Activity size={40} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.95rem', margin: 0 }}>No active in-transit orders.</p>
                  </div>
                ) : (
                  activeOrders.map((ord) => {
                    const currentIdx = STATUS_STAGES.indexOf(ord.status);
                    const badge = getStatusBadgeColor(ord.status);
                    return (
                      <div key={ord.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginBottom: '8px' }}>
                          <span>Order #{ord.id}</span>
                          <span style={{ color: '#059669' }}>${ord.total_amount}</span>
                        </div>
                        <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, marginBottom: '16px' }}>
                          {ord.status}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '8px' }}>
                          {STATUS_STAGES.map((stage, idx) => {
                            const isDone = currentIdx >= idx;
                            const isCurrent = currentIdx === idx;
                            return (
                              <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: isDone ? '#2563eb' : '#e2e8f0',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    boxShadow: isCurrent ? '0 0 0 4px #bfdbfe' : 'none'
                                  }}
                                >
                                  {isDone ? <Check size={14} /> : idx + 1}
                                </div>
                                <span style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '6px', color: isDone ? '#0f172a' : '#94a3b8', fontWeight: isCurrent ? 'bold' : 'normal' }}>
                                  {stage}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                pastDeliveredOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '50px', color: '#94a3b8' }}>
                    <Archive size={40} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.95rem', margin: 0 }}>No past delivered orders yet.</p>
                  </div>
                ) : (
                  pastDeliveredOrders.map((ord) => {
                    const badge = getStatusBadgeColor(ord.status);
                    return (
                      <div key={ord.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '14px', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>Order #{ord.id}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Address: {ord.shipping_address || 'Standard Delivery'}</div>
                          </div>
                          <span style={{ color: '#059669', fontWeight: '800' }}>${ord.total_amount}</span>
                        </div>
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 'bold', background: badge.bg, color: badge.text }}>
                            {ord.status}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Completed</span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '440px', height: '100%', padding: '28px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '-10px 0 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Shopping Bag ({totalItemCount})</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px 0' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '60px', color: '#94a3b8' }}>
                  <ShoppingBag size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                  <p>Your bag is currently empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>{item.name}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>${item.price} each</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}><Minus size={12} /></button>
                      <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} style={{ padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}><Plus size={12} /></button>
                      <button onClick={() => removeFromCart(item.id)} style={{ padding: '4px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '6px' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <form onSubmit={handleApplyPromo} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="text"
                    placeholder="Promo Code (SAVE10)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    style={{ flexGrow: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                  />
                  <button type="submit" style={{ padding: '8px 14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    Apply
                  </button>
                </form>

                <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>${totalAmount}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                      <span>Discount ({discountPercent}%):</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.15rem', color: '#0f172a', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <span>Total:</span>
                    <span>${finalTotal}</span>
                  </div>
                </div>

                <form onSubmit={handleCheckout}>
                  <textarea
                    required
                    rows="2"
                    placeholder="Enter shipping delivery address..."
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {loading ? 'Confirming Order...' : <>Checkout & Pay <ArrowRight size={18} /></>}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '380px', width: '100%', padding: '28px', position: 'relative' }}>
            <button onClick={() => setIsAuthOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>
              {authMode === 'signup' ? 'Create an Account' : 'Sign In to ShopCore'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 20px' }}>
              {authMode === 'signup' ? 'Sign up with a username and password.' : 'Sign in using your account credentials.'}
            </p>

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 42px 10px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Eye size={18} color={showPassword ? '#2563eb' : '#94a3b8'} />
                </button>
              </div>
              <button type="submit" style={{ padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: '#64748b' }}>
              {authMode === 'signup' ? (
                <>Already have an account? <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAuthMode('signin')}>Sign In</span></>
              ) : (
                <>Don't have an account? <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setAuthMode('signup')}>Register now</span></>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '680px', width: '100%', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}>
            <button onClick={() => setQuickViewProduct(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            <div style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              {formatImageUrl(quickViewProduct.image || quickViewProduct.image_url) ? (
                <img
                  src={formatImageUrl(quickViewProduct.image || quickViewProduct.image_url)}
                  alt={quickViewProduct.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '📦';
                  }}
                  style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }}
                />
              ) : (
                <Package size={64} color="#94a3b8" />
              )}
            </div>
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#2563eb' }}>{quickViewProduct.category_name || quickViewProduct.category?.name || 'General'}</span>
                <h2 style={{ margin: '6px 0 10px', fontSize: '1.3rem' }}>{quickViewProduct.name}</h2>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} color="#eab308" fill="#eab308" />)}
                </div>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>{quickViewProduct.description}</p>
                <div style={{ marginTop: '16px', fontSize: '1.5rem', fontWeight: '800' }}>${quickViewProduct.price}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={() => { handleAddToCartWithToast(quickViewProduct); setQuickViewProduct(null); }}
                  disabled={quickViewProduct.stock <= 0}
                  style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {authToken ? 'Add to Bag' : 'Sign in'}
                </button>
                <button
                  onClick={() => handleOpenBuyNow(quickViewProduct)}
                  disabled={quickViewProduct.stock <= 0}
                  style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Zap size={16} /> Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#0f172a', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100 }}>
          <Sparkles size={18} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ROOT COMPONENT
   ========================================================= */
export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('is_admin') === 'true');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('cart_items');
    setIsAdmin(false);
    window.location.reload();
  };

  return (
    <CartProvider>
      {isAdmin ? (
        <>
          <AdminDashboard onLogout={handleLogout} showToast={showToast} />
          {toastMessage && (
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#0f172a', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 100, border: '1px solid #334155' }}>
              <Sparkles size={18} color="#38bdf8" />
              <span>{toastMessage}</span>
            </div>
          )}
        </>
      ) : (
        <Storefront onLogout={handleLogout} />
      )}
    </CartProvider>
  );
}