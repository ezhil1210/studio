
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
import { Menu, Vote, Loader2, ShieldCheck, Users } from "lucide-react";
import { useUser, useAuth } from "@/firebase";
import { logoutUser } from "@/app/actions";
import { signOut } from "firebase/auth";

const ADMIN_EMAIL = 'admin@evotechain.com';

const navLinks = [
  { href: "/vote", label: "Vote" },
  { href: "/results", label: "Results" },
  { href: "/blockchain", label: "Blockchain" },
];

export default function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogout = async () => {
    await logoutUser(user?.uid || null);

    if (auth) {
        await signOut(auth);
    }
    
    window.location.href = '/';
  };

  const isAdmin = user?.email === ADMIN_EMAIL;
  const userInitial = user?.isAnonymous ? "D" : user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Vote className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block font-headline">
              eVoteChain
            </span>
          </Link>
          {user && (
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
              {isAdmin && (
                <div className="flex items-center gap-6">
                  <Link
                    href="/admin"
                    className="flex items-center gap-1 transition-colors text-primary font-bold hover:text-primary/80"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Link>
                  <Link
                    href="/admin/voters"
                    className="flex items-center gap-1 transition-colors text-primary font-bold hover:text-primary/80"
                  >
                    <Users className="h-4 w-4" />
                    Voters
                  </Link>
                </div>
              )}
            </nav>
          )}
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
                {user && (
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
                    {isAdmin && (
                      <>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 transition-colors text-primary font-bold hover:text-primary/80"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                        <Link
                          href="/admin/voters"
                          className="flex items-center gap-2 transition-colors text-primary font-bold hover:text-primary/80"
                        >
                          <Users className="h-4 w-4" />
                          Voter Registry
                        </Link>
                      </>
                    )}
                  </nav>
                )}
              </SheetContent>
            </Sheet>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {isUserLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user.photoURL || undefined}
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
                      {user.isAnonymous ? "Demo User" : (user.displayName || "User")}
                    </p>
                    {user.email && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Command Center</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/voters">Voter Registry</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
