
import Link from 'next/link';
import { Vote, Twitter, Facebook, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center space-x-2">
                <Vote className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold font-headline">eVoteChain</span>
            </Link>
            <p className="text-muted-foreground text-sm">
                The future of secure and transparent e-voting.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div className="grid gap-2">
                <h3 className="font-semibold">Quick Links</h3>
                <Link href="/vote" className="text-sm text-muted-foreground hover:text-primary">Vote</Link>
                <Link href="/results" className="text-sm text-muted-foreground hover:text-primary">Results</Link>
                <Link href="/blockchain" className="text-sm text-muted-foreground hover:text-primary">Blockchain</Link>
            </div>
            <div className="grid gap-2">
                <h3 className="font-semibold">Legal</h3>
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; 2024 eVoteChain. All rights reserved.
          </p>
          <div className="mt-4 flex items-center gap-4 sm:mt-0">
            <Link href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-primary">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
