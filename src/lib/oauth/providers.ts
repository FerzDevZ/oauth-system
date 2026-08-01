export type Provider = "google" | "github";

export const PROVIDERS: readonly Provider[] = ["google", "github"];

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

export type ProviderUser = {
  providerUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};
