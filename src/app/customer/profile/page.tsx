'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, signOut } from '@/lib/supabase';
import styles from './page.module.css';

interface Address {
  id: string;
  label: string;
  address: string;
  landmark?: string;
  pincode: string;
  is_default: boolean;
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'profile' | 'addresses' | 'loyalty'>('profile');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // New address form
  const [newAddress, setNewAddress] = useState({
    label: 'home' as 'home' | 'office' | 'other',
    address: '',
    landmark: '',
    pincode: '500075',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { getUser } = await import('@/lib/supabase');
    const user = await getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Dev mode fallback defaults
    setName((user as any).name || user.phone || '');
    setPhone(user.phone || '');
    setLoyaltyPoints(0);
    setReferralCode('TB' + Math.random().toString(36).substr(2, 6).toUpperCase());

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, phone')
      .eq('id', user.id)
      .single();

    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }

    // Load customer data
    const { data: customer } = await supabase
      .from('customers')
      .select('loyalty_points, referral_code')
      .eq('id', user.id)
      .single();

    if (customer) {
      setLoyaltyPoints(customer.loyalty_points || 0);
      setReferralCode(customer.referral_code || '');
    }

    // Load addresses
    const { data: addressData } = await supabase
      .from('addresses')
      .select('*')
      .eq('customer_id', user.id)
      .order('is_default', { ascending: false });

    if (addressData) {
      setAddresses(addressData);
    }

    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    const { getUser } = await import('@/lib/supabase');
    const user = await getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user.id);

    alert('Profile updated successfully!');
  };

  const handleAddAddress = async () => {
    const { getUser } = await import('@/lib/supabase');
    const user = await getUser();
    if (!user) return;

    const { error } = await supabase.from('addresses').insert({
      customer_id: user.id,
      ...newAddress,
      is_default: addresses.length === 0,
    });

    if (!error) {
      setShowAddressForm(false);
      setNewAddress({ label: 'home', address: '', landmark: '', pincode: '500075' });
      loadProfile();
    }
  };

  const handleSetDefault = async (addressId: string) => {
    const { getUser } = await import('@/lib/supabase');
    const user = await getUser();
    if (!user) return;

    // Unset all defaults
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('customer_id', user.id);

    // Set new default
    await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId);

    loadProfile();
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Delete this address?')) return;

    await supabase.from('addresses').delete().eq('id', addressId);
    loadProfile();
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.profilePage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Profile</h1>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setTab('profile')}
          >
            👤 Profile
          </button>
          <button
            className={`${styles.tab} ${tab === 'addresses' ? styles.tabActive : ''}`}
            onClick={() => setTab('addresses')}
          >
            📍 Addresses
          </button>
          <button
            className={`${styles.tab} ${tab === 'loyalty' ? styles.tabActive : ''}`}
            onClick={() => setTab('loyalty')}
          >
            ⭐ Loyalty
          </button>
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className={styles.tabContent}>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Phone Number</label>
              <input
                type="text"
                value={phone}
                disabled
                className={styles.inputDisabled}
              />
              <span className={styles.hint}>Phone number cannot be changed</span>
            </div>

            <button className={styles.saveBtn} onClick={handleUpdateProfile}>
              Save Changes
            </button>
          </div>
        )}

        {/* Addresses Tab */}
        {tab === 'addresses' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Saved Addresses</h2>
              <button className={styles.addBtn} onClick={() => setShowAddressForm(true)}>
                + Add New
              </button>
            </div>

            {showAddressForm && (
              <div className={styles.addressForm}>
                <h3>Add New Address</h3>
                <div className={styles.formGroup}>
                  <label>Label</label>
                  <select
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value as any })}
                    className={styles.select}
                  >
                    <option value="home">🏠 Home</option>
                    <option value="office">🏢 Office</option>
                    <option value="other">📍 Other</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Address</label>
                  <textarea
                    value={newAddress.address}
                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                    rows={3}
                    className={styles.textarea}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Landmark (Optional)</label>
                  <input
                    type="text"
                    value={newAddress.landmark}
                    onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} onClick={() => setShowAddressForm(false)}>
                    Cancel
                  </button>
                  <button className={styles.saveBtn} onClick={handleAddAddress}>
                    Save Address
                  </button>
                </div>
              </div>
            )}

            <div className={styles.addressesList}>
              {addresses.map(addr => (
                <div key={addr.id} className={`${styles.addressCard} ${addr.is_default ? styles.defaultAddress : ''}`}>
                  <div className={styles.addressHeader}>
                    <span className={styles.addressLabel}>
                      {addr.label === 'home' ? '🏠 Home' : addr.label === 'office' ? '🏢 Office' : '📍 Other'}
                    </span>
                    {addr.is_default && <span className={styles.defaultBadge}>Default</span>}
                  </div>
                  <div className={styles.addressText}>{addr.address}</div>
                  {addr.landmark && <div className={styles.addressLandmark}>Near: {addr.landmark}</div>}
                  <div className={styles.addressPincode}>Pincode: {addr.pincode}</div>
                  <div className={styles.addressActions}>
                    {!addr.is_default && (
                      <button className={styles.actionBtn} onClick={() => handleSetDefault(addr.id)}>
                        Set as Default
                      </button>
                    )}
                    <button className={styles.deleteBtn} onClick={() => handleDeleteAddress(addr.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loyalty Tab */}
        {tab === 'loyalty' && (
          <div className={styles.tabContent}>
            <div className={styles.loyaltyCard}>
              <div className={styles.loyaltyIcon}>⭐</div>
              <div className={styles.loyaltyPoints}>{loyaltyPoints}</div>
              <div className={styles.loyaltyLabel}>Loyalty Points</div>
              <div className={styles.loyaltyValue}>= ₹{loyaltyPoints}</div>
            </div>

            <div className={styles.referralCard}>
              <h3>Refer & Earn</h3>
              <p>Share your referral code and earn ₹50 for each friend who places their first order!</p>
              <div className={styles.referralCode}>
                <input type="text" value={referralCode} readOnly className={styles.codeInput} />
                <button
                  className={styles.copyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode);
                    alert('Referral code copied!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className={styles.infoBox}>
              <strong>How to earn points:</strong>
              <ul>
                <li>₹1 = 1 point on every order</li>
                <li>₹50 bonus for each referral</li>
                <li>2x points on first order</li>
                <li>Use points on your next order (1 point = ₹1)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
