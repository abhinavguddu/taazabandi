'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

interface AddOn {
  id: string;
  name: string;
  name_te?: string;
  price: number;
  unit: string;
  icon: string;
  is_available: boolean;
}

export default function AdminAddOnsPage() {
  const router = useRouter();
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    name_te: '',
    price: '',
    unit: '',
    icon: '🌿',
    is_available: true,
  });

  useEffect(() => {
    checkAdmin();
    loadAddOns();
  }, []);

  const checkAdmin = async () => {
    const session = await getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }
  };

  const loadAddOns = async () => {
    const { data } = await supabase
      .from('add_ons')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setAddOns(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const data = {
      ...formData,
      price: parseFloat(formData.price),
    };

    if (editingId) {
      await supabase.from('add_ons').update(data).eq('id', editingId);
    } else {
      await supabase.from('add_ons').insert(data);
    }

    resetForm();
    loadAddOns();
  };

  const handleEdit = (addon: AddOn) => {
    setFormData({
      name: addon.name,
      name_te: addon.name_te || '',
      price: addon.price.toString(),
      unit: addon.unit,
      icon: addon.icon,
      is_available: addon.is_available,
    });
    setEditingId(addon.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this add-on?')) return;
    await supabase.from('add_ons').delete().eq('id', id);
    loadAddOns();
  };

  const handleToggleAvailable = async (id: string, current: boolean) => {
    await supabase.from('add_ons').update({ is_available: !current }).eq('id', id);
    loadAddOns();
  };

  const resetForm = () => {
    setFormData({ name: '', name_te: '', price: '', unit: '', icon: '🌿', is_available: true });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/admin" className={styles.backLink}>← Back to Dashboard</Link>
            <h1 className={styles.title}>🌿 Add-ons Management</h1>
          </div>
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            + Add New Add-on
          </button>
        </div>

        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>{editingId ? 'Edit Add-on' : 'Add New Add-on'}</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., Coriander"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Telugu Name (For Search)</label>
                <input
                  type="text"
                  value={formData.name_te}
                  onChange={(e) => setFormData({ ...formData, name_te: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., కొత్తిమీర"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Price (₹) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Unit *</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., bunch, 100g, 4 pieces"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Icon (Emoji) *</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className={styles.input}
                  placeholder="🌿"
                />
              </div>
            </div>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                />
                <span>Available</span>
              </label>
            </div>
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={resetForm}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSubmit}>
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}

        <div className={styles.grid}>
          {addOns.map(addon => (
            <div key={addon.id} className={styles.card}>
              <div className={styles.cardIcon}>{addon.icon}</div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{addon.name}</h3>

                <div className={styles.cardMeta}>
                  <span className={styles.cardPrice}>₹{addon.price}</span>
                  <span className={styles.cardUnit}>{addon.unit}</span>
                </div>
                <div className={styles.cardStatus}>
                  {addon.is_available ? (
                    <span className={styles.statusAvailable}>✅ Available</span>
                  ) : (
                    <span className={styles.statusUnavailable}>❌ Unavailable</span>
                  )}
                </div>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.toggleBtn}
                  onClick={() => handleToggleAvailable(addon.id, addon.is_available)}
                >
                  {addon.is_available ? '🔴 Disable' : '🟢 Enable'}
                </button>
                <button className={styles.editBtn} onClick={() => handleEdit(addon)}>✏️</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(addon.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
