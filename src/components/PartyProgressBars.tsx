import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

interface Promise {
  party_id: string;
  status: string;
  parties: {
    name: string;
    abbreviation: string;
  };
}

interface PartyProgressBarsProps {
  promises: Promise[];
}

export function PartyProgressBars({ promises }: PartyProgressBarsProps) {
  // Group by party and calculate fulfillment rate
  const partyStats = promises.reduce((acc, promise) => {
    const partyName = promise.parties.name;
    
    if (!acc[partyName]) {
      acc[partyName] = {
        name: partyName,
        abbreviation: promise.parties.abbreviation,
        total: 0,
        fulfilled: 0,
      };
    }
    
    acc[partyName].total++;
    if (promise.status === 'infriat') {
      acc[partyName].fulfilled++;
    }
    
    return acc;
  }, {} as Record<string, { name: string; abbreviation: string; total: number; fulfilled: number }>);

  const sortedParties = Object.values(partyStats)
    .filter(party => party.total > 0)
    .sort((a, b) => (b.fulfilled / b.total) - (a.fulfilled / a.total));

  if (sortedParties.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">Partiernas uppfyllelsegrad</h2>
      <div className="space-y-4">
        {sortedParties.map((party) => {
          const rate = Math.round((party.fulfilled / party.total) * 100);
          return (
            <div key={party.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{party.abbreviation}</span>
                <span className="text-muted-foreground">
                  {party.fulfilled}/{party.total} ({rate}%)
                </span>
              </div>
              <Progress value={rate} className="h-2" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
