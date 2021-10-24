import { Comments, User } from '@mgtd/vssue-api-github-v4/lib/types'
import { Issue } from './types'
import { Nullable } from '../../types/common'
import persistStore from '../../utils/persistStore'
import GithubV3 from '@mgtd/vssue-api-github-v3'
import GithubV4 from '@mgtd/vssue-api-github-v4'

interface ApiInfo {
  baseURL: string;
  owner: string;
  repo: string;
  labels: Array<string>;
  clientId: string;
  clientSecret: string;
  state: string;
  proxy: string | ((url: string) => string);
}

export type Result = [Issue, Comments] | 'noIssue' | 'invalidToken'

export interface CommentStore {
  comments: Nullable<Comments>;
  user: User;
  issue: Nullable<Issue>;
  token: Nullable<string>;
  apiInfo: Nullable<ApiInfo>;

  setComments(val: Nullable<Comments>): void;

  setUser(val: User): void;

  setIssue(val: Nullable<Issue>): void;

  setToken(val: Nullable<string>): void;

  setApiInfo(val: Nullable<ApiInfo>): void;

  createApiInfo(val: Pick<ApiInfo, 'owner' | 'repo' | 'clientId' | 'clientSecret'>): void;

  revokeToken(): void;

  resetUser(): void;

  getUserName(): string;

  getComments(id: string): Promise<Result>;

  updateComments(id: string): Promise<void>;

  get noIssue(): boolean;

  get filteredCommentsData(): Comments['data'];

  get authorized(): boolean;

  get ghApiV3(): GithubV3;

  get ghApiV4(): GithubV4;
}

const COMMENT_TOKEN = 'github-access-token'

const DEFAULT_USER: User = {
  username: '',
  avatar: '',
  homepage: '',
}

const commentStore = persistStore<CommentStore>({
  comments: null,
  user: DEFAULT_USER,
  issue: null,
  token: null,
  apiInfo: null,

  setComments(val) {
    this.comments = val
  },
  setUser(val) {
    this.user = val
  },
  setIssue(val) {
    this.issue = val
  },
  setToken(val) {
    this.token = val
  },
  setApiInfo(val) {
    this.apiInfo = val
  },
  createApiInfo(val) {
    this.setApiInfo({
      baseURL: 'https://github.com',
      labels: ['gitalk'],
      state: '123',
      proxy: url => `https://cors-anywhere.mgt.workers.dev/?${url}`,
      ...val,
    })
  },
  revokeToken() {
    this.setToken(null)
    this.resetUser()
  },
  resetUser() {
    this.setUser(DEFAULT_USER)
  },
  getComments(id) {
    return this.ghApiV3.getIssue({ accessToken: this.token, issueTitle: id })
      .catch(() => {
        this.revokeToken()
        throw 'invalidToken'
      })
      .then((issue) => {
        if (issue === null) {
          throw 'noIssue'
        } else {
          return issue
        }
      })
      .then(async (issue) => {
        const comments = this.token
          ? await this.ghApiV4.getComments({
            accessToken: this.token,
            issueId: issue.id,
            query: { page: 1, perPage: 100, sort: 'asce' },
          })
          : await this.ghApiV3.getComments({
            accessToken: this.token,
            issueId: issue.id,
            query: { page: 1, perPage: 100 },
          })
        return [issue, comments]
      })
  },
  async updateComments(id) {
    const res = await commentStore.getComments(id)
    if (res !== 'invalidToken' && res !== 'noIssue') {
      commentStore.setComments(res[1])
    }
  },

  get getUserName() {
    return this.user?.username || '未登录用户'
  },
  get noIssue() {
    return !this.issue
  },
  get filteredCommentsData() {
    return this.comments?.data.filter((v: { isMinimized: boolean }) => v.isMinimized) || []
  },
  get authorized() {
    return !!this.user && !!this.token && !this.noIssue
  },
  get ghApiV3() {
    return new GithubV3(this.apiInfo)
  },
  get ghApiV4() {
    return new GithubV4(this.apiInfo)
  },

}, {
  name: COMMENT_TOKEN,
  properties: ['token'],
})

export { commentStore, COMMENT_TOKEN, DEFAULT_USER }
