'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'hero' | 'slots'>('general');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [generalSettings, setGeneralSettings] = useState({
    site_name: 'TaazaBandi',
    service_pincode: '500075',
    service_city: 'Hyderabad',
    contact_phone: '+91 9876543210',
    contact_email: 'support@taazabandi.com',
    min_order_amount: '199',
    delivery_fee: '0',
  });

  const [heroSettings, setHeroSettings] = useState({
    hero_title: 'What\'s on the menu today? Farm Fresh Vegetable Bundles at Your Door',
    hero_subtitle: 'No cherry-picking, no mandi trips. Choose a pre-packed bundle, pick your slot, and our van delivers farm-fresh vegetables straight to your doorstep.',
    hero_cta_primary: 'Order Bundle Now',
    hero_cta_secondary: 'Track Active Van',
  });

  const [slotSettings, setSlotSettings] = useState({
    morning_slot_start: '06:00',
    morning_slot_end: '09:00',
    evening_slot_start: '17:00',
    evening_slot_end: '20:00',
    slot_booking_advance_days: '7',
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const session = await getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }
  };

  const handleSave = () => {
    setLoading(true);
    
    // In real app, save to database
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/admin" className={styles.backLink}>← Back to Dashboard</Link>
            <h1 className={styles.title}>⚙️ Site Settings</h1>
          </div>
          <button 
            className={styles.saveBtn} 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : saved ? '✅ Saved!' : '💾 Save Changes'}
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'general' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('general')}
          >
            🌐 General
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'hero' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('hero')}
          >
            🎨 Hero Section
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'slots' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('slots')}
          >
            ⏰ Slot Timings
          </button>
        </div>

        {activeTab === 'general' && (
          <div className={styles.settingsCard}>
            <h2 className={styles.cardTitle}>General Settings</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Site Name</label>
                <input
                  type="text"
                  value={generalSettings.site_name}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, site_name: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Service Pincode</label>
                <input
                  type="text"
                  value={generalSettings.service_pincode}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, service_pincode: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Service City</label>
                <input
                  type="text"
                  value={generalSettings.service_city}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, service_city: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contact Phone</label>
                <input
                  type="text"
                  value={generalSettings.contact_phone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contact_phone: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contact Email</label>
                <input
                  type="email"
                  value={generalSettings.contact_email}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contact_email: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Min Order Amount (₹)</label>
                <input
                  type="number"
                  value={generalSettings.min_order_amount}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, min_order_amount: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={generalSettings.delivery_fee}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, delivery_fee: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hero' && (
          <div className={styles.settingsCard}>
            <h2 className={styles.cardTitle}>Hero Section Content</h2>
            <div className={styles.formGroup}>
              <label>Hero Title</label>
              <input
                type="text"
                value={heroSettings.hero_title}
                onChange={(e) => setHeroSettings({ ...heroSettings, hero_title: e.target.value })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Hero Subtitle</label>
              <textarea
                value={heroSettings.hero_subtitle}
                onChange={(e) => setHeroSettings({ ...heroSettings, hero_subtitle: e.target.value })}
                rows={3}
                className={styles.textarea}
              />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Primary CTA Text</label>
                <input
                  type="text"
                  value={heroSettings.hero_cta_primary}
                  onChange={(e) => setHeroSettings({ ...heroSettings, hero_cta_primary: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Secondary CTA Text</label>
                <input
                  type="text"
                  value={heroSettings.hero_cta_secondary}
                  onChange={(e) => setHeroSettings({ ...heroSettings, hero_cta_secondary: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'slots' && (
          <div className={styles.settingsCard}>
            <h2 className={styles.cardTitle}>Delivery Slot Timings</h2>
            <div className={styles.slotSection}>
              <h3 className={styles.slotTitle}>🌅 Morning Slot</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={slotSettings.morning_slot_start}
                    onChange={(e) => setSlotSettings({ ...slotSettings, morning_slot_start: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Time</label>
                  <input
                    type="time"
                    value={slotSettings.morning_slot_end}
                    onChange={(e) => setSlotSettings({ ...slotSettings, morning_slot_end: e.target.value })}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
            <div className={styles.slotSection}>
              <h3 className={styles.slotTitle}>🌇 Evening Slot</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={slotSettings.evening_slot_start}
                    onChange={(e) => setSlotSettings({ ...slotSettings, evening_slot_start: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Time</label>
                  <input
                    type="time"
                    value={slotSettings.evening_slot_end}
                    onChange={(e) => setSlotSettings({ ...slotSettings, evening_slot_end: e.target.value })}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Advance Booking Days</label>
              <input
                type="number"
                value={slotSettings.slot_booking_advance_days}
                onChange={(e) => setSlotSettings({ ...slotSettings, slot_booking_advance_days: e.target.value })}
                className={styles.input}
              />
              <span className={styles.hint}>How many days in advance customers can book slots</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
