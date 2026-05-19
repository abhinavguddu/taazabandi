'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import styles from './Header.module.css';

import type { Zone } from '@/lib/types';

interface HeaderProps {
  pincode?: string;
  onPincodeChange?: (pincode: string) => void;
}

export default function Header({ pincode: externalPincode, onPincodeChange }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');
  const [internalPincode, setInternalPincode] = useState('500075');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const currentPincode = externalPincode !== undefined ? externalPincode : internalPincode;



  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Check initial session
    checkUser();
    
    // Fetch available zones
    const fetchZones = async () => {
      const { data } = await supabase.from('zones').select('*').eq('is_active', true);
      if (data) setAvailableZones(data);
    };
    fetchZones();

    // Listen for auth state changes (Supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      checkUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { getSession } = await import('@/lib/supabase');
      const session = await getSession();
      
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', session.user.id)
            .single();
          
          setUser({
            ...session.user,
            name: profile?.name || session.user.user_metadata?.name || (session.user as any).name || session.user.phone,
            role: profile?.role || session.user.user_metadata?.role || (session.user as any).role
          });
          
          const savedPincode = session.user.user_metadata?.pincode;
          if (savedPincode) {
            setInternalPincode(savedPincode);
            if (onPincodeChange) onPincodeChange(savedPincode);
          }
        } catch (err) {
          setUser(session.user);
          const savedPincode = session.user.user_metadata?.pincode;
          if (savedPincode) {
            setInternalPincode(savedPincode);
            if (onPincodeChange) onPincodeChange(savedPincode);
          }
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Error checking user:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { signOut } = await import('@/lib/supabase');
      await signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setUser(null);
    window.location.href = '/';
  };

  const handlePincodeSubmit = async (value: string) => {
    const validZone = availableZones.find(z => z.pincode === value);
    if (validZone) {
      if (onPincodeChange) onPincodeChange(value);
      setInternalPincode(value);
      
      // Save to Supabase
      if (user) {
        await supabase.auth.updateUser({ data: { pincode: value } });
      }
      
      setShowPincodeModal(false);
      setPincodeInput('');
    }
  };

  const getPincodeDisplayName = () => {
    const zone = availableZones.find(z => z.pincode === currentPincode);
    return zone ? `${zone.name}, Hyderabad` : 'Select Location';
  };

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.headerInner}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <Image
              src="/images/taazabandi-logo-transparent.png"
              alt="TaazaBandi"
              width={160}
              height={52}
              className={styles.logoImg}
              priority
            />
          </Link>

          {/* Location Selector */}
          <button
            className={styles.locationBtn}
            onClick={() => setShowPincodeModal(true)}
          >
            <div className={styles.locationIcon}>📍</div>
            <div className={styles.locationText}>
              <span className={styles.locationLabel}>
                <span className={styles.boltEmoji}>⚡</span>
                Delivering to
              </span>
              <span className={styles.locationValue}>
                {getPincodeDisplayName()}
                <svg className={styles.chevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </div>
          </button>

          {/* Search */}
          <div className={styles.searchBar}>
            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search bundles, vegetables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/customer/track" className={styles.navLink}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span className={styles.navLinkText}>Track Van</span>
            </Link>

            <Link href="/customer/orders" className={styles.navLink}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span className={styles.navLinkText}>Orders</span>
            </Link>

            {!loading && (
              user ? (
                <div className={styles.userMenu}>
                  <span className={styles.userName}>{user.name || user.phone}</span>
                  <button onClick={handleLogout} className={styles.logoutBtn}>
                    Logout
                  </button>
                </div>
              ) : (
                <Link href="/login" className={styles.authBtn}>
                  Login
                </Link>
              )
            )}

            {/* Mobile Menu Toggle */}
            <button
              className={styles.menuToggle}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <Link href="/" className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
              🏠 Home
            </Link>
            <Link href="/customer/order" className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
              🥬 Browse Bundles
            </Link>
            <Link href="/customer/track" className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
              🚐 Track Van
            </Link>
            <Link href="/customer/orders" className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
              📋 My Orders
            </Link>
            <Link href="/customer/profile" className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
              👤 Profile
            </Link>
            <Link href="/login" className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
              🔑 Login / Sign Up
            </Link>
          </div>
        )}
      </header>

      {/* Pincode Modal */}
      {showPincodeModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPincodeModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>📍 Select Delivery Area</h3>
            <p className={styles.modalSubtext}>Enter your pincode to check service availability</p>
            <input
              type="text"
              className={`${styles.modalInput} ${pincodeInput.length === 6 && !availableZones.find(z => z.pincode === pincodeInput) ? styles.inputError : ''}`}
              placeholder="Enter pincode"
              maxLength={6}
              value={pincodeInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPincodeInput(val);
                if (val.length === 6) handlePincodeSubmit(val);
              }}
              autoFocus
            />
            {pincodeInput.length === 6 && !availableZones.find(z => z.pincode === pincodeInput) && (
              <p className={styles.errorMessage}>❌ Service not available in this area yet</p>
            )}
            <div className={styles.serviceAreas}>
              <p>Available Service Areas:</p>
              <div className={styles.areaChips}>
                {availableZones.map(zone => (
                  <button key={zone.id} className={styles.areaChip} onClick={() => handlePincodeSubmit(zone.pincode)}>
                    {zone.pincode} — {zone.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
