import { AuthConfig, AtlassianConfig, ServiceConfig } from "./config.js";

function toHeader(auth: AuthConfig): string {
  if (auth.type === "basic") {
    const encoded = Buffer.from(`${auth.username}:${auth.token}`).toString(
      "base64",
    );
    return `Basic ${encoded}`;
  }
  return `Bearer ${auth.token}`;
}

export class AtlassianClient {
  private jiraConfig?: ServiceConfig;
  private bitbucketConfig?: ServiceConfig;
  private confluenceConfig?: ServiceConfig;

  constructor(config: AtlassianConfig) {
    this.jiraConfig = config.jira;
    this.bitbucketConfig = config.bitbucket;
    this.confluenceConfig = config.confluence;
  }

  private authHeader(config: ServiceConfig | undefined): string {
    if (!config) throw new Error("Service not configured");
    return toHeader(config.auth);
  }

  private url(config: ServiceConfig | undefined, suffix: string): string {
    if (!config) throw new Error("Service not configured");
    return `${config.baseUrl}${suffix}`;
  }

  async jira<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const apiVersion = this.jiraConfig?.cloud ? "/rest/api/3" : "/rest/api/2";
    return this.request<T>(
      this.url(this.jiraConfig, `${apiVersion}${path}`),
      method,
      body,
      this.authHeader(this.jiraConfig),
    );
  }

  async bitbucket<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (this.bitbucketConfig?.cloud) {
      throw new Error(
        "Bitbucket Cloud is not yet supported. This server works with Bitbucket Data Center / Server only.",
      );
    }
    return this.request<T>(
      this.url(this.bitbucketConfig, `/rest/api/1.0${path}`),
      method,
      body,
      this.authHeader(this.bitbucketConfig),
    );
  }

  async confluence<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    return this.request<T>(
      this.url(this.confluenceConfig, `/rest/api${path}`),
      method,
      body,
      this.authHeader(this.confluenceConfig),
    );
  }

  async bitbucketRaw(method: string, path: string): Promise<string> {
    if (this.bitbucketConfig?.cloud) {
      throw new Error(
        "Bitbucket Cloud is not yet supported. This server works with Bitbucket Data Center / Server only.",
      );
    }
    const url = this.url(this.bitbucketConfig, `/rest/api/1.0${path}`);
    const res = await fetch(url, {
      method,
      headers: { Authorization: this.authHeader(this.bitbucketConfig) },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return res.text();
  }

  async bitbucketCommentLikes<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (this.bitbucketConfig?.cloud) {
      throw new Error(
        "Bitbucket Cloud is not yet supported. This server works with Bitbucket Data Center / Server only.",
      );
    }
    return this.request<T>(
      this.url(this.bitbucketConfig, `/rest/comment-likes/latest${path}`),
      method,
      body,
      this.authHeader(this.bitbucketConfig),
    );
  }

  private async request<T>(
    url: string,
    method: string,
    body?: unknown,
    authHeader?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: authHeader!,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    // Some endpoints return 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }
}
