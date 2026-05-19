'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface Zone {
  id: string;
  name: string;
  pincode: string;
  areas: string[];
  morning_slot_capacity: number;
  evening_slot_capacity: number;
  is_active: boolean;
}

export default function AdminZonesPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingSlots, setGeneratingSlots] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    pincode: '500075',
    areas: '',
    morning_slot_capacity: '250',
    evening_slot_capacity: '150',
    is_active: true,
  });

  useEffect(() => {
    checkAdmin();
    loadZones();
  }, []);

  const checkAdmin = async () => {
    const { getUser } = await import('@/lib/supabase');
    const user = await getUser();
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

  const loadZones = async () => {
    const { data } = await supabase
      .from('zones')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setZones(data);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    const zoneData = {
      name: formData.name,
      pincode: formData.pincode,
      areas: formData.areas.split(',').map(a => a.trim()),
      morning_slot_capacity: parseInt(formData.morning_slot_capacity),
      evening_slot_capacity: parseInt(formData.evening_slot_capacity),
      is_active: formData.is_active,
    };

    if (editingId) {
      await supabase
        .from('zones')
        .update(zoneData)
        .eq('id', editingId);
    } else {
      await supabase.from('zones').insert(zoneData);
    }

    resetForm();
    loadZones();
  };

  const handleEdit = (zone: Zone) => {
    setFormData({
      name: zone.name,
      pincode: zone.pincode,
      areas: zone.areas.join(', '),
      morning_slot_capacity: zone.morning_slot_capacity.toString(),
      evening_slot_capacity: zone.evening_slot_capacity.toString(),
      is_active: zone.is_active,
    });
    setEditingId(zone.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this zone? This will affect all related orders and slots.')) return;

    await supabase.from('zones').delete().eq('id', id);
    loadZones();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('zones')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    loadZones();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      pincode: '500075',
      areas: '',
      morning_slot_capacity: '250',
      evening_slot_capacity: '150',
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleGenerateSlots = async () => {
    setGeneratingSlots(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      let createdCount = 0;

      for (const zone of zones) {
        if (!zone.is_active) continue;

        // Morning Slot
        const { error: mError } = await supabase.from('slots').insert({
          zone_id: zone.id,
          slot_type: 'morning',
          slot_label: '6:00 AM - 9:00 AM',
          date: date,
          total_capacity: zone.morning_slot_capacity
        });
        if (!mError) createdCount++;

        // Evening Slot
        const { error: eError } = await supabase.from('slots').insert({
          zone_id: zone.id,
          slot_type: 'evening',
          slot_label: '5:00 PM - 8:00 PM',
          date: date,
          total_capacity: zone.evening_slot_capacity
        });
        if (!eError) createdCount++;
      }
      if (createdCount > 0) {
        alert(`Successfully generated ${createdCount} new slots for today!`);
      } else {
        alert('Slots for today already exist.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Error generating slots: ' + e.message);
    }
    setGeneratingSlots(false);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.zonesPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/admin" className={styles.backLink}>← Back to Dashboard</Link>
            <h1 className={styles.title}>Zones & Slots Management</h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className={styles.addBtn} 
              onClick={handleGenerateSlots}
              disabled={generatingSlots}
              style={{ backgroundColor: '#2e7d32' }}
            >
              {generatingSlots ? 'Generating...' : '⚡ Generate Today\'s Slots'}
            </button>
            <button className={styles.addBtn} onClick={() => setShowForm(true)}>
              + Add New Zone
            </button>
          </div>
        </div>

        {showForm && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>
              {editingId ? 'Edit Zone' : 'Add New Zone'}
            </h2>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Zone Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Zone D: Gachibowli"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Pincode *</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Morning Slot Capacity *</label>
                <input
                  type="number"
                  value={formData.morning_slot_capacity}
                  onChange={(e) => setFormData({ ...formData, morning_slot_capacity: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Evening Slot Capacity *</label>
                <input
                  type="number"
                  value={formData.evening_slot_capacity}
                  onChange={(e) => setFormData({ ...formData, evening_slot_capacity: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Areas (comma-separated) *</label>
              <input
                type="text"
                value={formData.areas}
                onChange={(e) => setFormData({ ...formData, areas: e.target.value })}
                placeholder="e.g., Gachibowli, Financial District, Nanakramguda"
                className={styles.input}
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
            </div>

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={resetForm}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSubmit}>
                {editingId ? 'Update Zone' : 'Create Zone'}
              </button>
            </div>
          </div>
        )}

        <div className={styles.zonesGrid}>
          {zones.map(zone => (
            <div key={zone.id} className={styles.zoneCard}>
              <div className={styles.zoneHeader}>
                <div className={styles.zoneName}>{zone.name}</div>
                {!zone.is_active && (
                  <span className={styles.inactiveBadge}>Inactive</span>
                )}
              </div>

              <div className={styles.zoneBody}>
                <div className={styles.zoneInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>📍 Pincode:</span>
                    <span className={styles.infoValue}>{zone.pincode}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>🌅 Morning Capacity:</span>
                    <span className={styles.infoValue}>{zone.morning_slot_capacity} orders</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>🌇 Evening Capacity:</span>
                    <span className={styles.infoValue}>{zone.evening_slot_capacity} orders</span>
                  </div>
                </div>

                <div className={styles.areasSection}>
                  <div className={styles.areasLabel}>Areas Covered:</div>
                  <div className={styles.areasTags}>
                    {zone.areas.map((area, i) => (
                      <span key={i} className={styles.areaTag}>{area}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.zoneActions}>
                <button
                  className={styles.toggleBtn}
                  onClick={() => handleToggleActive(zone.id, zone.is_active)}
                >
                  {zone.is_active ? '🔴 Deactivate' : '🟢 Activate'}
                </button>
                <button
                  className={styles.editBtn}
                  onClick={() => handleEdit(zone)}
                >
                  ✏️ Edit
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(zone.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
