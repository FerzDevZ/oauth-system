import { getGithubAuthorizationUrl, getGithubUser } from "./github";
import { getGoogleAuthorizationUrl, getGoogleUser } from "./google";
import type { Provider, ProviderUser } from "./providers";

export function getAuthorizationUrl(provider: Provider, state: string, redirectUri: string): string {
  switch (provider) {
    case "google":
      return getGoogleAuthorizationUrl(state, redirectUri);
    case "github":
      return getGithubAuthorizationUrl(state, redirectUri);
  }
}

export async function getUserFromCode(
  provider: Provider,
  code: string,
  redirectUri: string,
): Promise<ProviderUser> {
  switch (provider) {
    case "google":
      return getGoogleUser(code, redirectUri);
    case "github":
      return getGithubUser(code, redirectUri);
  }
}
