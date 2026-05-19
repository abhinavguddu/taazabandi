'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { zones } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import type { Bundle, Slot } from '@/lib/types';
import hero from './page.module.css';
import s from './sections.module.css';

export default function HomePage() {
  const [pincode, setPincode] = useState('500075');
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [todaySlots, setTodaySlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: bundlesData } = await supabase.from('bundles').select('*').eq('is_active', true);
      const { data: slotsData } = await supabase.from('slots').select('*');
      
      if (bundlesData) setBundles(bundlesData);
      if (slotsData) setTodaySlots(slotsData);
      setLoading(false);
    };
    loadData();
  }, []);

  const availableSlots = todaySlots.filter(slot => !slot.is_full);

  return (
    <>
      <Header pincode={pincode} onPincodeChange={setPincode} />

      {/* ═══ HERO SECTION ═══ */}
      <section className={hero.hero}>
        <div className={hero.heroBg}>
          <div className={hero.heroPattern} />
        </div>
        <div className={hero.heroContent}>
          <div className={hero.heroTextArea}>
            <div className={hero.heroPinBadge}>
              <span className="live-dot" />
              Serving Hyderabad — 500075
            </div>
            <h1 className={hero.heroTitle}>
              What's on the menu today?{' '}
              <span className={hero.heroTitleAccent}>Farm Fresh Vegetable</span>{' '}
              Bundles at Your Door
            </h1>
            <p className={hero.heroSubtitle}>
              No cherry-picking, no mandi trips. Choose a pre-packed bundle,
              pick your slot, and our van delivers farm-fresh vegetables
              straight to your doorstep.
            </p>
            <div className={hero.heroCTA}>
              <Link href="/customer/order" className={hero.ctaPrimary}>
                🥬 Order Bundle Now
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <Link href="/customer/track" className={hero.ctaSecondary}>
                🚐 Track Active Van
              </Link>
            </div>
            <div className={hero.heroStats}>
              <div className={hero.heroStat}>
                <span className={hero.heroStatValue}>₹199</span>
                <span className={hero.heroStatLabel}>Starting Price</span>
              </div>
              <div className={hero.heroStat}>
                <span className={hero.heroStatValue}>3</span>
                <span className={hero.heroStatLabel}>Zones Active</span>
              </div>
              <div className={hero.heroStat}>
                <span className={hero.heroStatValue}>30 min</span>
                <span className={hero.heroStatLabel}>Avg. Delivery</span>
              </div>
            </div>
          </div>

          <div className={hero.heroVisual}>
            <div className={hero.heroImageWrap}>
              <Image
                src="/images/hero-vegetables.png"
                alt="Fresh Indian vegetables"
                width={520}
                height={520}
                className={hero.heroImage}
                priority
              />
              <div className={`${hero.floatingCard} ${hero.floatingPrice}`}>
                <div className={`${hero.floatingCardIcon} ${hero.green}`}>🥬</div>
                <div className={hero.floatingCardText}>
                  <span className={hero.floatingCardLabel}>Family Pack</span>
                  <span className={hero.floatingCardValue}>Just ₹299</span>
                </div>
              </div>
              <div className={`${hero.floatingCard} ${hero.floatingDelivery}`}>
                <div className={`${hero.floatingCardIcon} ${hero.orange}`}>🚐</div>
                <div className={hero.floatingCardText}>
                  <span className={hero.floatingCardLabel}>Van arriving in</span>
                  <span className={hero.floatingCardValue}>15 mins</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BUNDLES SECTION ═══ */}
      <section className={s.section} id="bundles">
        <div className={s.sectionInner}>
          <div className={s.sectionHeader}>
            <span className={s.sectionLabel}>🥬 Fresh Bundles</span>
            <h2 className={s.sectionTitle}>Choose Your Bundle</h2>
            <p className={s.sectionSubtitle}>
              Pre-packed with the freshest vegetables. No cherry-picking — just
              farm-fresh quality, guaranteed.
            </p>
          </div>
          <div className={s.bundlesGrid}>
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className={`${s.bundleCard} ${bundle.is_popular ? s.bundlePopular : ''}`}
              >
                {bundle.tag && (
                  <span className={`${s.bundleTag} ${
                    bundle.is_popular ? s.tagPopular :
                    bundle.tag === 'Best Value' ? s.tagValue : s.tagSavings
                  }`}>
                    {bundle.tag}
                  </span>
                )}
                <div className={s.bundleImageWrap}>
                  <Image
                    src={bundle.image_url || '/images/hero-vegetables.png'}
                    alt={bundle.name || 'Bundle'}
                    width={400}
                    height={200}
                    className={s.bundleImage}
                  />
                  <div className={s.bundleImageOverlay} />
                  <div className={s.bundleServes}>
                    👥 {bundle.serves} • {bundle.frequency}
                  </div>
                </div>
                <div className={s.bundleBody}>
                  <h3 className={s.bundleName}>{bundle.name}</h3>
                  <p className={s.bundleDesc}>{bundle.description}</p>
                  <div className={s.bundleVeggies}>
                    {bundle.vegetables.slice(0, 6).map((v, i) => (
                      <span key={i} className={s.vegPill}>
                        {v.icon} {v.quantity}
                      </span>
                    ))}
                    {bundle.vegetables.length > 6 && (
                      <span className={s.vegPill}>
                        +{bundle.vegetables.length - 6} more
                      </span>
                    )}
                  </div>
                  <div className={s.bundleFooter}>
                    <div className={s.bundlePricing}>
                      <span className={s.bundlePrice}>₹{bundle.price}</span>
                      {bundle.original_price && (
                        <span>
                          <span className={s.bundleOriginal}>₹{bundle.original_price}</span>{' '}
                          <span className={s.bundleDiscount}>
                            {Math.round(((bundle.original_price - bundle.price) / bundle.original_price) * 100)}% off
                          </span>
                        </span>
                      )}
                    </div>
                    <Link href={`/customer/order?bundle=${bundle.id}`} className={s.bundleOrderBtn}>
                      Order Now →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className={`${s.section} ${s.howItWorks}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionHeader}>
            <span className={s.sectionLabel}>✨ Simple & Easy</span>
            <h2 className={s.sectionTitle}>How TaazaBandi Works</h2>
            <p className={s.sectionSubtitle}>
              Four simple steps to get the freshest vegetables delivered to your door
            </p>
          </div>
          <div className={s.stepsGrid}>
            {[
              { icon: '📍', title: 'Select Your Zone', desc: 'Enter pincode 500075. We serve Jubilee Hills, Banjara Hills & Madhapur.' },
              { icon: '🥬', title: 'Choose a Bundle', desc: 'Pick from Family Pack (₹299), Single Pack (₹199), or Weekly Mega Pack (₹599).' },
              { icon: '⏰', title: 'Book a Slot', desc: 'Morning (6-9 AM) or Evening (5-8 PM). See live capacity & pick your window.' },
              { icon: '🚐', title: 'Van Delivers', desc: 'Track your van live on the map. Fresh veggies at your door in 15-30 mins.' },
            ].map((step, i) => (
              <div key={i} className={s.stepCard}>
                <span className={s.stepNumber}>{i + 1}</span>
                <div className={s.stepIcon}>{step.icon}</div>
                <h3 className={s.stepTitle}>{step.title}</h3>
                <p className={s.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AVAILABLE SLOTS ═══ */}
      <section className={s.section} id="slots">
        <div className={s.sectionInner}>
          <div className={s.sectionHeader}>
            <span className={s.sectionLabel}>⏰ Today&apos;s Slots</span>
            <h2 className={s.sectionTitle}>Available Delivery Slots</h2>
            <p className={s.sectionSubtitle}>
              Book your preferred time. Slots fill up fast — grab yours now!
            </p>
          </div>
          <div className={s.slotsGrid}>
            {todaySlots.map((slot) => {
              const pct = Math.round((slot.booked_count / slot.total_capacity) * 100);
              return (
                <div key={slot.id} className={`${s.slotCard} ${slot.is_full ? s.slotCardFull : ''}`}>
                  <div className={s.slotHeader}>
                    <div>
                      <div className={s.slotTime}>
                        {slot.slot_type === 'morning' ? '🌅' : '🌇'} {slot.slot_label}
                      </div>
                      <div className={s.slotZone}>{slot.zone_name}</div>
                    </div>
                    <span className={`${s.slotBadge} ${slot.is_full ? s.slotFull : s.slotOpen}`}>
                      {slot.is_full ? 'Full' : 'Open'}
                    </span>
                  </div>
                  <div className={s.slotProgress}>
                    <div className={s.progressBar}>
                      <div
                        className={`${s.progressFill} ${pct > 80 ? s.progressFillHigh : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className={s.slotStats}>
                      <span>{slot.booked_count}/{slot.total_capacity} booked</span>
                      <span>{slot.vans_assigned} vans assigned</span>
                    </div>
                  </div>
                  {!slot.is_full && (
                    <Link href={`/customer/order?slot=${slot.id}`} className={s.slotBookBtn}>
                      Book This Slot →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ VAN BANNER ═══ */}
      <section className={`${s.section} ${s.vanBanner}`}>
        <div className={s.sectionInner}>
          <div className={s.bannerContent}>
            <div className={s.bannerTextArea}>
              <div className={s.bannerBadge}>
                <span className="live-dot" />
                Vans Active Now
              </div>
              <h2 className={s.bannerTitle}>Track Your Van in Real-Time</h2>
              <p className={s.bannerDesc}>
                See exactly where your delivery van is, how many orders are ahead
                of you, and get an accurate ETA. No more guessing!
              </p>
              <Link href="/customer/track" className={s.bannerBtn}>
                🗺️ Open Live Tracker
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
            <div className={s.bannerImageContainer}>
              <Image
                src="/images/delivery-van.jpg"
                alt="TaazaBandi Delivery Van"
                width={500}
                height={260}
                className={s.bannerImage}
                style={{ objectFit: 'cover', borderRadius: 'var(--radius-xl)' }}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
