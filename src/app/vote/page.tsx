import { getVoterStatus } from "@/app/actions";
import { VoteClient } from "@/components/VoteClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default async function VotePage() {
  const voterStatus = await getVoterStatus();

  if (voterStatus.hasVoted) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-lg text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full p-3 w-fit">
              <CheckCircle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-headline mt-4">Thank You for Voting</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-lg">
              Your vote has been securely recorded on the blockchain.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <VoteClient />;
}
