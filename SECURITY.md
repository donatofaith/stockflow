# Security

StockFlow is a hackathon prototype. It is non-custodial and does not request wallet private keys or seed phrases.

## Current safeguards

- Wallet signatures stay inside the connected wallet.
- The demonstrated on-chain action is a Solana Devnet memo.
- Jupiter credentials remain server-side.
- Route preview does not sign, submit, or return a full prepared transaction.
- Supported tickers and positive allocation amounts are validated server-side.
- API errors return controlled messages instead of secrets.

## Important production requirement

A wallet address by itself is not authentication. Before production use, StockFlow must require a signed wallet challenge and enforce ownership in Supabase Row Level Security. Client-side filters such as `.eq("wallet_address", address)` are not a security boundary.

The `stockflow_rules` table should deny access by default and only allow a verified wallet identity to read or change its own row.

## Secrets

Safe for the browser:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server-only:

- `JUPITER_API_KEY`
- Supabase service-role keys, if ever introduced

Never commit private keys, seed phrases, service-role keys, or production wallet credentials.

## Reporting

Please open a private security advisory on the repository for sensitive findings.
