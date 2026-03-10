
'use client';

import { VoteClient } from "@/components/VoteClient";
import Header from "@/components/layout/Header";

export default function VotePage() {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col items-center w-full">
        <VoteClient />
      </div>
    </>
  );
}
