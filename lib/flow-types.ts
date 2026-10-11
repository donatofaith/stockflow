export type Allocation = { ticker: string; percentage: number };
export type SavedRule = {
  storage?: "local" | "cloud";
  id?: string;
  wallet_address: string;
  trigger_type: string;
  allocations: Allocation[];
  status: "draft" | "active";
  created_at?: string;
  updated_at?: string;
  activated_at?: string | null;
};
