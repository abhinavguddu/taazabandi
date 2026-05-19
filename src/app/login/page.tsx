'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { sendOTP, verifyOTP, getUserProfile, supabase } from '@/lib/supabase';
import styles from './page.module.css';

type LoginStep = 'phone' | 'otp';
type Role = 'customer' | 'driver' | 'admin';



export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('phone');
  const [role, setRole] = useState<Role>('customer');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOTP = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    setError('');
    

    
    const { error: otpError } = await sendOTP(phone);
    
    if (otpError) {
      setError(otpError.message || 'Failed to send OTP');
      setLoading(false);
      return;
    }
    
    setLoading(false);
    setStep('otp');
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;
    setLoading(true);
    setError('');
    
    try {

      
      // Production mode - real OTP verification
      const { data, error: verifyError } = await verifyOTP(phone, otpCode);
      
      if (verifyError) {
        setError(verifyError.message || 'Invalid OTP');
        setLoading(false);
        return;
      }
      
      if (data.user) {
        // Check if profile exists
        const { data: profile } = await getUserProfile(data.user.id);
        
        let currentRole = role;

        if (!profile) {
          // Create profile
          await supabase.from('profiles').insert({
            id: data.user.id,
            phone: `+91${phone}`,
            role,
            is_verified: true,
          });
          
          // Create customer/driver record
          if (role === 'customer') {
            await supabase.from('customers').insert({ id: data.user.id });
          } else if (role === 'driver') {
            await supabase.from('drivers').insert({ 
              id: data.user.id,
              approval_status: 'pending',
              is_approved: false
            });
          }
        } else {
          // If the profile exists, update their role to the newly selected role
          // This allows 9999999999 to switch between admin, driver, and customer.
          if (profile.role !== role) {
            await supabase.from('profiles').update({ role }).eq('id', data.user.id);
            
            // Ensure the specific role record exists (Customer or Driver)
            if (role === 'customer') {
              const { data: existingCustomer } = await supabase.from('customers').select('id').eq('id', data.user.id).maybeSingle();
              if (!existingCustomer) await supabase.from('customers').insert({ id: data.user.id });
            } else if (role === 'driver') {
              const { data: existingDriver } = await supabase.from('drivers').select('id').eq('id', data.user.id).maybeSingle();
              if (!existingDriver) await supabase.from('drivers').insert({ id: data.user.id, approval_status: 'pending', is_approved: false });
            }
          }
        }
        
        // Redirect based on role
        const routes: Record<Role, string> = {
          customer: '/',
          driver: '/driver/register',
          admin: '/admin',
        };
        router.push(routes[currentRole]);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Login failed: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginLogo}>
          <Image
            src="/images/taazabandi-logo-transparent.png"
            alt="TaazaBandi"
            width={200}
            height={72}
            className={styles.loginLogoImg}
            priority
          />
        </div>

        {error && (
          <div className={styles.errorBanner}>
            ❌ {error}
          </div>
        )}

        {step === 'phone' ? (
          <>
            <h1 className={styles.loginTitle}>Welcome to TaazaBandi</h1>
            <p className={styles.loginSubtitle}>
              Enter your phone number to continue
            </p>
            


            <div className={styles.roleSelector}>
              {([
                { id: 'customer' as Role, icon: '🛒', label: 'Customer' },
                { id: 'driver' as Role, icon: '🚐', label: 'Driver' },
                { id: 'admin' as Role, icon: '⚙️', label: 'Admin' },
              ]).map(r => (
                <button
                  key={r.id}
                  className={`${styles.roleBtn} ${role === r.id ? styles.roleBtnActive : ''}`}
                  onClick={() => setRole(r.id)}
                >
                  <span className={styles.roleIcon}>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Phone Number</label>
              <div className={styles.phoneInput}>
                <span className={styles.countryCode}>+91</span>
                <input
                  type="tel"
                  className={styles.phoneField}
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoFocus
                />
              </div>
            </div>

            <button
              className={styles.submitBtn}
              onClick={handleSendOTP}
              disabled={phone.length !== 10 || loading}
            >
              {loading ? (
                <><div className={styles.spinner} /> Sending OTP...</>
              ) : (
                'Send OTP →'
              )}
            </button>
          </>
        ) : (
          <>
            <button className={styles.backBtn} onClick={() => setStep('phone')}>
              ← Back
            </button>
            <h1 className={styles.loginTitle}>Verify OTP</h1>
            <p className={styles.loginSubtitle}>
              Enter the 6-digit code sent to +91 {phone}
            </p>

            <div className={styles.otpGroup}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={styles.otpBox}
                />
              ))}
            </div>

            <button
              className={styles.submitBtn}
              onClick={handleVerifyOTP}
              disabled={otp.join('').length !== 6 || loading}
            >
              {loading ? (
                <><div className={styles.spinner} /> Verifying...</>
              ) : (
                'Verify & Continue →'
              )}
            </button>

            <div className={styles.resendRow}>
              {countdown > 0 ? (
                <span>Resend OTP in {countdown}s</span>
              ) : (
                <button className={styles.resendBtn} onClick={handleSendOTP}>
                  Resend OTP
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
