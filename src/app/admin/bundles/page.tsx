'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

interface Bundle {
  id: string;
  name: string;
  name_te?: string;
  price: number;
  original_price?: number;
  description: string;
  image_url: string;
  serves: string;
  frequency: string;
  is_active: boolean;
  is_popular: boolean;
  tag?: string;
}

export default function AdminBundlesPage() {
  const router = useRouter();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    name_te: '',
    price: '',
    original_price: '',
    description: '',
    image_url: '/images/family-bundle.png',
    serves: '',
    frequency: '',
    tag: '',
    is_active: true,
    is_popular: false,
  });

  useEffect(() => {
    checkAdmin();
    loadBundles();
  }, []);

  const checkAdmin = async () => {
    const session = await getSession();
    const user = session?.user;
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/');
    }
  };

  const loadBundles = async () => {
    const { data } = await supabase
      .from('bundles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setBundles(data);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    const bundleData = {
      ...formData,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      vegetables: [], // In real app, add vegetable selection
    };

    if (editingId) {
      await supabase
        .from('bundles')
        .update(bundleData)
        .eq('id', editingId);
    } else {
      await supabase.from('bundles').insert(bundleData);
    }

    resetForm();
    loadBundles();
  };

  const handleEdit = (bundle: Bundle) => {
    setFormData({
      name: bundle.name,
      name_te: bundle.name_te || '',
      price: bundle.price.toString(),
      original_price: bundle.original_price?.toString() || '',
      description: bundle.description,
      image_url: bundle.image_url,
      serves: bundle.serves,
      frequency: bundle.frequency,
      tag: bundle.tag || '',
      is_active: bundle.is_active,
      is_popular: bundle.is_popular,
    });
    setEditingId(bundle.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bundle?')) return;

    await supabase.from('bundles').delete().eq('id', id);
    loadBundles();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('bundles')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    loadBundles();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_te: '',
      price: '',
      original_price: '',
      description: '',
      image_url: '/images/family-bundle.png',
      serves: '',
      frequency: '',
      tag: '',
      is_active: true,
      is_popular: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.bundlesPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/admin" className={styles.backLink}>← Back to Dashboard</Link>
            <h1 className={styles.title}>Bundles Management</h1>
          </div>
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            + Add New Bundle
          </button>
        </div>

        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>
              {editingId ? 'Edit Bundle' : 'Add New Bundle'}
            </h2>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Bundle Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Telugu Name (For Search)</label>
                <input
                  type="text"
                  value={formData.name_te}
                  onChange={(e) => setFormData({ ...formData, name_te: e.target.value })}
                  className={styles.input}
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
                <label>Original Price (₹)</label>
                <input
                  type="number"
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Serves</label>
                <input
                  type="text"
                  value={formData.serves}
                  onChange={(e) => setFormData({ ...formData, serves: e.target.value })}
                  placeholder="e.g., Family of 4"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Frequency</label>
                <input
                  type="text"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., Every 3 days"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Tag</label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="e.g., Most Popular"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Image URL</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className={styles.textarea}
              />
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
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                />
                <span>Mark as Popular</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={resetForm}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSubmit}>
                {editingId ? 'Update Bundle' : 'Create Bundle'}
              </button>
            </div>
          </div>
        )}

        <div className={styles.bundlesGrid}>
          {bundles.map(bundle => {
            const imageUrl = bundle.image_url && typeof bundle.image_url === 'string' && bundle.image_url.trim() !== ''
              ? bundle.image_url
              : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop';

            return (
              <div key={bundle.id} className={styles.bundleCard}>
                <div className={styles.bundleImage}>
                  <Image
                    src={imageUrl}
                    alt={bundle.name}
                    width={300}
                    height={150}
                    className={styles.img}
                  />
                  {!bundle.is_active && (
                    <div className={styles.inactiveBadge}>Inactive</div>
                  )}
                  {bundle.is_popular && (
                    <div className={styles.popularBadge}>⭐ Popular</div>
                  )}
                </div>

                <div className={styles.bundleBody}>
                  <h3 className={styles.bundleName}>{bundle.name}</h3>

                  <p className={styles.bundleDesc}>{bundle.description}</p>

                  <div className={styles.bundleMeta}>
                    <span>👥 {bundle.serves}</span>
                    <span>📅 {bundle.frequency}</span>
                  </div>

                  <div className={styles.bundlePrice}>
                    <span className={styles.price}>₹{bundle.price}</span>
                    {bundle.original_price && (
                      <span className={styles.originalPrice}>₹{bundle.original_price}</span>
                    )}
                  </div>

                  <div className={styles.bundleActions}>
                    <button
                      className={styles.toggleBtn}
                      onClick={() => handleToggleActive(bundle.id, bundle.is_active)}
                    >
                      {bundle.is_active ? '🔴 Deactivate' : '🟢 Activate'}
                    </button>
                    <button
                      className={styles.editBtn}
                      onClick={() => handleEdit(bundle)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(bundle.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
