'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

interface Customer {
  id: string;
  name: string;
  phone: string;
  loyalty_points: number;
  referral_code: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
    loadCustomers();
  }, []);

  const checkAdmin = async () => {
    const session = await getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }
  };

  const loadCustomers = async () => {
    const { data: customersData } = await supabase
      .from('customers')
      .select(`
        id,
        loyalty_points,
        referral_code,
        created_at,
        profiles(name, phone)
      `)
      .order('created_at', { ascending: false });

    if (customersData) {
      const enrichedCustomers = await Promise.all(
        customersData.map(async (c) => {
          const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('customer_id', c.id);

          return {
            id: c.id,
            name: (c.profiles as any)?.name || 'N/A',
            phone: (c.profiles as any)?.phone || 'N/A',
            loyalty_points: c.loyalty_points,
            referral_code: c.referral_code,
            total_orders: orders?.length || 0,
            total_spent: orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0,
            created_at: c.created_at,
          };
        })
      );

      setCustomers(enrichedCustomers);
    }

    setLoading(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href="/admin" className={styles.backLink}>← Back to Dashboard</Link>
            <h1 className={styles.title}>👥 Customers Management</h1>
          </div>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{customers.length}</div>
              <div className={styles.statLabel}>Total Customers</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                ₹{customers.reduce((sum, c) => sum + c.total_spent, 0).toLocaleString()}
              </div>
              <div className={styles.statLabel}>Total Revenue</div>
            </div>
          </div>
        </div>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="🔍 Search by name, phone, or referral code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Loyalty Points</th>
                <th>Referral Code</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className={styles.customerName}>{customer.name}</div>
                  </td>
                  <td>{customer.phone}</td>
                  <td>
                    <span className={styles.orderBadge}>{customer.total_orders}</span>
                  </td>
                  <td>
                    <span className={styles.amountText}>₹{customer.total_spent.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className={styles.pointsBadge}>⭐ {customer.loyalty_points}</span>
                  </td>
                  <td>
                    <span className={styles.referralCode}>{customer.referral_code}</span>
                  </td>
                  <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              <p>No customers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
