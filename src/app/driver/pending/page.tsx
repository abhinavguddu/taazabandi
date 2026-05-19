'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

export default function DriverPendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkApprovalStatus();
    
    // Poll every 10 seconds
    const interval = setInterval(checkApprovalStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkApprovalStatus = async () => {
    const session = await getSession();
    const user = session?.user;
    
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: driver, error } = await supabase
      .from('drivers')
      .select('approval_status, is_approved')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking approval status:', error);
      setLoading(false);
      return;
    }

    if (driver) {
      setStatus(driver.approval_status);
      
      if (driver.is_approved && driver.approval_status === 'approved') {
        router.push('/driver');
      }
    } else {
      // Driver record doesn't exist, redirect to registration
      router.push('/driver/register');
    }
    
    setLoading(false);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.pendingPage}>
      <div className={styles.container}>
        {status === 'pending' && (
          <div className={styles.statusCard}>
            <div className={styles.iconPending}>⏳</div>
            <h1 className={styles.title}>Application Under Review</h1>
            <p className={styles.message}>
              Your driver registration is being reviewed by our team. This usually takes 24-48 hours.
            </p>
            <div className={styles.timeline}>
              <div className={`${styles.timelineItem} ${styles.done}`}>
                <div className={styles.timelineIcon}>✅</div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Application Submitted</div>
                  <div className={styles.timelineDesc}>Your documents have been received</div>
                </div>
              </div>
              <div className={`${styles.timelineItem} ${styles.active}`}>
                <div className={styles.timelineIcon}>🔍</div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Verification in Progress</div>
                  <div className={styles.timelineDesc}>We're verifying your documents</div>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineIcon}>📋</div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Approval Pending</div>
                  <div className={styles.timelineDesc}>Final approval from admin</div>
                </div>
              </div>
            </div>
            <div className={styles.infoBox}>
              <strong>What happens next?</strong>
              <ul>
                <li>Admin will verify your documents</li>
                <li>You'll receive a notification once approved</li>
                <li>After approval, you can start accepting deliveries</li>
              </ul>
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div className={styles.statusCard}>
            <div className={styles.iconRejected}>❌</div>
            <h1 className={styles.title}>Application Rejected</h1>
            <p className={styles.message}>
              Unfortunately, your driver application has been rejected. This could be due to incomplete or invalid documents.
            </p>
            <div className={styles.infoBox}>
              <strong>Common reasons for rejection:</strong>
              <ul>
                <li>Invalid or expired documents</li>
                <li>Unclear document photos</li>
                <li>Incorrect vehicle information</li>
                <li>Missing required documents</li>
              </ul>
            </div>
            <button className={styles.retryBtn} onClick={() => router.push('/driver/register')}>
              Re-apply with Correct Documents
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
