'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

interface Order {
  id: string;
  customer_name: string;
  driver_name?: string;
  bundle_name: string;
  slot_label: string;
  zone_name: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  delivery_address: string;
  created_at: string;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'delivered' | 'cancelled'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    checkAdmin();
    loadOrders();
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

  const loadOrders = async () => {
    let query = supabase
      .from('orders')
      .select(`
        id,
        status,
        payment_method,
        payment_status,
        total_amount,
        delivery_address,
        created_at,
        customers(profiles(name)),
        drivers(profiles(name)),
        bundles(name),
        slots(slot_label, zones(name))
      `)
      .order('created_at', { ascending: false });

    if (filter === 'active') {
      query = query.in('status', ['confirmed', 'assigned', 'picked', 'out_for_delivery']);
    } else if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;

    if (data) {
      setOrders(data.map(o => ({
        id: o.id,
        customer_name: (o.customers as any)?.[0]?.profiles?.name || (o.customers as any)?.profiles?.name || 'Customer',
        driver_name: (o.drivers as any)?.[0]?.profiles?.name || (o.drivers as any)?.profiles?.name || 'N/A',
        bundle_name: (o.bundles as any)?.[0]?.name || (o.bundles as any)?.name || 'Bundle',
        slot_label: (o.slots as any)?.[0]?.slot_label || (o.slots as any)?.slot_label || 'Slot',
        zone_name: (o.slots as any)?.[0]?.zones?.name || (o.slots as any)?.zones?.name || (o.slots as any)?.zones?.[0]?.name || 'Zone',
        status: o.status,
        payment_method: o.payment_method,
        payment_status: o.payment_status,
        total_amount: o.total_amount,
        delivery_address: o.delivery_address,
        created_at: o.created_at,
      })));
    }

    setLoading(false);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;

    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    loadOrders();
  };

  const handleAssignDriver = async (orderId: string) => {
    setAssigningOrderId(orderId);
    setLoadingDrivers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found.');
        setLoadingDrivers(false);
        return;
      }

      const res = await fetch('/api/admin/drivers', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch drivers');
      }

      const { drivers: data } = await res.json();
      if (data) {
        // Filter for only approved drivers
        const approvedDrivers = data.filter((d: any) => d.is_approved === true || d.approval_status === 'approved');
        setAvailableDrivers(approvedDrivers);
      }
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleSelectDriver = async (driverId: string, vanId: string | null) => {
    if (!assigningOrderId) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          driver_id: driverId,
          van_id: vanId,
          status: 'assigned'
        })
        .eq('id', assigningOrderId);

      if (error) throw error;
      setAssigningOrderId(null);
      loadOrders();
    } catch (err) {
      console.error('Error updating order assignment:', err);
      alert('Failed to assign driver. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      pending: { label: '⏳ Pending', color: '#FFA726' },
      confirmed: { label: '✅ Confirmed', color: '#66BB6A' },
      assigned: { label: '📋 Assigned', color: '#42A5F5' },
      picked: { label: '📦 Picked', color: '#AB47BC' },
      out_for_delivery: { label: '🚐 Delivering', color: '#FF7043' },
      delivered: { label: '✅ Delivered', color: '#2E7D32' },
      cancelled: { label: '❌ Cancelled', color: '#EF5350' },
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.ordersPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/admin" className={styles.backLink}>← Back to Dashboard</Link>
            <h1 className={styles.title}>Orders Management</h1>
          </div>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{orders.length}</span>
              <span className={styles.statLabel}>Total Orders</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                ₹{orders.reduce((sum, o) => sum + o.total_amount, 0)}
              </span>
              <span className={styles.statLabel}>Total Revenue</span>
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All Orders
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.filterActive : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'active' ? styles.filterActive : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'delivered' ? styles.filterActive : ''}`}
            onClick={() => setFilter('delivered')}
          >
            Delivered
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'cancelled' ? styles.filterActive : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📦</span>
            <p>No orders found</p>
          </div>
        ) : (
          <div className={styles.ordersTable}>
            {orders.map(order => {
              const badge = getStatusBadge(order.status);
              return (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div className={styles.orderInfo}>
                      <div className={styles.orderId}>Order #{order.id.slice(0, 8)}</div>
                      <div className={styles.orderDate}>
                        {new Date(order.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span
                      className={styles.statusBadge}
                      style={{ background: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className={styles.orderBody}>
                    <div className={styles.orderDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Customer:</span>
                        <span className={styles.detailValue}>{order.customer_name}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Bundle:</span>
                        <span className={styles.detailValue}>{order.bundle_name}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Slot:</span>
                        <span className={styles.detailValue}>{order.slot_label}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Zone:</span>
                        <span className={styles.detailValue}>{order.zone_name}</span>
                      </div>
                      {order.driver_name && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Driver:</span>
                          <span className={styles.detailValue}>{order.driver_name}</span>
                        </div>
                      )}
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Address:</span>
                        <span className={styles.detailValue}>{order.delivery_address}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Payment:</span>
                        <span className={styles.detailValue}>
                          {order.payment_method === 'cod' ? '💵 COD' : '💳 Online'} 
                          ({order.payment_status})
                        </span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Amount:</span>
                        <span className={styles.detailValue}>₹{order.total_amount}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.orderActions}>
                    {(order.status === 'pending' || order.status === 'confirmed') && (order.driver_name === 'N/A' || !order.driver_name) && (
                      <button
                        className={styles.assignBtn}
                        onClick={() => handleAssignDriver(order.id)}
                      >
                        👤 Assign Driver
                      </button>
                    )}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        ❌ Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {assigningOrderId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Select Driver to Assign</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setAssigningOrderId(null)}
              >
                ✕
              </button>
            </div>
            
            {loadingDrivers ? (
              <div className={styles.loadingDriversText}>Loading approved drivers...</div>
            ) : availableDrivers.length === 0 ? (
              <div className={styles.loadingDriversText}>No approved drivers available</div>
            ) : (
              <div className={styles.driverList}>
                {availableDrivers.map((driver) => {
                  const vehicle = Array.isArray(driver.vehicles) ? driver.vehicles[0] : driver.vehicles;
                  const driverName = Array.isArray(driver.profiles) ? driver.profiles[0]?.name : driver.profiles?.name || 'Unknown Driver';
                  return (
                    <div
                      key={driver.id}
                      className={styles.driverCard}
                      onClick={() => handleSelectDriver(driver.id, vehicle?.id || null)}
                    >
                      <div className={styles.driverInfo}>
                        <span className={styles.driverName}>{driverName}</span>
                        <span className={styles.vehicleNumber}>
                          🚐 Vehicle: {vehicle?.vehicle_number || 'No Vehicle Assigned'}
                        </span>
                      </div>
                      <span className={`${styles.statusIndicator} ${driver.is_online ? styles.statusOnlineIndicator : styles.statusOfflineIndicator}`}>
                        {driver.is_online ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
