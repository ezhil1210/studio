
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, Vote, Loader2 } from "lucide-react";
import { useAuth } from "@/firebase";
import { logoutUser } from "@/app/actions";
import { signOut } from "firebase/auth";

const navLinks = [
  { href: "/vote", label: "Vote" },
  { href: "/results", label: "Results" },
  { href: "/blockchain", label: "Blockchain" },
];

export default function ManualHeader() {
  const auth = useAuth();

  // Create a fake user object for display purposes
  const fakeUser = {
    uid: 'manual-user',
    isAnonymous: true,
    displayName: "Demo User",
    email: "demo@example.com",
    photoURL: null,
  };
  
  const handleLogout = async () => {
    // Pass the UID to the server action so it can delete the anonymous user if needed.
    await logoutUser(fakeUser?.uid || null);

    // Also sign out on the client.
    if (auth) {
        await signOut(auth);
    }
    
    // Force a full page reload to clear all client-side state.
    window.location.href = '/';
  };

  const userInitial = fakeUser.isAnonymous ? "D" : fakeUser.displayName?.charAt(0).toUpperCase() || fakeUser.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Vote className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block font-headline">
              eVoteChain
            </span>
          </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
        </div>

        <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <Link href="/" className="mr-6 flex items-center space-x-2 mb-6">
                  <Vote className="h-6 w-6 text-primary" />
                  <span className="font-bold font-headline">eVoteChain</span>
                </Link>
                  <nav className="flex flex-col space-y-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="transition-colors hover:text-foreground/80 text-foreground/60"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
              </SheetContent>
            </Sheet>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={fakeUser.photoURL || undefined}
                      alt="User avatar"
                    />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {fakeUser.isAnonymous ? "Demo User" : (fakeUser.displayName || "User")}
                    </p>
                    {fakeUser.email && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {fakeUser.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
