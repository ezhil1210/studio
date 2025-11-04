
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Blocks, Lock, BarChartBig, PlayCircle } from "lucide-react";
import Link from "next/link";
import { SeedButton } from '@/components/SeedButton';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center">
      <section className="w-full py-20 md:py-32 lg:py-40 xl:py-48 bg-card">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none font-headline">
                eVoteChain
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                A Secure, Transparent, and Tamper-Proof E-Voting System.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/vote">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Get Started
                </Link>
              </Button>
              <SeedButton />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                Key Features
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                Why Choose eVoteChain?
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Our platform leverages cutting-edge technology to ensure the integrity and accessibility of every vote.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-stretch gap-6 py-12 lg:grid-cols-3 lg:gap-12">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                    <Lock className="h-8 w-8" />
                </div>
                <CardTitle>Secure Voting</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow">
                <p>Each vote is encrypted and cast by verified users, ensuring privacy and preventing unauthorized access.</p>
              </CardContent>
            </Card>
            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                    <Blocks className="h-8 w-8" />
                </div>
                <CardTitle>Blockchain Transparency</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow">
                <p>Every vote is recorded as a block on a simulated immutable ledger, making the entire voting process transparent and auditable.</p>
              </CardContent>
            </Card>
            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                    <BarChartBig className="h-8 w-8" />
                </div>
                <CardTitle>Real-time Results</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow">
                <p>View aggregated results as they happen. The transparent tallying process ensures confidence in the final outcome.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

    