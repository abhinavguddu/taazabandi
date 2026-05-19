import React from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="customer-main" style={{ minHeight: 'calc(100vh - 150px)' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
