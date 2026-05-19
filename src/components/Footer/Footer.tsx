'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Zone } from '@/lib/types';
import styles from './Footer.module.css';

export default function Footer() {
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    const fetchZones = async () => {
      const { data } = await supabase.from('zones').select('*').eq('is_active', true);
      if (data) setZones(data);
    };
    fetchZones();
  }, []);

  return (
    <footer className={styles.footer}>
      <div className={styles.sectionInner}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Image 
              src="/images/taazabandi-logo-original.png" 
              alt="TaazaBandi" 
              width={100} 
              height={100} 
              unoptimized
              style={{ objectFit: 'contain' }} 
            />
            <p>Skip the mandi. Farm-fresh vegetable bundles delivered by zone-based vans in Hyderabad. No cherry-picking, just quality.</p>
          </div>
          <div>
            <h4 className={styles.footerTitle}>Quick Links</h4>
            <Link href="/customer/order" className={styles.footerLink}>Browse Bundles</Link>
            <Link href="/customer/track" className={styles.footerLink}>Track Van</Link>
            <Link href="/customer/orders" className={styles.footerLink}>My Orders</Link>
            <Link href="/login" className={styles.footerLink}>Login / Sign Up</Link>
          </div>
          <div>
            <h4 className={styles.footerTitle}>For Partners</h4>
            <Link href="/driver/register" className={styles.footerLink}>Become a Driver</Link>
            <Link href="/admin" className={styles.footerLink}>Admin Panel</Link>
          </div>
          <div>
            <h4 className={styles.footerTitle}>Service Areas</h4>
            {zones.map(z => (
              <span key={z.id} className={styles.footerLink}>{z.name}</span>
            ))}
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} TaazaBandi. All rights reserved.</span>
          <span>Made with <span className={styles.footerHeart}>♥</span> in Hyderabad</span>
        </div>
      </div>
    </footer>
  );
}
