
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, BarChart, Blocks } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <Lock className="h-10 w-10 text-primary" />,
    title: 'Secure Voting',
    description: 'Each vote is encrypted and securely stored, ensuring voter privacy and data integrity. Our system uses advanced cryptographic techniques to protect every vote from the moment it\'s cast to the final tally. This end-to-end encryption means your choice remains confidential and cannot be tampered with, guaranteeing the security and legitimacy of the election process.',
  },
  {
    icon: <Blocks className="h-10 w-10 text-primary" />,
    title: 'Transparent Ledger',
    description: 'All votes are recorded on an immutable blockchain, providing a transparent and auditable trail. Every verified vote becomes a permanent part of the blockchain record, which can be publicly audited. This creates an unprecedented level of transparency, allowing anyone to verify the election\'s integrity without compromising voter anonymity.',
  },
  {
    icon: <BarChart className="h-10 w-10 text-primary" />,
    title: 'Real-Time Results',
    description: 'Watch the results update live as votes are cast and verified on the blockchain. Because each vote is recorded on the distributed ledger in real-time, results can be tallied and displayed instantly and accurately. This eliminates lengthy waiting periods and provides immediate, trustworthy outcomes that are backed by the blockchain\'s verifiable data.',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] w-full">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background"></div>
          <div className="px-4 md:px-6 text-center relative">
            <div className="max-w-3xl mx-auto">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                The Future of Voting is Here
              </div>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                eVoteChain
              </h1>
              <p className="mt-4 text-muted-foreground md:text-xl">
                A secure, transparent, and tamper-proof e-voting system powered by blockchain technology.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/register">Get Started</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">View Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-32 bg-muted/40">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Why Choose eVoteChain?</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Our platform leverages cutting-edge technology to bring trust and transparency back to the voting process.
                </p>
            </div>
            <div className="mx-auto max-w-5xl space-y-20">
              {features.map((feature, index) => (
                <div key={feature.title} className="grid md:grid-cols-2 gap-12 items-center">
                  <div className={`flex justify-center ${index % 2 === 1 ? 'md:order-last' : ''}`}>
                    <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 ring-4 ring-primary/10">
                      {React.cloneElement(feature.icon, { className: "h-24 w-24 text-primary" })}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground text-lg">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
