'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  bundle_name: string;
  slot_label: string;
  payment_method: string;
  delivered_at?: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check for success parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setShowSuccess(true);
      // Remove success param from URL
      window.history.replaceState({}, '', '/customer/orders');
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    try {
      const { getUser } = await import('@/lib/supabase');
      const user = await getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total_amount,
          payment_method,
          delivered_at,
          bundles(name),
          slots(slot_label)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.in('status', ['pending', 'confirmed', 'assigned', 'picked', 'out_for_delivery']);
      } else if (filter === 'delivered') {
        query = query.eq('status', 'delivered');
      }

      const { data } = await query;

      if (data) {
        setOrders(data.map(o => ({
          id: o.id,
          created_at: o.created_at,
          status: o.status,
          total_amount: o.total_amount,
          bundle_name: (o.bundles as any)?.[0]?.name || (o.bundles as any)?.name || 'Bundle',
          slot_label: (o.slots as any)?.[0]?.slot_label || (o.slots as any)?.slot_label || 'Slot',
          payment_method: o.payment_method,
          delivered_at: o.delivered_at,
        })));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      pending: { label: '⏳ Pending', color: '#FFA726' },
      confirmed: { label: '✅ Confirmed', color: '#66BB6A' },
      assigned: { label: '📋 Assigned', color: '#42A5F5' },
      picked: { label: '📦 Picked', color: '#AB47BC' },
      out_for_delivery: { label: '🚐 Out for Delivery', color: '#FF7043' },
      delivered: { label: '✅ Delivered', color: '#2E7D32' },
      cancelled: { label: '❌ Cancelled', color: '#EF5350' },
    };
    return badges[status] || badges.pending;
  };

  const handleReorder = (orderId: string) => {
    router.push(`/customer/order?reorder=${orderId}`);
  };

  if (loading) {
    return <div className={styles.loading}>Loading orders...</div>;
  }

  return (
    <div className={styles.ordersPage}>
      <div className={styles.container}>
        {showSuccess && (
          <div className={styles.successBanner}>
            ✅ Order placed successfully! Your order is being processed.
          </div>
        )}
        
        <div className={styles.header}>
          <h1 className={styles.title}>My Orders</h1>
          <Link href="/customer/order" className={styles.newOrderBtn}>
            + New Order
          </Link>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All Orders
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
        </div>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📦</span>
            <h2>No Orders Yet</h2>
            <p>Start ordering fresh vegetable bundles today!</p>
            <div className={styles.emptyActions}>
              <Link href="/customer/order" className={styles.startBtn}>
                Place Your First Order
              </Link>
              <Link href="/" className={styles.homeLink}>
                Go to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map(order => {
              const badge = getStatusBadge(order.status);
              return (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div>
                      <div className={styles.orderId}>Order #{order.id.slice(0, 8)}</div>
                      <div className={styles.orderDate}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
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
                    <div className={styles.orderInfo}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Bundle:</span>
                        <span className={styles.infoValue}>{order.bundle_name}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Slot:</span>
                        <span className={styles.infoValue}>{order.slot_label}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Payment:</span>
                        <span className={styles.infoValue}>
                          {order.payment_method === 'cod' ? '💵 COD' : '💳 Online'}
                        </span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Total:</span>
                        <span className={styles.infoValue}>₹{order.total_amount}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.orderFooter}>
                    {order.status === 'delivered' ? (
                      <>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleReorder(order.id)}
                        >
                          🔄 Reorder
                        </button>
                        <button className={styles.actionBtn}>
                          ⭐ Rate Order
                        </button>
                      </>
                    ) : ['assigned', 'picked', 'out_for_delivery'].includes(order.status) ? (
                      <Link href="/customer/track" className={styles.trackBtn}>
                        🗺️ Track Order
                      </Link>
                    ) : (
                      <button className={styles.actionBtn}>
                        View Details
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
