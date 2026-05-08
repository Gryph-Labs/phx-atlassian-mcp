import { AsyncLocalStorage } from "node:async_hooks";
import { AtlassianClient, IAtlassianClient } from "./http-client.js";

const store = new AsyncLocalStorage<IAtlassianClient>();

let defaultClient: AtlassianClient | undefined;

export function setDefaultClient(client: AtlassianClient) {
  defaultClient = client;
}

export function enterWith(client: AtlassianClient) {
  store.enterWith(client);
}

function resolve(): IAtlassianClient {
  return store.getStore() ?? defaultClient!;
}

export const sessionClient: IAtlassianClient = {
  jira<T>(method: string, path: string, body?: unknown): Promise<T> {
    return resolve().jira<T>(method, path, body);
  },
  confluence<T>(method: string, path: string, body?: unknown): Promise<T> {
    return resolve().confluence<T>(method, path, body);
  },
  bitbucket<T>(method: string, path: string, body?: unknown): Promise<T> {
    return resolve().bitbucket<T>(method, path, body);
  },
  bitbucketRaw(method: string, path: string): Promise<string> {
    return resolve().bitbucketRaw(method, path);
  },
  bitbucketCommentLikes<T>(method: string, path: string, body?: unknown): Promise<T> {
    return resolve().bitbucketCommentLikes<T>(method, path, body);
  },
};
