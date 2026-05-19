'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_discount?: number;
  valid_till: string;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
}

export default function AdminCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    code: '',
    type: 'fixed' as 'percentage' | 'fixed',
    value: '',
    min_order_amount: '0',
    max_discount: '',
    valid_till: '',
    usage_limit: '100',
    is_active: true,
  });

  useEffect(() => {
    checkAdmin();
    loadCoupons();
  }, []);

  const checkAdmin = async () => {
    const session = await getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }
  };

  const loadCoupons = async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCoupons(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.code.trim()) {
        alert('Please enter a coupon code.');
        return;
      }
      if (!formData.value || isNaN(parseFloat(formData.value))) {
        alert('Please enter a valid numeric coupon value.');
        return;
      }
      if (!formData.valid_till) {
        alert('Please select a valid expiration date.');
        return;
      }

      const data = {
        code: formData.code.toUpperCase().trim(),
        type: formData.type,
        value: parseFloat(formData.value),
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        valid_till: new Date(formData.valid_till).toISOString(),
        usage_limit: parseInt(formData.usage_limit) || 100,
        is_active: formData.is_active,
      };

      let result;
      if (editingId) {
        result = await supabase.from('coupons').update(data).eq('id', editingId);
      } else {
        result = await supabase.from('coupons').insert({ ...data, used_count: 0 });
      }

      if (result.error) {
        console.error('Error saving coupon:', result.error);
        alert(`Failed to save coupon: ${result.error.message}`);
        return;
      }

      resetForm();
      loadCoupons();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      alert(`Error saving coupon: ${err.message}`);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      min_order_amount: coupon.min_order_amount.toString(),
      max_discount: coupon.max_discount?.toString() || '',
      valid_till: coupon.valid_till.split('T')[0],
      usage_limit: coupon.usage_limit.toString(),
      is_active: coupon.is_active,
    });
    setEditingId(coupon.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    loadCoupons();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id);
    loadCoupons();
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'fixed',
      value: '',
      min_order_amount: '0',
      max_discount: '',
      valid_till: '',
      usage_limit: '100',
      is_active: true,
    });
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
            <h1 className={styles.title}>🎟️ Coupons Management</h1>
          </div>
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            + Create New Coupon
          </button>
        </div>

        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>{editingId ? 'Edit Coupon' : 'Create New Coupon'}</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Coupon Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className={styles.input}
                  placeholder="e.g., TAAZA50"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className={styles.input}
                >
                  <option value="fixed">Fixed Amount (₹)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Value *</label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className={styles.input}
                  placeholder={formData.type === 'fixed' ? '50' : '10'}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Min Order Amount (₹)</label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  className={styles.input}
                />
              </div>
              {formData.type === 'percentage' && (
                <div className={styles.formGroup}>
                  <label>Max Discount (₹)</label>
                  <input
                    type="number"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    className={styles.input}
                  />
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Valid Till *</label>
                <input
                  type="date"
                  value={formData.valid_till}
                  onChange={(e) => setFormData({ ...formData, valid_till: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Usage Limit</label>
                <input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span>Active</span>
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
          {coupons.map(coupon => {
            const isExpired = new Date(coupon.valid_till) < new Date();
            const usagePercent = (coupon.used_count / coupon.usage_limit) * 100;
            
            return (
              <div key={coupon.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.couponCode}>{coupon.code}</div>
                  {!coupon.is_active && <span className={styles.inactiveBadge}>Inactive</span>}
                  {isExpired && <span className={styles.expiredBadge}>Expired</span>}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.couponValue}>
                    {coupon.type === 'fixed' ? `₹${coupon.value} OFF` : `${coupon.value}% OFF`}
                  </div>
                  <div className={styles.couponDetails}>
                    <div className={styles.detailRow}>
                      <span>Min Order:</span>
                      <span>₹{coupon.min_order_amount}</span>
                    </div>
                    {coupon.max_discount && (
                      <div className={styles.detailRow}>
                        <span>Max Discount:</span>
                        <span>₹{coupon.max_discount}</span>
                      </div>
                    )}
                    <div className={styles.detailRow}>
                      <span>Valid Till:</span>
                      <span>{new Date(coupon.valid_till).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Usage:</span>
                      <span>{coupon.used_count}/{coupon.usage_limit}</span>
                    </div>
                  </div>
                  <div className={styles.usageBar}>
                    <div className={styles.usageFill} style={{ width: `${usagePercent}%` }} />
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.toggleBtn}
                    onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                  >
                    {coupon.is_active ? '🔴 Deactivate' : '🟢 Activate'}
                  </button>
                  <button className={styles.editBtn} onClick={() => handleEdit(coupon)}>✏️</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(coupon.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
