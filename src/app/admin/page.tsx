'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

interface Metrics {
  active_orders: number;
  online_drivers: number;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  total_customers: number;
  total_bundles: number;
  total_zones: number;
  pending_drivers: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const session = await getSession();
    const user = session?.user;
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const userRole = profile?.role;

    if (userRole !== 'admin') {
      router.push('/');
      return;
    }

    // Load all metrics
    const [
      activeOrders,
      onlineDrivers,
      todayOrders,
      weekOrders,
      monthOrders,
      customers,
      bundles,
      zones,
      pendingDrivers
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'assigned', 'picked', 'out_for_delivery']),
      supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('orders').select('total_amount').gte('created_at', new Date().toISOString().split('T')[0]),
      supabase.from('orders').select('total_amount').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('orders').select('total_amount').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('bundles').select('*', { count: 'exact', head: true }),
      supabase.from('zones').select('*', { count: 'exact', head: true }),
      supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending')
    ]);

    setMetrics({
      active_orders: activeOrders.count || 0,
      online_drivers: onlineDrivers.count || 0,
      revenue_today: todayOrders.data?.reduce((sum, o) => sum + o.total_amount, 0) || 0,
      revenue_week: weekOrders.data?.reduce((sum, o) => sum + o.total_amount, 0) || 0,
      revenue_month: monthOrders.data?.reduce((sum, o) => sum + o.total_amount, 0) || 0,
      total_customers: customers.count || 0,
      total_bundles: bundles.count || 0,
      total_zones: zones.count || 0,
      pending_drivers: pendingDrivers.count || 0,
    });

    setLoading(false);
  };

  if (loading) {
    return <div className={styles.loading}>Loading dashboard...</div>;
  }

  const quickActions = [
    { icon: '🥬', label: 'Manage Bundles', href: '/admin/bundles', color: '#4CAF50' },
    { icon: '📍', label: 'Manage Zones', href: '/admin/zones', color: '#2196F3' },
    { icon: '📦', label: 'View Orders', href: '/admin/orders', color: '#FF9800' },
    { icon: '🚐', label: 'Manage Drivers', href: '/admin/drivers', color: '#9C27B0' },
    { icon: '🌿', label: 'Manage Add-ons', href: '/admin/addons', color: '#00BCD4' },
    { icon: '🎟️', label: 'Manage Coupons', href: '/admin/coupons', color: '#E91E63' },
    { icon: '👥', label: 'View Customers', href: '/admin/customers', color: '#607D8B' },
    { icon: '⚙️', label: 'Site Settings', href: '/admin/settings', color: '#795548' },
  ];

  return (
    <div className={styles.adminDashboard}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🎛️ Admin Dashboard</h1>
            <p className={styles.subtitle}>TaazaBandi Management Console</p>
          </div>
          <Link href="/" className={styles.viewSiteBtn}>
            🌐 View Site
          </Link>
        </div>

        {/* Revenue Cards */}
        {metrics && (
          <>
            <div className={styles.revenueSection}>
              <h2 className={styles.sectionTitle}>💰 Revenue Overview</h2>
              <div className={styles.revenueGrid}>
                <div className={styles.revenueCard}>
                  <div className={styles.revenueLabel}>Today</div>
                  <div className={styles.revenueValue}>₹{metrics.revenue_today.toLocaleString()}</div>
                  <div className={styles.revenueChange}>+12% from yesterday</div>
                </div>
                <div className={styles.revenueCard}>
                  <div className={styles.revenueLabel}>This Week</div>
                  <div className={styles.revenueValue}>₹{metrics.revenue_week.toLocaleString()}</div>
                  <div className={styles.revenueChange}>+8% from last week</div>
                </div>
                <div className={styles.revenueCard}>
                  <div className={styles.revenueLabel}>This Month</div>
                  <div className={styles.revenueValue}>₹{metrics.revenue_month.toLocaleString()}</div>
                  <div className={styles.revenueChange}>+15% from last month</div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className={styles.metricsSection}>
              <h2 className={styles.sectionTitle}>📊 Key Metrics</h2>
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: '#FF9800' }}>📦</div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricValue}>{metrics.active_orders}</div>
                    <div className={styles.metricLabel}>Active Orders</div>
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: '#9C27B0' }}>🚐</div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricValue}>{metrics.online_drivers}</div>
                    <div className={styles.metricLabel}>Online Drivers</div>
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: '#607D8B' }}>👥</div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricValue}>{metrics.total_customers}</div>
                    <div className={styles.metricLabel}>Total Customers</div>
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: '#4CAF50' }}>🥬</div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricValue}>{metrics.total_bundles}</div>
                    <div className={styles.metricLabel}>Active Bundles</div>
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: '#2196F3' }}>📍</div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricValue}>{metrics.total_zones}</div>
                    <div className={styles.metricLabel}>Service Zones</div>
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: '#F44336' }}>⏳</div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricValue}>{metrics.pending_drivers}</div>
                    <div className={styles.metricLabel}>Pending Approvals</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className={styles.actionsSection}>
          <h2 className={styles.sectionTitle}>⚡ Quick Actions</h2>
          <div className={styles.actionsGrid}>
            {quickActions.map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className={styles.actionCard}
                style={{ borderColor: action.color }}
              >
                <div className={styles.actionIcon} style={{ background: action.color }}>
                  {action.icon}
                </div>
                <div className={styles.actionLabel}>{action.label}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {metrics && metrics.pending_drivers > 0 && (
          <div className={styles.alertsSection}>
            <div className={styles.alert}>
              <div className={styles.alertIcon}>⚠️</div>
              <div className={styles.alertContent}>
                <div className={styles.alertTitle}>Pending Driver Approvals</div>
                <div className={styles.alertText}>
                  You have {metrics.pending_drivers} driver(s) waiting for approval
                </div>
              </div>
              <Link href="/admin/drivers" className={styles.alertBtn}>
                Review Now →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
