'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getSession } from '@/lib/supabase';
import styles from './page.module.css';

export default function DriverRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'personal' | 'documents' | 'vehicle'>('personal');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkDriverStatus();
  }, []);

  const checkDriverStatus = async () => {
    const session = await getSession();
    const user = session?.user;
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: driver } = await supabase
      .from('drivers')
      .select('is_approved, approval_status')
      .eq('id', user.id)
      .maybeSingle();

    if (driver) {
      if (driver.approval_status === 'approved') {
        router.push('/driver');
      } else if (driver.approval_status === 'pending') {
        router.push('/driver/pending');
      }
      // If rejected, let them stay on this page to re-apply
    }
  };
  
  // Personal Info
  const [name, setName] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  // Documents
  const [aadharPhoto, setAadharPhoto] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  
  // Vehicle Info
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'tata_ace' | 'mahindra' | 'maruti' | 'other'>('tata_ace');
  const [capacityKg, setCapacityKg] = useState('500');
  const [rcPhoto, setRcPhoto] = useState<File | null>(null);
  const [insuranceValidTill, setInsuranceValidTill] = useState('');

  const uploadFile = async (file: File, path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('driver-documents')
        .upload(path, file);
      
      if (error) {
        console.warn('Upload error:', error.message);
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(path);
      
      return publicUrl;
    } catch (err) {
      console.error('Failed to upload file:', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const session = await getSession();
      const user = session?.user;
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Upload documents
      const aadharUrl = aadharPhoto ? await uploadFile(aadharPhoto, `${user.id}/aadhar_${Date.now()}.jpg`) : null;
      const licenseUrl = licensePhoto ? await uploadFile(licensePhoto, `${user.id}/license_${Date.now()}.jpg`) : null;
      const rcUrl = rcPhoto ? await uploadFile(rcPhoto, `${user.id}/rc_${Date.now()}.jpg`) : null;

      // Call API route instead of direct Supabase call
      const response = await fetch('/api/driver/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name,
          aadharNumber,
          panNumber,
          licenseNumber,
          aadharPhotoUrl: aadharUrl,
          licensePhotoUrl: licenseUrl,
          vehicleNumber,
          vehicleType,
          capacityKg,
          rcPhotoUrl: rcUrl,
          insuranceValidTill,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Success - redirect to pending page
      router.push('/driver/pending');
    } catch (error: any) {
      console.error('Registration error:', error);
      alert('Registration failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>🚐 Driver Registration</h1>
          <p className={styles.subtitle}>Join TaazaBandi delivery team</p>
        </div>

        {/* Progress Steps */}
        <div className={styles.progressBar}>
          <div className={`${styles.progressStep} ${step === 'personal' ? styles.active : styles.done}`}>
            <div className={styles.progressCircle}>1</div>
            <span>Personal Info</span>
          </div>
          <div className={`${styles.progressStep} ${step === 'documents' ? styles.active : step === 'vehicle' ? styles.done : ''}`}>
            <div className={styles.progressCircle}>2</div>
            <span>Documents</span>
          </div>
          <div className={`${styles.progressStep} ${step === 'vehicle' ? styles.active : ''}`}>
            <div className={styles.progressCircle}>3</div>
            <span>Vehicle Info</span>
          </div>
        </div>

        {/* Step 1: Personal Info */}
        {step === 'personal' && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Personal Information</h2>
            
            <div className={styles.formGroup}>
              <label>Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Aadhar Number *</label>
              <input
                type="text"
                value={aadharNumber}
                onChange={(e) => setAadharNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="Enter 12-digit Aadhar number"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>PAN Number (Optional)</label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="Enter PAN number"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Driving License Number *</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                placeholder="Enter license number"
                className={styles.input}
              />
            </div>

            <button
              className={styles.nextBtn}
              onClick={() => setStep('documents')}
              disabled={!name || !aadharNumber || !licenseNumber}
            >
              Continue to Documents →
            </button>
          </div>
        )}

        {/* Step 2: Documents */}
        {step === 'documents' && (
          <div className={styles.stepContent}>
            <button className={styles.backBtn} onClick={() => setStep('personal')}>← Back</button>
            <h2 className={styles.stepTitle}>Upload Documents</h2>

            <div className={styles.formGroup}>
              <label>Aadhar Card Photo *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAadharPhoto(e.target.files?.[0] || null)}
                className={styles.fileInput}
              />
              {aadharPhoto && <span className={styles.fileName}>✅ {aadharPhoto.name}</span>}
            </div>

            <div className={styles.formGroup}>
              <label>Driving License Photo *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLicensePhoto(e.target.files?.[0] || null)}
                className={styles.fileInput}
              />
              {licensePhoto && <span className={styles.fileName}>✅ {licensePhoto.name}</span>}
            </div>

            <button
              className={styles.nextBtn}
              onClick={() => setStep('vehicle')}
              disabled={!aadharPhoto || !licensePhoto}
            >
              Continue to Vehicle Info →
            </button>
          </div>
        )}

        {/* Step 3: Vehicle Info */}
        {step === 'vehicle' && (
          <div className={styles.stepContent}>
            <button className={styles.backBtn} onClick={() => setStep('documents')}>← Back</button>
            <h2 className={styles.stepTitle}>Vehicle Information</h2>

            <div className={styles.formGroup}>
              <label>Vehicle Number *</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="e.g., TS09EA1234"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Vehicle Type *</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className={styles.select}
              >
                <option value="tata_ace">Tata Ace</option>
                <option value="mahindra">Mahindra</option>
                <option value="maruti">Maruti</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Capacity (kg) *</label>
              <input
                type="number"
                value={capacityKg}
                onChange={(e) => setCapacityKg(e.target.value)}
                placeholder="e.g., 500"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>RC Book Photo *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setRcPhoto(e.target.files?.[0] || null)}
                className={styles.fileInput}
              />
              {rcPhoto && <span className={styles.fileName}>✅ {rcPhoto.name}</span>}
            </div>

            <div className={styles.formGroup}>
              <label>Insurance Valid Till *</label>
              <input
                type="date"
                value={insuranceValidTill}
                onChange={(e) => setInsuranceValidTill(e.target.value)}
                className={styles.input}
              />
            </div>

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!vehicleNumber || !rcPhoto || !insuranceValidTill || loading}
            >
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
