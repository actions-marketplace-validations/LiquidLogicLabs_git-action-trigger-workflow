import { createGiteaClient } from '../src/platforms/gitea';
import { createHttpClient } from '../src/http/client';
import { Logger } from '../src/logger';

const token = process.env.TEST_GITEA_TOKEN;
const repo = process.env.TEST_GITEA_REPO; // owner/repo
const serverUrl = process.env.TEST_GITEA_URL;
const workflowName = process.env.TEST_GITEA_WORKFLOW;
const ref = process.env.TEST_GITEA_REF || 'main';

const logger = new Logger(false);

const [envOwner, envRepoName] = (repo || '').split('/');

// Skip, do not throw, when the external Gitea target is not configured. The repo
// convention is that external-integration tests skip gracefully when secrets are
// absent (CLAUDE.md); throwing made `npm test` fail on any machine without these
// variables, including the local orchestrator, while CI stayed green only because
// it runs test:unit, which excludes this directory.
const giteaConfigured = Boolean(token && repo && serverUrl && envOwner && envRepoName);
const describeGitea = giteaConfigured ? describe : describe.skip;

describeGitea('gitea e2e', () => {
  const owner = envOwner;
  const repoName = envRepoName;

  const http = createHttpClient({
    // Defaults only matter when the suite is skipped: describe.skip still evaluates
    // this body to register the skipped tests, so construction must not throw.
    baseUrl: serverUrl ?? 'http://gitea.invalid',
    token: token ?? 'unset',
    logger,
    verbose: false,
    userAgent: 'git-action-trigger-workflow-e2e',
  });

  const client = createGiteaClient({
    baseUrl: serverUrl!,
    apiBaseUrl: serverUrl ?? 'http://gitea.invalid',
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

  // Needs TEST_GITEA_WORKFLOW on top of the suite's own configuration.
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

