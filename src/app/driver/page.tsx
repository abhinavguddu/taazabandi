'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

interface DeliveryOrder {
  id: string;
  customer_name: string;
  bundle_name: string;
  delivery_address: string;
  total_amount: number;
  queue_position: number;
  status: string;
  lat: number;
  lng: number;
}

interface DriverStats {
  rating: number;
  total_deliveries: number;
  on_time_percentage: number;
  today_earnings: number;
  week_earnings: number;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [driverStatus, setDriverStatus] = useState<'online' | 'offline' | 'break'>('offline');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriverData();
  }, []);

  const loadDriverData = async () => {
    const session = await getSession();
    const user = session?.user;
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Load driver profile
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!driver) {
      router.push('/driver/register');
      return;
    }

    if (!driver.is_approved) {
      router.push('/driver/pending');
      return;
    }

    setDriverStatus(driver.current_status);
    setStats({
      rating: driver.rating,
      total_deliveries: driver.total_deliveries,
      on_time_percentage: driver.on_time_percentage,
      today_earnings: 450,
      week_earnings: 2800,
    });

    // Load assigned orders
    const { data: assignedOrders } = await supabase
      .from('orders')
      .select(`
        id,
        delivery_address,
        total_amount,
        queue_position,
        status,
        lat,
        lng,
        customers(profiles(name)),
        bundles(name)
      `)
      .eq('driver_id', user.id)
      .in('status', ['assigned', 'picked', 'out_for_delivery'])
      .order('queue_position', { ascending: true });

    if (assignedOrders) {
      setOrders(assignedOrders.map(o => ({
        id: o.id,
        customer_name: (o.customers as any)?.[0]?.profiles?.name || (o.customers as any)?.profiles?.name || 'Customer',
        bundle_name: (o.bundles as any)?.[0]?.name || (o.bundles as any)?.name || 'Bundle',
        delivery_address: o.delivery_address,
        total_amount: o.total_amount,
        queue_position: o.queue_position || 1,
        status: o.status,
        lat: o.lat || 0,
        lng: o.lng || 0,
      })));
    }

    setLoading(false);
  };

  const handleStatusChange = async (newStatus: 'online' | 'offline' | 'break') => {
    const session = await getSession();
    const user = session?.user;
    if (!user) return;

    await supabase
      .from('drivers')
      .update({
        current_status: newStatus,
        is_online: newStatus === 'online',
      })
      .eq('id', user.id);

    setDriverStatus(newStatus);
  };

  const handleOrderAction = async (orderId: string, action: 'picked' | 'out_for_delivery' | 'delivered') => {
    await supabase
      .from('orders')
      .update({
        status: action,
        delivered_at: action === 'delivered' ? new Date().toISOString() : null,
      })
      .eq('id', orderId);

    loadDriverData();
  };

  if (loading) {
    return <div className={styles.loading}>Loading dashboard...</div>;
  }

  return (
    <div className={styles.driverDashboard}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Driver Dashboard</h1>
            <p className={styles.subtitle}>Manage your deliveries</p>
          </div>
          <div className={styles.statusToggle}>
            <button
              className={`${styles.statusBtn} ${driverStatus === 'online' ? styles.statusOnline : ''}`}
              onClick={() => handleStatusChange('online')}
            >
              🟢 Online
            </button>
            <button
              className={`${styles.statusBtn} ${driverStatus === 'break' ? styles.statusBreak : ''}`}
              onClick={() => handleStatusChange('break')}
            >
              ⏸️ Break
            </button>
            <button
              className={`${styles.statusBtn} ${driverStatus === 'offline' ? styles.statusOffline : ''}`}
              onClick={() => handleStatusChange('offline')}
            >
              🔴 Offline
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⭐</div>
              <div className={styles.statValue}>{stats.rating.toFixed(1)}</div>
              <div className={styles.statLabel}>Rating</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📦</div>
              <div className={styles.statValue}>{stats.total_deliveries}</div>
              <div className={styles.statLabel}>Total Deliveries</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⏱️</div>
              <div className={styles.statValue}>{stats.on_time_percentage}%</div>
              <div className={styles.statLabel}>On-Time</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💰</div>
              <div className={styles.statValue}>₹{stats.today_earnings}</div>
              <div className={styles.statLabel}>Today's Earnings</div>
            </div>
          </div>
        )}

        {/* Delivery Queue */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Today's Deliveries ({orders.length})</h2>
          
          {orders.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>No deliveries assigned yet</p>
              <p className={styles.emptyHint}>
                {driverStatus === 'offline' ? 'Go online to receive orders' : 'Waiting for orders...'}
              </p>
            </div>
          ) : (
            <div className={styles.ordersList}>
              {orders.map((order, index) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <span className={styles.orderNumber}>#{index + 1}</span>
                    <span className={`${styles.orderStatus} ${styles[`status${order.status}`]}`}>
                      {order.status === 'assigned' ? '📋 Assigned' :
                       order.status === 'picked' ? '📦 Picked' :
                       '🚐 Out for Delivery'}
                    </span>
                  </div>

                  <div className={styles.orderBody}>
                    <div className={styles.orderInfo}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Customer:</span>
                        <span className={styles.infoValue}>{order.customer_name}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Bundle:</span>
                        <span className={styles.infoValue}>{order.bundle_name}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Address:</span>
                        <span className={styles.infoValue}>{order.delivery_address}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Amount:</span>
                        <span className={styles.infoValue}>₹{order.total_amount}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.orderActions}>
                    {order.status === 'assigned' && (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleOrderAction(order.id, 'picked')}
                      >
                        ✅ Mark as Picked
                      </button>
                    )}
                    {order.status === 'picked' && (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleOrderAction(order.id, 'out_for_delivery')}
                      >
                        🚐 Start Delivery
                      </button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.navigateBtn}
                        >
                          🗺️ Navigate
                        </a>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleOrderAction(order.id, 'delivered')}
                        >
                          ✅ Mark Delivered
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
