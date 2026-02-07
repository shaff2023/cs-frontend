import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState({});
  const [categories, setCategories] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  // Category form
  const [categoryForm, setCategoryForm] = useState({ name: '', display_name: '' });
  const [editingCategory, setEditingCategory] = useState(null);

  // Admin form
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [editingAdmin, setEditingAdmin] = useState(null);

  useEffect(() => {
    loadStats();
    loadCategories();
    loadAdmins();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/superadmin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/superadmin/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadAdmins = async () => {
    try {
      const response = await api.get('/superadmin/admins');
      setAdmins(response.data);
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/superadmin/categories', categoryForm);
      setCategoryForm({ name: '', display_name: '' });
      loadCategories();
      alert('Kategori berhasil dibuat');
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal membuat kategori');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/superadmin/categories/${editingCategory.id}`, categoryForm);
      setEditingCategory(null);
      setCategoryForm({ name: '', display_name: '' });
      loadCategories();
      alert('Kategori berhasil diupdate');
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal update kategori');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kategori ini?')) return;
    try {
      await api.delete(`/superadmin/categories/${id}`);
      loadCategories();
      alert('Kategori berhasil dihapus');
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal menghapus kategori');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/superadmin/admins', adminForm);
      setAdminForm({ name: '', email: '', password: '', role: 'admin' });
      loadAdmins();
      alert('Admin berhasil dibuat');
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal membuat admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/superadmin/admins/${editingAdmin.id}`, adminForm);
      setEditingAdmin(null);
      setAdminForm({ name: '', email: '', password: '', role: 'admin' });
      loadAdmins();
      alert('Admin berhasil diupdate');
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal update admin');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Yakin ingin menghapus admin ini?')) return;
    try {
      await api.delete(`/superadmin/admins/${id}`);
      loadAdmins();
      alert('Admin berhasil dihapus');
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal menghapus admin');
    }
  };

  const startEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, display_name: category.display_name });
  };

  const startEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setAdminForm({ name: admin.name, email: admin.email, password: '', role: admin.role });
  };

  return (
    <div className="superadmin-dashboard">
      <div className="superadmin-header">
        <h1>RUNTERA Super Admin Dashboard</h1>
        <div className="header-info">
          <span>Welcome, {user?.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="superadmin-tabs">
        <button 
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          Statistik
        </button>
        <button 
          className={activeTab === 'categories' ? 'active' : ''}
          onClick={() => setActiveTab('categories')}
        >
          Kategori Layanan
        </button>
        <button 
          className={activeTab === 'admins' ? 'active' : ''}
          onClick={() => setActiveTab('admins')}
        >
          Kelola Admin
        </button>
      </div>

      <div className="superadmin-content">
        {activeTab === 'stats' && (
          <div className="stats-section">
            <h2>Statistik Chat</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Chat</h3>
                <div className="stat-value">{stats.total_chats || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Open</h3>
                <div className="stat-value open">{stats.open_count || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Claimed</h3>
                <div className="stat-value claimed">{stats.claimed_count || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Closed</h3>
                <div className="stat-value closed">{stats.closed_count || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Solved</h3>
                <div className="stat-value solved">{stats.solved_count || 0}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="categories-section">
            <h2>Kelola Kategori Layanan</h2>
            
            <form 
              className="category-form"
              onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
            >
              <input
                type="text"
                placeholder="Name (slug, e.g. racepack)"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                required
                disabled={!!editingCategory}
              />
              <input
                type="text"
                placeholder="Display Name (e.g. Racepack)"
                value={categoryForm.display_name}
                onChange={(e) => setCategoryForm({ ...categoryForm, display_name: e.target.value })}
                required
              />
              <button type="submit" disabled={loading}>
                {editingCategory ? 'Update' : 'Tambah'} Kategori
              </button>
              {editingCategory && (
                <button type="button" onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', display_name: '' });
                }}>
                  Batal
                </button>
              )}
            </form>

            <div className="categories-list">
              <h3>Daftar Kategori</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Display Name</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>{cat.name}</td>
                      <td>{cat.display_name}</td>
                      <td>
                        <span className={cat.is_active ? 'status-active' : 'status-inactive'}>
                          {cat.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => startEditCategory(cat)}>Edit</button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="delete-btn"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="admins-section">
            <h2>Kelola Akun Admin</h2>
            
            <form 
              className="admin-form"
              onSubmit={editingAdmin ? handleUpdateAdmin : handleCreateAdmin}
            >
              <input
                type="text"
                placeholder="Nama"
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder={editingAdmin ? "Password (kosongkan jika tidak diubah)" : "Password"}
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                required={!editingAdmin}
              />
              <select
                value={adminForm.role}
                onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
              <button type="submit" disabled={loading}>
                {editingAdmin ? 'Update' : 'Tambah'} Admin
              </button>
              {editingAdmin && (
                <button type="button" onClick={() => {
                  setEditingAdmin(null);
                  setAdminForm({ name: '', email: '', password: '', role: 'admin' });
                }}>
                  Batal
                </button>
              )}
            </form>

            <div className="admins-list">
              <h3>Daftar Admin</h3>
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Tanggal Dibuat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.name}</td>
                      <td>{admin.email}</td>
                      <td>
                        <span className={`role-badge ${admin.role}`}>
                          {admin.role}
                        </span>
                      </td>
                      <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => startEditAdmin(admin)}>Edit</button>
                        {admin.id !== user.id && (
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="delete-btn"
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
