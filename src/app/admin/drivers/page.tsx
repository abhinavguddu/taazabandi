'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

interface Driver {
  id: string;
  name: string;
  phone: string;
  aadhar_number: string;
  license_number: string;
  pan_number?: string;
  aadhar_photo_url?: string;
  license_photo_url?: string;
  approval_status: string;
  rating: number;
  total_deliveries: number;
  is_online: boolean;
  zone_name?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  capacity_kg?: number;
  rc_photo_url?: string;
  insurance_valid_till?: string;
  created_at: string;
}

export default function AdminDriversPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDriverIds, setExpandedDriverIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (driverId: string) => {
    setExpandedDriverIds(prev => ({
      ...prev,
      [driverId]: !prev[driverId]
    }));
  };

  useEffect(() => {
    checkAdmin();
    loadDrivers();
  }, [filter]);

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

  const loadDrivers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/drivers', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch drivers');
      }

      const { drivers: data } = await res.json();

      if (data) {
        // Apply client-side filter
        const filteredData = filter === 'all'
          ? data
          : data.filter((d: any) => d.approval_status === filter);

        setDrivers(filteredData.map((d: any) => ({
          id: d.id,
          name: d.profiles?.name || 'N/A',
          phone: d.profiles?.phone || 'N/A',
          aadhar_number: d.aadhar_number || 'N/A',
          license_number: d.license_number || 'N/A',
          pan_number: d.pan_number || 'N/A',
          aadhar_photo_url: d.aadhar_photo_url,
          license_photo_url: d.license_photo_url,
          approval_status: d.approval_status,
          rating: d.rating,
          total_deliveries: d.total_deliveries,
          is_online: d.is_online,
          zone_name: d.zones?.name,
          vehicle_number: Array.isArray(d.vehicles) ? d.vehicles[0]?.vehicle_number : d.vehicles?.vehicle_number,
          vehicle_type: Array.isArray(d.vehicles) ? d.vehicles[0]?.vehicle_type : d.vehicles?.vehicle_type || 'N/A',
          capacity_kg: Array.isArray(d.vehicles) ? d.vehicles[0]?.capacity_kg : d.vehicles?.capacity_kg || 0,
          rc_photo_url: Array.isArray(d.vehicles) ? d.vehicles[0]?.rc_photo_url : d.vehicles?.rc_photo_url,
          insurance_valid_till: Array.isArray(d.vehicles) ? d.vehicles[0]?.insurance_valid_till : d.vehicles?.insurance_valid_till || 'N/A',
          created_at: d.created_at,
        })));
      }
    } catch (error: any) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (driverId: string, action: 'approve' | 'reject' | 'block') => {
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      block: 'blocked',
    };

    await supabase
      .from('drivers')
      .update({
        approval_status: statusMap[action],
        is_approved: action === 'approve',
      })
      .eq('id', driverId);

    loadDrivers();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      pending: { label: '⏳ Pending', color: '#FFA726' },
      approved: { label: '✅ Approved', color: '#66BB6A' },
      rejected: { label: '❌ Rejected', color: '#EF5350' },
      blocked: { label: '🚫 Blocked', color: '#757575' },
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.driversPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/admin" className={styles.backLink}>← Back to Dashboard</Link>
            <h1 className={styles.title}>Driver Management</h1>
          </div>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All Drivers
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.filterActive : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'approved' ? styles.filterActive : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'rejected' ? styles.filterActive : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </button>
        </div>

        {drivers.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>👥</span>
            <p>No drivers found</p>
          </div>
        ) : (
          <div className={styles.driversTable}>
            {drivers.map(driver => {
              const badge = getStatusBadge(driver.approval_status);
              return (
                <div key={driver.id} className={styles.driverCard}>
                  <div className={styles.driverHeader}>
                    <div className={styles.driverInfo}>
                      <div className={styles.driverName}>
                        {driver.name}
                        {driver.is_online && <span className={styles.onlineDot}>🟢</span>}
                      </div>
                      <div className={styles.driverMeta}>
                        {driver.phone} • License: {driver.license_number}
                      </div>
                    </div>
                    <span
                      className={styles.statusBadge}
                      style={{ background: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className={styles.driverBody}>
                    <div className={styles.driverStats}>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Rating:</span>
                        <span className={styles.statValue}>⭐ {driver.rating.toFixed(1)}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Deliveries:</span>
                        <span className={styles.statValue}>{driver.total_deliveries}</span>
                      </div>
                      {driver.zone_name && (
                        <div className={styles.stat}>
                          <span className={styles.statLabel}>Zone:</span>
                          <span className={styles.statValue}>{driver.zone_name}</span>
                        </div>
                      )}
                      {driver.vehicle_number && (
                        <div className={styles.stat}>
                          <span className={styles.statLabel}>Vehicle:</span>
                          <span className={styles.statValue}>{driver.vehicle_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    className={styles.docsToggleBtn}
                    onClick={() => toggleExpand(driver.id)}
                  >
                    {expandedDriverIds[driver.id] ? '🔼 Hide Registration & Documents' : '📄 View Registration & Documents'}
                  </button>

                  {expandedDriverIds[driver.id] && (
                    <div className={styles.docsContainer}>
                      <div className={styles.docsGrid}>
                        {/* Personal Details */}
                        <div className={styles.docsBlock}>
                          <h4 className={styles.docsBlockTitle}>Personal Documents</h4>
                          <div className={styles.docsRow}>
                            <span className={styles.docsLabel}>Aadhar Card:</span>
                            <span className={styles.docsValue}>{driver.aadhar_number}</span>
                          </div>
                          <div className={styles.docsRow}>
                            <span className={styles.docsLabel}>PAN Card:</span>
                            <span className={styles.docsValue}>{driver.pan_number || 'N/A'}</span>
                          </div>
                          <div className={styles.docsRow}>
                            <span className={styles.docsLabel}>License Number:</span>
                            <span className={styles.docsValue}>{driver.license_number}</span>
                          </div>
                        </div>

                        {/* Vehicle Details */}
                        <div className={styles.docsBlock}>
                          <h4 className={styles.docsBlockTitle}>Vehicle Information</h4>
                          <div className={styles.docsRow}>
                            <span className={styles.docsLabel}>Vehicle Number:</span>
                            <span className={styles.docsValue}>{driver.vehicle_number || 'N/A'}</span>
                          </div>
                          <div className={styles.docsRow}>
                            <span className={styles.docsLabel}>Vehicle Type:</span>
                            <span className={styles.docsValue}>
                              {driver.vehicle_type === 'tata_ace' ? 'Tata Ace' : 
                               driver.vehicle_type === 'mahindra' ? 'Mahindra' : 
                               driver.vehicle_type === 'maruti' ? 'Maruti' : 
                               driver.vehicle_type || 'N/A'}
                            </span>
                          </div>
                          <div className={styles.docsRow}>
                            <span className={styles.docsLabel}>Capacity:</span>
                            <span className={styles.docsValue}>{driver.capacity_kg ? `${driver.capacity_kg} kg` : 'N/A'}</span>
                          </div>
                          <div className={styles.docsRow}>
                            <span className={styles.docsLabel}>Insurance Valid Till:</span>
                            <span className={styles.docsValue}>
                              {driver.insurance_valid_till && driver.insurance_valid_till !== 'N/A' 
                                ? new Date(driver.insurance_valid_till).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  }) 
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Uploaded Documents Photos */}
                      <div className={styles.imagesBlock}>
                        <h4 className={styles.docsBlockTitle}>Uploaded Document Proofs</h4>
                        <div className={styles.imagesGrid}>
                          {/* Aadhar Photo */}
                          <div className={styles.imageCard}>
                            <span className={styles.imageLabel}>Aadhar Front/Back</span>
                            <div className={styles.imageWrapper}>
                              {driver.aadhar_photo_url ? (
                                <img 
                                  src={driver.aadhar_photo_url} 
                                  alt="Aadhar Card" 
                                  className={styles.docImg}
                                  onClick={() => window.open(driver.aadhar_photo_url, '_blank')}
                                />
                              ) : (
                                <span className={styles.noImage}>No photo uploaded</span>
                              )}
                            </div>
                            {driver.aadhar_photo_url && (
                              <a href={driver.aadhar_photo_url} target="_blank" rel="noreferrer" className={styles.viewFullLink}>
                                View Fullscreen ↗
                              </a>
                            )}
                          </div>

                          {/* License Photo */}
                          <div className={styles.imageCard}>
                            <span className={styles.imageLabel}>Driving License</span>
                            <div className={styles.imageWrapper}>
                              {driver.license_photo_url ? (
                                <img 
                                  src={driver.license_photo_url} 
                                  alt="Driving License" 
                                  className={styles.docImg}
                                  onClick={() => window.open(driver.license_photo_url, '_blank')}
                                />
                              ) : (
                                <span className={styles.noImage}>No photo uploaded</span>
                              )}
                            </div>
                            {driver.license_photo_url && (
                              <a href={driver.license_photo_url} target="_blank" rel="noreferrer" className={styles.viewFullLink}>
                                View Fullscreen ↗
                              </a>
                            )}
                          </div>

                          {/* RC Photo */}
                          <div className={styles.imageCard}>
                            <span className={styles.imageLabel}>Vehicle RC Card</span>
                            <div className={styles.imageWrapper}>
                              {driver.rc_photo_url ? (
                                <img 
                                  src={driver.rc_photo_url} 
                                  alt="Vehicle RC Card" 
                                  className={styles.docImg}
                                  onClick={() => window.open(driver.rc_photo_url, '_blank')}
                                />
                              ) : (
                                <span className={styles.noImage}>No photo uploaded</span>
                              )}
                            </div>
                            {driver.rc_photo_url && (
                              <a href={driver.rc_photo_url} target="_blank" rel="noreferrer" className={styles.viewFullLink}>
                                View Fullscreen ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={styles.driverActions}>
                    {driver.approval_status === 'pending' && (
                      <>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleAction(driver.id, 'approve')}
                        >
                          ✅ Approve
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleAction(driver.id, 'reject')}
                        >
                          ❌ Reject
                        </button>
                      </>
                    )}
                    {driver.approval_status === 'approved' && (
                      <button
                        className={styles.blockBtn}
                        onClick={() => handleAction(driver.id, 'block')}
                      >
                        🚫 Block Driver
                      </button>
                    )}
                    {driver.approval_status === 'rejected' && (
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleAction(driver.id, 'approve')}
                      >
                        ✅ Approve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
