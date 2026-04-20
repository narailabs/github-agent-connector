/**
 * @narai/github-agent-connector — read-only GitHub connector.
 */
export {
  fetch,
  main,
  VALID_ACTIONS,
  type FetchResult,
  type FetchOptions,
} from "./cli.js";

export {
  GithubClient,
  loadGithubCredentials,
  type GithubClientOptions,
  type GithubResult,
} from "./lib/github_client.js";
