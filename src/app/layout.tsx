'use client';

import type { Metadata } from 'next';
import { useState, useEffect } from 'react';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { usePathname } from 'next/navigation';

// This is a workaround to satisfy the Metadata type which cannot be used in a client component.
// In a real-world app, you'd handle metadata differently for client-rendered layouts.
const metadata: Metadata = {
  title: 'eVoteChain',
  description: 'A secure, transparent, and tamper-proof e-voting system using blockchain technology.',
};

// Wrapper to ensure Toaster only renders on the client
function ClientOnlyToaster() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <Toaster /> : null;
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{String(metadata.title)}</title>
        <meta name="description" content={String(metadata.description)} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
            <div className="relative flex min-h-screen w-full flex-col bg-background">
              <Header />
              <main className="flex flex-1 flex-col items-center">
                {children}
              </main>
              <Footer />
            </div>
            <ClientOnlyToaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
