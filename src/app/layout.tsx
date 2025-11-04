
import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { UserProvider } from '@/context/UserContext';

export const metadata: Metadata = {
  title: 'eVoteChain',
  description: 'A secure, transparent, and tamper-proof e-voting system using blockchain technology.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <UserProvider>
            <div className="relative flex min-h-screen w-full flex-col bg-background">
              <Header />
              <main className="flex flex-1 flex-col items-center">
                {children}
              </main>
            </div>
            <Toaster />
          </UserProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
