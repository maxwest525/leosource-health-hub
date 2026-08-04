import { useState } from "react";
import { Loader2, Building2, AlertCircle, Search } from "lucide-react";
import ToolPageShell from "@/components/ToolPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listIssuers } from "@/lib/cms";

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
];

type Issuer = { id: string; name: string };

const CarrierDirectory = () => {
  const [state, setState] = useState("FL");
  const [filter, setFilter] = useState("");
  const [issuers, setIssuers] = useState<Issuer[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextState: string) => {
    setState(nextState);
    setIsLoading(true);
    setError(null);
    try {
      const res = await listIssuers(nextState);
      setIssuers(res.issuers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not load carriers for that state.");
      setIssuers(null);
    } finally {
      setIsLoading(false);
    }
  };

  const visible = (issuers ?? []).filter((issuer) =>
    issuer.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <ToolPageShell
      eyebrow="Carrier directory"
      title="Every carrier licensed on your state Marketplace"
      description="Pull the live issuer list the Centers for Medicare and Medicaid Services publishes for each state, so you know exactly which companies can write your coverage this plan year."
    >
      <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-[11px] font-semibold text-foreground mb-1.5">State</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STATES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>
          <Button onClick={() => load(state)} disabled={isLoading} className="h-10 font-semibold">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading</> : "Show carriers"}
          </Button>
          {issuers && issuers.length > 0 && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by carrier name"
                aria-label="Filter carriers"
                className="h-10 pl-9"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-[13px] text-rose-800">{error}</p>
          </div>
        )}

        {issuers && (
          <>
            <p className="mt-6 mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60 font-semibold">
              {visible.length} carrier{visible.length === 1 ? "" : "s"} in {state}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visible.map((issuer) => (
                <div
                  key={issuer.id}
                  className="rounded-xl border border-border/60 bg-background/60 px-4 py-3.5 flex items-start gap-3"
                >
                  <Building2 className="w-4 h-4 text-primary/70 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-snug">{issuer.name}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">Issuer ID {issuer.id}</p>
                  </div>
                </div>
              ))}
            </div>
            {visible.length === 0 && (
              <p className="text-[13px] text-muted-foreground/70">No carriers matched that filter.</p>
            )}
          </>
        )}
      </div>
    </ToolPageShell>
  );
};

export default CarrierDirectory;
