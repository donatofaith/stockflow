import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local"
  );
}

console.log("Supabase URL loaded:", supabaseUrl);
console.log(
  "Supabase key loaded:",
  supabasePublishableKey.slice(0, 15) + "..."
);

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);