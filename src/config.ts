export type AuthConfig =
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; token: string };

export interface ServiceConfig {
  baseUrl: string;
  auth: AuthConfig;
  cloud: boolean;
}

export interface AtlassianConfig {
  jira?: ServiceConfig;
  bitbucket?: ServiceConfig;
  confluence?: ServiceConfig;
}

function isCloudUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname.endsWith(".atlassian.net") ||
      hostname.endsWith(".jira.com") ||
      hostname === "jira.com" ||
      hostname.endsWith(".atlassian.com") ||
      hostname === "atlassian.com"
    );
  } catch {
    return false;
  }
}

function resolveAuth(
  token: string | undefined,
  email: string | undefined,
  baseUrl: string,
  name: string,
): AuthConfig {
  if (!token) throw new Error(`Missing ${name}_TOKEN`);

  const cloud = isCloudUrl(baseUrl);
  if (cloud) {
    if (!email) {
      throw new Error(
        `Atlassian Cloud requires ${name}_EMAIL (API token + email for Basic auth). ` +
          `Generate an API token at https://id.atlassian.com/manage-profile/security/api-tokens`,
      );
    }
    return { type: "basic", username: email, token };
  }

  return { type: "bearer", token };
}

function resolveService(
  baseUrl: string | undefined,
  token: string | undefined,
  email: string | undefined,
  name: string,
): ServiceConfig | undefined {
  if (!baseUrl && !token) return undefined;
  if (!baseUrl) throw new Error(`Missing ${name}_BASE_URL`);
  if (!token) throw new Error(`Missing ${name}_TOKEN`);

  const cleaned = baseUrl.replace(/\/$/, "");
  const cloud = isCloudUrl(cleaned);
  const auth = resolveAuth(token, email, cleaned, name);

  // For Confluence Cloud, ensure /wiki suffix is present
  let resolvedBase = cleaned;
  if (cloud && name === "CONFLUENCE" && !cleaned.endsWith("/wiki")) {
    resolvedBase = `${cleaned}/wiki`;
  }

  return { baseUrl: resolvedBase, auth, cloud };
}

export function loadConfig(): AtlassianConfig {
  const sharedBase = process.env.ATLASSIAN_BASE_URL?.replace(/\/$/, "");

  const jira = resolveService(
    process.env.JIRA_BASE_URL ?? (sharedBase ? `${sharedBase}/jira` : undefined),
    process.env.JIRA_TOKEN,
    process.env.JIRA_EMAIL,
    "JIRA",
  );

  const bitbucket = resolveService(
    process.env.BITBUCKET_BASE_URL ??
      (sharedBase ? `${sharedBase}/bitbucket` : undefined),
    process.env.BITBUCKET_TOKEN,
    process.env.BITBUCKET_EMAIL,
    "BITBUCKET",
  );

  const confluence = resolveService(
    process.env.CONFLUENCE_BASE_URL ??
      (sharedBase ? `${sharedBase}/confluence` : undefined),
    process.env.CONFLUENCE_TOKEN,
    process.env.CONFLUENCE_EMAIL,
    "CONFLUENCE",
  );

  return { jira, bitbucket, confluence };
}
