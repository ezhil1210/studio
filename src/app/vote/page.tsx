
'use client';

import { VoteClient } from "@/components/VoteClient";
import ManualHeader from "@/components/layout/ManualHeader";

export default function VotePage() {
  return (
    <>
      <ManualHeader />
      <div className="flex flex-1 flex-col items-center w-full">
        <VoteClient />
      </div>
    </>
  );
}
