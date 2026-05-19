'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import styles from './page.module.css';

interface ActiveOrder {
  id: string;
  bundle_name: string;
  driver_name: string;
  van_number: string;
  queue_position: number;
  total_in_queue: number;
  status: string;
  delivery_address: string;
  lat: number;
  lng: number;
  driver_phone?: string;
}

export default function TrackPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [vanLocation, setVanLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState('Calculating...');
  const [loading, setLoading] = useState(true);
  const vanMarkerRef = useRef<google.maps.Marker | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    loadActiveOrder();
  }, []);

  useEffect(() => {
    if (activeOrder && mapRef.current && !map) {
      initMap();
    }
  }, [activeOrder, map]);

  useEffect(() => {
    if (activeOrder) {
      const channel = supabase
        .channel(`order:${activeOrder.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_locations',
        }, (payload: any) => {
          const newLoc = { lat: payload.new.lat, lng: payload.new.lng };
          setVanLocation(newLoc);
          updateVanMarker(newLoc);
          calculateETA(newLoc);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeOrder]);

  const loadActiveOrder = async () => {
    try {
      const { getUser } = await import('@/lib/supabase');
      const user = await getUser();
      
      if (!user) {
        // Don't redirect to login, just show no order state
        setLoading(false);
        return;
      }

      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          queue_position,
          delivery_address,
          lat,
          lng,
          bundles(name),
          drivers(profiles(name, phone)),
          vehicles(vehicle_number)
        `)
        .eq('customer_id', user.id)
        .in('status', ['assigned', 'picked', 'out_for_delivery'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (orders && orders.length > 0) {
        const order = orders[0];
        setActiveOrder({
          id: order.id,
          bundle_name: (order.bundles as any)?.[0]?.name || (order.bundles as any)?.name || 'Bundle',
          driver_name: (order.drivers as any)?.[0]?.profiles?.name || (order.drivers as any)?.profiles?.name || 'Driver',
          van_number: (order.vehicles as any)?.[0]?.vehicle_number || (order.vehicles as any)?.vehicle_number || 'N/A',
          queue_position: order.queue_position || 1,
          total_in_queue: 12,
          status: order.status,
          delivery_address: order.delivery_address,
          lat: order.lat || 17.4435,
          lng: order.lng || 78.3772,
          driver_phone: (order.drivers as any)?.[0]?.profiles?.phone || (order.drivers as any)?.profiles?.phone || '',
        });

        // Load initial van location
        const driverId = (order.drivers as any)?.[0]?.id || (order.drivers as any)?.id;
        if (driverId) {
          const { data: location } = await supabase
            .from('live_locations')
            .select('*')
            .eq('driver_id', driverId)
            .single();

          if (location) {
            setVanLocation({ lat: location.lat, lng: location.lng });
          }
        }
      }
    } catch (error) {
      console.error('Error loading active order:', error);
    } finally {
      setLoading(false);
    }
  };

  const initMap = async () => {
    if (!activeOrder) return;

    setOptions({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
    } as any);

    const { Map } = await importLibrary('maps');
    const { Marker } = await importLibrary('marker');

    const mapInstance = new Map(mapRef.current!, {
      center: { lat: activeOrder.lat, lng: activeOrder.lng },
      zoom: 14,
      disableDefaultUI: false,
      zoomControl: true,
    });

    setMap(mapInstance);

    // Customer marker
    customerMarkerRef.current = new Marker({
      position: { lat: activeOrder.lat, lng: activeOrder.lng },
      map: mapInstance,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#2E7D32" stroke="white" stroke-width="3"/>
            <text x="20" y="28" font-size="20" text-anchor="middle" fill="white">🏠</text>
          </svg>
        `),
      },
    });

    // Van marker
    if (vanLocation) {
      vanMarkerRef.current = new Marker({
        position: vanLocation,
        map: mapInstance,
        title: 'Delivery Van',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#F57C00" stroke="white" stroke-width="3"/>
              <text x="20" y="28" font-size="20" text-anchor="middle" fill="white">🚐</text>
            </svg>
          `),
        },
      });
    }
  };

  const updateVanMarker = (location: { lat: number; lng: number }) => {
    if (vanMarkerRef.current) {
      vanMarkerRef.current.setPosition(location);
      map?.panTo(location);
    }
  };

  const calculateETA = (vanLoc: { lat: number; lng: number }) => {
    if (!activeOrder) return;
    
    // Simple distance calculation (Haversine formula)
    const R = 6371; // Earth radius in km
    const dLat = (activeOrder.lat - vanLoc.lat) * Math.PI / 180;
    const dLon = (activeOrder.lng - vanLoc.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(vanLoc.lat * Math.PI / 180) * Math.cos(activeOrder.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Assume 20 km/h average speed in city
    const timeInMinutes = Math.round((distance / 20) * 60);
    setEta(`${timeInMinutes} mins`);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!activeOrder) {
    return (
      <div className={styles.noOrder}>
        <div className={styles.noOrderCard}>
          <span className={styles.noOrderIcon}>📦</span>
          <h2>No Active Delivery</h2>
          <p>You don't have any orders out for delivery right now.</p>
          <div className={styles.noOrderActions}>
            <button onClick={() => router.push('/customer/order')} className={styles.orderBtn}>
              Place New Order
            </button>
            <button onClick={() => router.push('/')} className={styles.homeBtn}>
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.trackPage}>
      <div ref={mapRef} className={styles.map} />
      
      <div className={styles.infoPanel}>
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <span className={styles.statusBadge}>
              {activeOrder.status === 'assigned' ? '📋 Assigned' :
               activeOrder.status === 'picked' ? '📦 Picked Up' :
               '🚐 Out for Delivery'}
            </span>
            <span className={styles.queuePosition}>
              Order #{activeOrder.queue_position} of {activeOrder.total_in_queue}
            </span>
          </div>
          
           <div className={styles.etaSection}>
            <div className={styles.etaLabel}>Estimated Arrival</div>
            <div className={styles.etaTime}>{eta}</div>
          </div>

          <div className={styles.vanImageCard}>
            <Image
              src="/images/delivery-van.jpg"
              alt="TaazaBandi Delivery Van"
              width={350}
              height={185}
              className={styles.vanImage}
              style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}
            />
          </div>

          <div className={styles.orderDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Bundle:</span>
              <span className={styles.detailValue}>{activeOrder.bundle_name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Driver:</span>
              <span className={styles.detailValue}>{activeOrder.driver_name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Van:</span>
              <span className={styles.detailValue}>{activeOrder.van_number}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Address:</span>
              <span className={styles.detailValue}>{activeOrder.delivery_address}</span>
            </div>
          </div>

          {activeOrder.driver_phone ? (
            <button className={styles.callBtn} onClick={() => window.location.href = `tel:${activeOrder.driver_phone}`}>
              📞 Call Driver
            </button>
          ) : (
            <button className={styles.callBtn} disabled style={{opacity: 0.6, cursor: 'not-allowed'}}>
              📞 Driver Phone Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
