
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, DatabaseZap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { seedSampleVotes } from '@/app/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export function SeedButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsLoading(true);
    const result = await seedSampleVotes();
    if (result.success) {
      if (result.error) {
           toast({
            title: 'Database Already Seeded',
            description: 'Sample votes have already been added.',
        });
      } else {
        toast({
            title: 'Database Seeded',
            description: '15 sample votes have been added.',
        });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: result.error || 'Could not seed the database.',
      });
    }
    setIsLoading(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
         <Button variant="outline" size="lg" disabled={isLoading}>
            {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
                <DatabaseZap className="mr-2 h-5 w-5" />
            )}
            Seed Sample Votes
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will add 15 sample votes to the database. This action can only be performed once.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSeed}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

    