/**
 * GitHub E2E tests for trigger-workflow.
 * Requires GITHUB_TOKEN or TEST_GITHUB_TOKEN; uses TEST_GITHUB_REPO (default: LiquidLogicLabs/git-action-release-tests).
 * For dispatch test, set TEST_GITHUB_WORKFLOW="E2E Trigger Test" (workflow in test repo).
 */
import { createGithubClient } from '../src/platforms/github';
import { createHttpClient } from '../src/http/client';
import { Logger } from '../src/logger';

const token = process.env.TEST_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const repo = process.env.TEST_GITHUB_REPO || 'LiquidLogicLabs/git-action-release-tests';
const serverUrl = process.env.TEST_GITHUB_SERVER_URL || 'https://github.com';
const apiUrl = process.env.TEST_GITHUB_API_URL || 'https://api.github.com';
const workflowName = process.env.TEST_GITHUB_WORKFLOW;
const ref = process.env.TEST_GITHUB_REF || 'main';

const logger = new Logger(false);

const [envOwner, envRepoName] = (repo || '').split('/');

// Skip, do not throw, when no token is available -- see the note in gitea.e2e.test.ts.
const githubConfigured = Boolean(token && envOwner && envRepoName);
const describeGithub = githubConfigured ? describe : describe.skip;

describeGithub('github e2e', () => {
  const owner = envOwner;
  const repoName = envRepoName;

  const http = createHttpClient({
    baseUrl: apiUrl,
    // See the note in gitea.e2e.test.ts: describe.skip still evaluates this body.
    token: token ?? 'unset',
    logger,
    verbose: false,
    userAgent: 'git-action-trigger-workflow-e2e',
  });

  const client = createGithubClient({
    baseUrl: serverUrl,
    apiBaseUrl: apiUrl,
    http,
    logger,
    owner,
    repo: repoName,
    token: token ?? 'unset',
    verbose: false,
  });

  test('lists workflows', async () => {
    const { workflows } = await client.listWorkflows();
    expect(Array.isArray(workflows)).toBe(true);
  });

  // Needs TEST_GITHUB_WORKFLOW on top of the suite's own configuration.
  const testDispatch = workflowName ? test : test.skip;
  testDispatch('dispatches workflow when name provided', async () => {
    // Non-null is sound here: testDispatch is test.skip unless workflowName is set.
    // The previous `if (!workflowName) throw` provided this narrowing.
    const wanted = workflowName as string;
    const { workflows } = await client.listWorkflows();
    const wf = workflows.find((w) => w.name === wanted || w.path?.includes(wanted));
    if (!wf) {
      throw new Error(`Workflow '${wanted}' not found in repository ${repo}`);
    }
    const res = await client.dispatchWorkflow(wf, ref, {});
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });
});

