export interface BitbucketPagedResponse<T> {
  size: number;
  limit: number;
  start: number;
  isLastPage: boolean;
  values: T[];
}

export interface BitbucketRepo {
  id: number;
  slug: string;
  name: string;
  project: { key: string; name: string };
  links: { clone?: Array<{ href: string; name: string }> };
  state: string;
}

export interface BitbucketBranch {
  id: string;
  displayId: string;
  latestCommit: string;
  isDefault: boolean;
}

export interface BitbucketPullRequest {
  id: number;
  title: string;
  description?: string;
  state: string;
  author: { user: { name: string; displayName: string } };
  fromRef: {
    id: string;
    displayId: string;
    repository: { slug: string; project: { key: string } };
  };
  toRef: { id: string; displayId: string; repository: { slug: string; project: { key: string } } };
  reviewers: Array<{ user: { name: string; displayName: string }; approved: boolean }>;
  createdDate: number;
  updatedDate: number;
  version: number;
}

export interface BitbucketComment {
  id: number;
  text: string;
  author: { name: string; displayName: string };
  createdDate: number;
}

export interface BitbucketCommentAnchor {
  path: string;
  line: number;
  lineType: string;
  fileType: string;
}

export interface BitbucketThreadedComment {
  id: number;
  text: string;
  author: { name: string; displayName: string };
  createdDate: number;
  updatedDate: number;
  severity: string;
  state: string;
  anchor?: BitbucketCommentAnchor;
  comments: BitbucketThreadedComment[];
  threadResolved?: boolean;
  resolvedDate?: number;
}

export interface BitbucketPrActivity {
  id: number;
  action: string;
  commentAction?: string;
  comment?: BitbucketThreadedComment;
  createdDate: number;
  user: { name: string; displayName: string };
}
