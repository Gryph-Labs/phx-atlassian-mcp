import { createServer, Server, IncomingMessage, ServerResponse } from "node:http";
import { AtlassianClient } from "../../src/http-client.js";

export type AuthType = "bearer" | "basic";

let server: Server;
let port: number;
let client: AtlassianClient;
const stubs = new Map<string, { status: number; body: unknown }>();

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      resolve(body);
    });
  });
}

export async function setupWiremock() {
  return new Promise<void>((resolve) => {
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.url === "/__admin/mappings" && req.method === "DELETE") {
        stubs.clear();
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === "/__admin/mappings" && req.method === "POST") {
        const body = await readBody(req);
        const stub = JSON.parse(body);
        const key = `${stub.request.method} ${stub.request.urlPath}`;
        stubs.set(key, {
          status: stub.response.status,
          body: stub.response.jsonBody,
        });
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: "stub-id" }));
        return;
      }

      const urlPath = req.url?.split("?")[0] ?? "";
      const key = `${req.method} ${urlPath}`;
      const match = stubs.get(key);

      if (match) {
        res.writeHead(match.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(match.body));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No stub mapping found" }));
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        port = address.port;
      }
      client = new AtlassianClient({
        jira: { baseUrl: `http://127.0.0.1:${port}/jira`, auth: { type: "bearer", token: "test-jira-token" }, cloud: false },
        bitbucket: { baseUrl: `http://127.0.0.1:${port}/bitbucket`, auth: { type: "bearer", token: "test-bb-token" }, cloud: false },
        confluence: { baseUrl: `http://127.0.0.1:${port}/confluence`, auth: { type: "bearer", token: "test-conf-token" }, cloud: false },
      });
      resolve();
    });
  });
}

export async function teardownWiremock() {
  if (server) {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

export function getClient({ authType = "bearer" }: { authType?: AuthType } = {}): AtlassianClient {
  if (authType === "bearer") return client;

  return new AtlassianClient({
    jira: { baseUrl: `http://127.0.0.1:${port}/jira`, auth: { type: "basic", username: "user@example.com", token: "test-jira-token" }, cloud: true },
    bitbucket: { baseUrl: `http://127.0.0.1:${port}/bitbucket`, auth: { type: "basic", username: "user@example.com", token: "test-bb-token" }, cloud: true },
    confluence: { baseUrl: `http://127.0.0.1:${port}/confluence`, auth: { type: "basic", username: "user@example.com", token: "test-conf-token" }, cloud: true },
  });
}

export function getWiremockUrl(): string {
  return `http://127.0.0.1:${port}`;
}

export async function stubRequest(
  method: string,
  urlPath: string,
  responseBody: unknown,
  status = 200,
) {
  await fetch(`${getWiremockUrl()}/__admin/mappings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request: { method, urlPath },
      response: { status, jsonBody: responseBody },
    }),
  });
}

export async function resetStubs() {
  await fetch(`${getWiremockUrl()}/__admin/mappings`, {
    method: "DELETE",
  });
}
