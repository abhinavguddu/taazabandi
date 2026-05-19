import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'TaazaBandi — Farm Fresh Sabzi Bundles Delivered to Your Door | Hyderabad',
  description: 'Skip the mandi! Order pre-packed fresh vegetable bundles delivered by our zone-based vans. Family Pack ₹299, Single Pack ₹199. Serving Jubilee Hills, Banjara Hills & Madhapur. No cherry-picking, just farm-fresh quality.',
  keywords: 'fresh vegetables, sabzi delivery, Hyderabad, vegetable bundles, farm fresh, Jubilee Hills, Banjara Hills, Madhapur, TaazaBandi',
  icons: {
    icon: '/images/taazabandi-logo-transparent.png',
    apple: '/images/taazabandi-logo-transparent.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
      </body>
    </html>
  );
}
