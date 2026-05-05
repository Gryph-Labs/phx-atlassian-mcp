export interface ConfluenceSpace {
  id: number;
  key: string;
  name: string;
  type: string;
}

export interface ConfluenceVersion {
  by: { username: string; displayName: string };
  when: string;
  number: number;
  message?: string;
}

export interface ConfluenceAncestor {
  id: string;
  type: string;
  title: string;
}

export interface ConfluencePage {
  id: string;
  type: string;
  status: string;
  title: string;
  space?: ConfluenceSpace;
  version?: ConfluenceVersion;
  ancestors?: ConfluenceAncestor[];
  body?: {
    storage?: { value: string; representation: string };
    view?: { value: string; representation: string };
  };
  _links: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceSearchResponse {
  results: ConfluencePage[];
  start: number;
  limit: number;
  size: number;
  totalSize: number;
}

export interface ConfluenceChildrenResponse {
  page: {
    results: ConfluencePage[];
    start: number;
    limit: number;
    size: number;
  };
}

export interface ConfluenceComment {
  id: string;
  type: string;
  status: string;
  title: string;
  space?: ConfluenceSpace;
  version?: ConfluenceVersion;
  body?: {
    storage?: { value: string; representation: string };
    view?: { value: string; representation: string };
  };
  extensions?: {
    location?: string;
    inlineProperties?: {
      originalSelection?: string;
      markerRef?: string;
    };
  };
  _links: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceCommentsResponse {
  results: ConfluenceComment[];
  start: number;
  limit: number;
  size: number;
}

export interface ConfluenceWriteResponse {
  id: string;
  title: string;
  version: { number: number };
  _links: { webui: string; self: string };
}

export interface JiraRemoteLink {
  id: number;
  self: string;
  globalId: string;
  application?: {
    type?: string;
    name?: string;
  };
  relationship?: string;
  object: {
    url: string;
    title: string;
    icon?: { url16x16?: string; title?: string };
  };
}
