import { getGithubAuthorizationUrl, getGithubUser } from "./github";
import { getGoogleAuthorizationUrl, getGoogleUser } from "./google";
import type { Provider, ProviderUser } from "./providers";

export function getAuthorizationUrl(
  provider: Provider,
  state: string,
  redirectUri: string,
  codeChallenge?: string,
): string {
  switch (provider) {
    case "google":
      return getGoogleAuthorizationUrl(state, redirectUri, codeChallenge);
    case "github":
      return getGithubAuthorizationUrl(state, redirectUri, codeChallenge);
  }
}

export async function getUserFromCode(
  provider: Provider,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<ProviderUser> {
  switch (provider) {
    case "google":
      return getGoogleUser(code, redirectUri, codeVerifier);
    case "github":
      return getGithubUser(code, redirectUri, codeVerifier);
  }
}
