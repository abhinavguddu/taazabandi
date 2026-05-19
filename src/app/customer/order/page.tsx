'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { initiatePayment, isPaymentBypassed } from '@/lib/payment';
import type { Bundle, AddOn, Slot } from '@/lib/types';
import styles from './page.module.css';

function OrderPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<'slot' | 'bundle' | 'addons' | 'confirm'>('slot');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [loading, setLoading] = useState(false);
  
  const [dbBundles, setDbBundles] = useState<Bundle[]>([]);
  const [dbAddOns, setDbAddOns] = useState<AddOn[]>([]);
  const [dbSlots, setDbSlots] = useState<Slot[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: b } = await supabase.from('bundles').select('*').eq('is_active', true);
      const { data: a } = await supabase.from('add_ons').select('*').eq('is_available', true);
      const { data: s } = await supabase.from('slots').select('*, zones(name)');
      
      const bundlesData = b || [];
      const slotsData = (s || []).map((slot: any) => ({
        ...slot,
        zone_name: slot.zones?.name || 'N/A'
      }));
      
      setDbBundles(bundlesData);
      setDbAddOns(a || []);
      setDbSlots(slotsData);
      
      const bundleId = searchParams.get('bundle');
      const slotId = searchParams.get('slot');
      
      if (bundleId && bundlesData.length > 0) {
        // Also support old string IDs for backward compatibility if possible, or exact match
        const bundle = bundlesData.find((x: any) => x.id === bundleId);
        if (bundle) {
          setSelectedBundle(bundle);
          setStep('slot');
        }
      }
      
      if (slotId && slotsData.length > 0) {
        const slot = slotsData.find((x: any) => x.id === slotId);
        if (slot) {
          setSelectedSlot(slot);
          setStep('bundle');
        }
      }
    };
    
    fetchData();
  }, [searchParams]);

  const handleSlotSelect = (slot: Slot) => {
    if (slot.is_full) return;
    setSelectedSlot(slot);
    setStep('bundle');
  };

  const handleBundleSelect = (bundle: Bundle) => {
    setSelectedBundle(bundle);
    setStep('addons');
  };

  const toggleAddOn = (addon: AddOn) => {
    setSelectedAddOns(prev => 
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);

  const calculateSubtotal = () => {
    const bundlePrice = selectedBundle?.price || 0;
    const addOnsPrice = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    return bundlePrice + addOnsPrice;
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = calculateSubtotal();
    if (appliedCoupon.type === 'fixed') {
      return Math.min(appliedCoupon.value, subtotal);
    } else {
      const percentageDiscount = (subtotal * appliedCoupon.value) / 100;
      if (appliedCoupon.max_discount) {
        return Math.min(percentageDiscount, appliedCoupon.max_discount);
      }
      return percentageDiscount;
    }
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - calculateDiscount());
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    setCouponError('');
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setCouponError('Invalid coupon code.');
        setAppliedCoupon(null);
        return;
      }

      // Check validation date
      if (data.valid_till && new Date(data.valid_till) < new Date()) {
        setCouponError('This coupon has expired.');
        setAppliedCoupon(null);
        return;
      }

      // Check usage limits
      if (data.used_count >= data.usage_limit) {
        setCouponError('Coupon limit reached.');
        setAppliedCoupon(null);
        return;
      }

      // Check minimum order amount
      const subtotal = calculateSubtotal();
      if (subtotal < data.min_order_amount) {
        setCouponError(`Min order amount of ₹${data.min_order_amount} required.`);
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(data);
      setCouponError('');
    } catch (err: any) {
      setCouponError('Error applying coupon.');
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handlePlaceOrder = async () => {
    if (!selectedSlot || !selectedBundle || !address) return;
    
    setLoading(true);
    
    try {
      const { getUser } = await import('@/lib/supabase');
      const user = await getUser();
      
      if (!user) {
        alert('Please login to place order');
        router.push('/login');
        return;
      }

      const subtotal = calculateSubtotal();
      const discount = calculateDiscount();
      const totalAmount = calculateTotal();

      // Create order first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          slot_id: selectedSlot.id,
          bundle_id: selectedBundle.id,
          add_on_ids: selectedAddOns.map(a => a.id),
          status: 'pending',
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: 'pending',
          delivery_address: address,
          special_instructions: instructions,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          discount_amount: discount,
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error('Order creation error:', orderError);
        alert('Order creation failed: ' + orderError?.message);
        setLoading(false);
        return;
      }

      // Increment coupon used count if coupon was applied
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ used_count: appliedCoupon.used_count + 1 })
          .eq('id', appliedCoupon.id);
      }

      // Handle payment
      if (paymentMethod === 'razorpay' && !paymentBypassEnabled) {
        // Get user profile for payment details
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', user.id)
          .single();

        const paymentResult = await initiatePayment({
          amount: totalAmount,
          orderId: order.id,
          customerName: profile?.name || 'Customer',
          customerPhone: profile?.phone || '',
        });

        if (!paymentResult.success) {
          // Payment failed - cancel order
          await supabase
            .from('orders')
            .update({ status: 'cancelled', payment_status: 'failed' })
            .eq('id', order.id);
          
          alert('Payment failed: ' + paymentResult.error);
          setLoading(false);
          return;
        }

        // Payment successful - update order
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
          })
          .eq('id', order.id);
      } else {
        // COD or payment bypassed - just confirm order
        await supabase
          .from('orders')
          .update({ 
            status: 'confirmed',
            payment_status: paymentMethod === 'cod' ? 'pending' : 'paid'
          })
          .eq('id', order.id);
      }

      // Update slot booked count
      await supabase.from('slots').update({
        booked_count: selectedSlot.booked_count + 1,
        is_full: selectedSlot.booked_count + 1 >= selectedSlot.total_capacity,
      }).eq('id', selectedSlot.id);

      setLoading(false);
      
      // Success - redirect to orders page
      router.push('/customer/orders?success=true');
    } catch (error: any) {
      console.error('Order placement error:', error);
      alert('Failed to place order: ' + error.message);
      setLoading(false);
    }
  };

  const paymentBypassEnabled = isPaymentBypassed();

  return (
    <div className={styles.orderPage}>
      <div className={styles.orderContainer}>
        {/* Progress Bar */}
        <div className={styles.progressBar}>
          {['slot', 'bundle', 'addons', 'confirm'].map((s, i) => (
            <div key={s} className={`${styles.progressStep} ${
              step === s ? styles.progressActive : 
              ['slot', 'bundle', 'addons', 'confirm'].indexOf(step) > i ? styles.progressDone : ''
            }`}>
              <div className={styles.progressCircle}>{i + 1}</div>
              <span className={styles.progressLabel}>
                {s === 'slot' ? 'Slot' : s === 'bundle' ? 'Bundle' : s === 'addons' ? 'Add-ons' : 'Confirm'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Slot Selection */}
        {step === 'slot' && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>📅 Select Delivery Slot</h2>
            <div className={styles.slotsGrid}>
              {dbSlots.map(slot => (
                <div
                  key={slot.id}
                  className={`${styles.slotCard} ${slot.is_full ? styles.slotFull : ''} ${
                    selectedSlot?.id === slot.id ? styles.slotSelected : ''
                  }`}
                  onClick={() => handleSlotSelect(slot)}
                >
                  <div className={styles.slotHeader}>
                    <span className={styles.slotTime}>
                      {slot.slot_type === 'morning' ? '🌅' : '🌇'} {slot.slot_label}
                    </span>
                    <span className={`${styles.slotBadge} ${slot.is_full ? styles.badgeFull : styles.badgeOpen}`}>
                      {slot.is_full ? 'Full' : 'Open'}
                    </span>
                  </div>
                  <div className={styles.slotZone}>{slot.zone_name}</div>
                  <div className={styles.slotCapacity}>
                    {slot.booked_count}/{slot.total_capacity} booked
                  </div>
                </div>
              ))}
            </div>
            {selectedSlot && (
              <button className={styles.nextBtn} onClick={() => setStep('bundle')}>
                Continue to Bundles →
              </button>
            )}
          </div>
        )}

        {/* Step 2: Bundle Selection */}
        {step === 'bundle' && (
          <div className={styles.stepContent}>
            <button className={styles.backBtn} onClick={() => setStep('slot')}>← Back</button>
            <h2 className={styles.stepTitle}>🥬 Choose Your Bundle</h2>
            <div className={styles.bundlesGrid}>
              {dbBundles.map(bundle => (
                <div
                  key={bundle.id}
                  className={`${styles.bundleCard} ${selectedBundle?.id === bundle.id ? styles.bundleSelected : ''}`}
                  onClick={() => handleBundleSelect(bundle)}
                >
                  <Image src={bundle.image_url || '/images/hero-vegetables.png'} alt={bundle.name || 'Bundle'} width={300} height={150} className={styles.bundleImg} />
                  <div className={styles.bundleInfo}>
                    <h3 className={styles.bundleName}>{bundle.name}</h3>
                    <p className={styles.bundleDesc}>{bundle.description}</p>
                    <div className={styles.bundlePrice}>₹{bundle.price}</div>
                  </div>
                </div>
              ))}
            </div>
            {selectedBundle && (
              <button className={styles.nextBtn} onClick={() => setStep('addons')}>
                Continue to Add-ons →
              </button>
            )}
          </div>
        )}

        {/* Step 3: Add-ons */}
        {step === 'addons' && (
          <div className={styles.stepContent}>
            <button className={styles.backBtn} onClick={() => setStep('bundle')}>← Back</button>
            <h2 className={styles.stepTitle}>🌿 Add Extra Items (Optional)</h2>
            <div className={styles.addonsGrid}>
              {dbAddOns.map(addon => (
                <div
                  key={addon.id}
                  className={`${styles.addonCard} ${selectedAddOns.find(a => a.id === addon.id) ? styles.addonSelected : ''}`}
                  onClick={() => toggleAddOn(addon)}
                >
                  <span className={styles.addonIcon}>{addon.icon}</span>
                  <div className={styles.addonInfo}>
                    <div className={styles.addonName}>{addon.name}</div>
                    <div className={styles.addonUnit}>{addon.unit}</div>
                  </div>
                  <div className={styles.addonPrice}>₹{addon.price}</div>
                </div>
              ))}
            </div>
            <button className={styles.nextBtn} onClick={() => setStep('confirm')}>
              Continue to Confirm →
            </button>
          </div>
        )}

        {/* Step 4: Confirm Order */}
        {step === 'confirm' && (
          <div className={styles.stepContent}>
            <button className={styles.backBtn} onClick={() => setStep('addons')}>← Back</button>
            <h2 className={styles.stepTitle}>✅ Confirm Your Order</h2>
            
            {paymentBypassEnabled && (
              <div className={styles.devBanner}>
                🔧 <strong>Development Mode:</strong> Payment gateway is bypassed. Orders will be auto-confirmed.
              </div>
            )}

            <div className={styles.orderSummary}>
              <h3>Order Summary</h3>
              <div className={styles.summaryItem}>
                <span>Slot:</span>
                <span>{selectedSlot?.slot_label} - {selectedSlot?.zone_name}</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Bundle:</span>
                <span>{selectedBundle?.name} (₹{selectedBundle?.price})</span>
              </div>
              {selectedAddOns.length > 0 && (
                <div className={styles.summaryItem}>
                  <span>Add-ons:</span>
                  <span>{selectedAddOns.map(a => a.name).join(', ')} (₹{selectedAddOns.reduce((s, a) => s + a.price, 0)})</span>
                </div>
              )}
              
              <div className={styles.summarySeparator} />
              
              <div className={styles.summaryItem}>
                <span>Subtotal:</span>
                <span>₹{calculateSubtotal()}</span>
              </div>
              
              {appliedCoupon && (
                <div className={`${styles.summaryItem} ${styles.discountText}`}>
                  <span>Discount ({appliedCoupon.code}):</span>
                  <span>-₹{calculateDiscount()}</span>
                </div>
              )}

              <div className={`${styles.summaryItem} ${styles.summaryTotal}`}>
                <span>Total:</span>
                <span>₹{calculateTotal()}</span>
              </div>
            </div>

            {/* Coupon Code Section */}
            <div className={styles.couponContainer}>
              <label className={styles.couponLabel}>🏷️ Promo Code / Coupon</label>
              <div className={styles.couponInputGroup}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter Coupon Code (e.g., TAAZA50)"
                  className={styles.couponInput}
                  disabled={!!appliedCoupon || applying}
                />
                {appliedCoupon ? (
                  <button onClick={handleRemoveCoupon} className={styles.couponRemoveBtn}>
                    Remove
                  </button>
                ) : (
                  <button 
                    onClick={handleApplyCoupon} 
                    className={styles.couponApplyBtn}
                    disabled={!couponCode.trim() || applying}
                  >
                    {applying ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </div>
              {couponError && <p className={styles.couponError}>{couponError}</p>}
              {appliedCoupon && (
                <p className={styles.couponSuccess}>
                  🎉 Code <strong>{appliedCoupon.code}</strong> applied! Saved <strong>₹{calculateDiscount()}</strong>.
                </p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Delivery Address *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your complete address"
                rows={3}
                className={styles.textarea}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Special Instructions (Optional)</label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., Ring the bell twice"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Payment Method</label>
              <div className={styles.paymentOptions}>
                <button
                  className={`${styles.paymentBtn} ${paymentMethod === 'cod' ? styles.paymentActive : ''}`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  💵 Cash on Delivery
                </button>
                <button
                  className={`${styles.paymentBtn} ${paymentMethod === 'razorpay' ? styles.paymentActive : ''}`}
                  onClick={() => setPaymentMethod('razorpay')}
                >
                  💳 Pay Online {paymentBypassEnabled && '(Bypassed)'}
                </button>
              </div>
            </div>

            <button
              className={styles.placeOrderBtn}
              onClick={handlePlaceOrder}
              disabled={!address || loading}
            >
              {loading ? 'Processing...' : `Place Order - ₹${calculateTotal()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderPageContent />
    </Suspense>
  );
}
