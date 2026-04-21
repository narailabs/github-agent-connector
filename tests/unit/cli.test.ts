/**
 * Tests for the GitHub connector built on `@narai/connector-toolkit`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildGithubConnector } from "../../src/index.js";
import {
  GithubClient,
  type GithubClientOptions,
} from "../../src/lib/github_client.js";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function makeClient(
  overrides: Partial<GithubClientOptions> = {},
  fetchMock?: (url: string, init?: RequestInit) => Promise<Response>,
): GithubClient {
  return new GithubClient({
    token: "ghp_test",
    rateLimitPerMin: 100,
    connectTimeoutMs: 50,
    readTimeoutMs: 50,
    fetchImpl: fetchMock
      ? (async (url, init) => fetchMock(String(url), init))
      : undefined,
    sleepImpl: async () => {},
    ...overrides,
  });
}

function makeConnector(client: GithubClient) {
  return buildGithubConnector({
    sdk: async () => client,
    credentials: async () => ({ token: "ghp_test" }),
  });
}

describe("GithubClient", () => {
  afterEach(() => vi.restoreAllMocks());

  it("attaches Bearer + API-version headers", async () => {
    let headers: Headers | undefined;
    const client = makeClient({}, async (_url, init) => {
      headers = new Headers(init?.headers as HeadersInit);
      return jsonResponse({ full_name: "a/b" });
    });
    await client.getRepo("a", "b");
    expect(headers?.get("authorization")).toBe("Bearer ghp_test");
    expect(headers?.get("x-github-api-version")).toBe("2022-11-28");
  });

  it("composes search_code query with repo qualifier", async () => {
    let called = "";
    const client = makeClient({}, async (url) => {
      called = url;
      return jsonResponse({ total_count: 0, items: [] });
    });
    await client.searchCode("foo", "bar", "class Auth");
    expect(called).toMatch(/q=class\+Auth\+repo%3Afoo%2Fbar/);
  });

  it("retries on primary rate limit then succeeds", async () => {
    let calls = 0;
    const client = makeClient({}, async () => {
      calls++;
      if (calls === 1) {
        return jsonResponse(
          {},
          {
            status: 403,
            headers: { "x-ratelimit-remaining": "0", "retry-after": "0" },
          },
        );
      }
      return jsonResponse({ full_name: "a/b" });
    });
    const r = await client.getRepo("a", "b");
    expect(calls).toBe(2);
    expect(r.ok).toBe(true);
  });

  it("surfaces 404 as NOT_FOUND non-retriable", async () => {
    const client = makeClient({}, async () =>
      jsonResponse({ message: "missing" }, { status: 404 }),
    );
    const r = await client.getRepo("a", "b");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("NOT_FOUND");
      expect(r.retriable).toBe(false);
    }
  });
});

describe("github connector — fetch()", () => {
  beforeEach(() => {
    delete process.env["GITHUB_TOKEN"];
  });
  afterEach(() => vi.restoreAllMocks());

  it("exposes validActions", () => {
    const c = buildGithubConnector();
    expect([...c.validActions].sort()).toEqual([
      "get_file",
      "get_issues",
      "get_pulls",
      "repo_info",
      "search_code",
    ]);
  });

  it("rejects invalid owner", async () => {
    const c = makeConnector(makeClient());
    const r = await c.fetch("repo_info", { owner: "bad/owner", repo: "r" });
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.error_code).toBe("VALIDATION_ERROR");
  });

  it("returns CONFIG_ERROR when GITHUB_TOKEN missing", async () => {
    const c = buildGithubConnector();
    const r = await c.fetch("repo_info", { owner: "acme", repo: "backend" });
    expect(r.status).toBe("error");
    if (r.status === "error") {
      expect(r.error_code).toBe("CONFIG_ERROR");
      expect(r.retriable).toBe(false);
      expect(r.message).toContain("GITHUB_TOKEN");
    }
  });

  it("decodes base64 file content via injected client", async () => {
    const client = makeClient({}, async () =>
      jsonResponse({
        path: "README.md",
        size: 5,
        encoding: "base64",
        content: Buffer.from("hello", "utf-8").toString("base64"),
      }),
    );
    const c = makeConnector(client);
    const r = await c.fetch("get_file", {
      owner: "a",
      repo: "b",
      path: "README.md",
    });
    expect(r.status).toBe("success");
    if (r.status === "success") {
      expect(r.data["content"]).toBe("hello");
    }
  });

  it("rejects path traversal", async () => {
    const c = makeConnector(makeClient());
    const r = await c.fetch("get_file", {
      owner: "a",
      repo: "b",
      path: "../etc/passwd",
    });
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.error_code).toBe("VALIDATION_ERROR");
  });

  it("surfaces 401 as AUTH_ERROR", async () => {
    const client = makeClient({}, async () =>
      jsonResponse({}, { status: 401 }),
    );
    const c = makeConnector(client);
    const r = await c.fetch("repo_info", { owner: "a", repo: "b" });
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.error_code).toBe("AUTH_ERROR");
  });

  describe("pagination", () => {
    function issueRow(n: number): Record<string, unknown> {
      return {
        number: n,
        title: `issue ${n}`,
        state: "open",
        user: { login: "author" },
        labels: [],
        html_url: `https://github.com/a/b/issues/${n}`,
        updated_at: null,
      };
    }

    function pagedFetch(
      totalCount: number,
      perPage = 100,
    ): [(url: string) => Response, { pages: number[] }] {
      const state = { pages: [] as number[] };
      return [
        (url: string) => {
          const u = new URL(url);
          const page = Number(u.searchParams.get("page") ?? "1");
          state.pages.push(page);
          const start = (page - 1) * perPage;
          const end = Math.min(start + perPage, totalCount);
          const rows: unknown[] = [];
          for (let i = start + 1; i <= end; i++) rows.push(issueRow(i));
          return jsonResponse(rows);
        },
        state,
      ];
    }

    it("iterates through 3 pages when total < max_results", async () => {
      const [fetchImpl, state] = pagedFetch(223);
      const client = makeClient({}, async (url) => fetchImpl(url));
      const c = makeConnector(client);
      const r = await c.fetch("get_issues", {
        owner: "a",
        repo: "b",
        max_results: 500,
      });
      expect(r.status).toBe("success");
      if (r.status === "success") {
        const data = r.data as { total: number; truncated: boolean };
        expect(data.total).toBe(223);
        expect(data.truncated).toBe(false);
      }
      expect(state.pages).toEqual([1, 2, 3]);
    });

    it("stops at max_results and marks truncated", async () => {
      const [fetchImpl, state] = pagedFetch(500);
      const client = makeClient({}, async (url) => fetchImpl(url));
      const c = makeConnector(client);
      const r = await c.fetch("get_pulls", {
        owner: "a",
        repo: "b",
        max_results: 150,
      });
      expect(r.status).toBe("success");
      if (r.status === "success") {
        const data = r.data as { total: number; truncated: boolean };
        expect(data.total).toBe(150);
        expect(data.truncated).toBe(true);
      }
      expect(state.pages).toEqual([1, 2]);
    });
  });
});

describe("envelope is wiki-agnostic — no mermaid", () => {
  it("repo_info does NOT include a mermaid field", async () => {
    const client = makeClient({}, async () =>
      jsonResponse({
        full_name: "a/b",
        description: "test",
        default_branch: "main",
      }),
    );
    const c = makeConnector(client);
    const r = await c.fetch("repo_info", { owner: "a", repo: "b" });
    expect(r.status).toBe("success");
    if (r.status === "success") {
      expect(r.data["mermaid"]).toBeUndefined();
    }
  });
});
