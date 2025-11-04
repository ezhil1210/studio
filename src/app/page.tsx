
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, BarChart, Blocks } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <Lock className="h-10 w-10 text-primary" />,
    title: 'Secure Voting',
    description: 'Each vote is encrypted and securely stored, ensuring voter privacy and data integrity.',
  },
  {
    icon: <Blocks className="h-10 w-10 text-primary" />,
    title: 'Transparent Ledger',
    description: 'All votes are recorded on an immutable blockchain, providing a transparent and auditable trail.',
  },
  {
    icon: <BarChart className="h-10 w-10 text-primary" />,
    title: 'Real-Time Results',
    description: 'Watch the results update live as votes are cast and verified on the blockchain.',
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
          <div className="px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Why Choose eVoteChain?</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Our platform leverages cutting-edge technology to bring trust and transparency back to the voting process.
                </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center h-full hover:shadow-xl transition-shadow duration-300 border-0 bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4 ring-2 ring-primary/10">
                        {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 eVoteChain. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
