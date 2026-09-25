# Git Trigger Remote Workflow

[![GitHub release](https://img.shields.io/github/v/release/LiquidLogicLabs/git-action-trigger-workflow?sort=semver)](https://github.com/LiquidLogicLabs/git-action-trigger-workflow/releases)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-git--action--trigger--workflow-blue?logo=github)](https://github.com/marketplace/actions/git-action-trigger-workflow)

A GitHub Action that triggers a workflow in another repository hosted on **Gitea** or **GitHub** (self-hosted or cloud).

## Features

- ✅ Trigger workflows in the same repository or remote repositories
- ✅ Supports Gitea (self-hosted/cloud) and GitHub/GHES
- ✅ Automatic workflow discovery by name
- ✅ Flexible authentication (explicit token or environment fallback)
- ✅ Support for workflow inputs
- ✅ Verbose logging for debugging
- ✅ Works with Gitea 1.23+ (with endpoint discovery) and GitHub/GHES API

## Quick Start

```yaml
- name: Trigger remote workflow
  uses: LiquidLogicLabs/git-action-trigger-workflow@v2
  with:
    workflow-name: Deploy
```

## Requirements

- Gitea instance with Actions enabled
- Gitea 1.23+ recommended (older versions may have limited API support)
- API token with permissions to:
  - List workflows in the target repository
  - Dispatch workflows in the target repository

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `workflow-name` | ✅ Yes | - | The top-level `name:` field in the workflow YAML file (or filename if no name field exists) |
| `repo` | ❌ No | Current repo | Target repository. Supports `owner/repo` or full URL (GitHub or Gitea) |
| `ref` | ❌ No | `main` | Git ref to run the workflow on (branch/tag/SHA) |
| `base-url` | ❌ No | Auto-inferred | Auto-detected from repo URL or runner env (`GITHUB_SERVER_URL` / `GITEA_SERVER_URL`); override when needed |
| `token` | ❌ No | Runner token | API token (`GITHUB_TOKEN`/`GITEA_TOKEN` or explicit `token`) |
| `inputs` | ❌ No | - | JSON object string of workflow inputs, e.g. `{"env":"prod","dry_run":true}` |
| `skip-certificate-check` | ❌ No | `false` | Skip TLS certificate verification for API calls (self-hosted instances) |
| `verbose` | ❌ No | `false` | Enable verbose logging for debugging |

### Understanding `workflow-name`

The `workflow-name` refers to the **top-level `name:` field** in your workflow YAML file:

```yaml
# .gitea/workflows/deploy.yml
name: Deploy to Production    # ← This is what you use for workflow-name

on:
  workflow_dispatch:
    inputs:
      environment:
        required: true

jobs:
  deploy:                    # ← NOT this (job name)
    steps:
      - name: Build          # ← NOT this (step name)
        run: echo "building"
```

To trigger this workflow, use: `workflow-name: Deploy to Production`

**If the workflow has no `name:` field**, the filename is used as fallback:
```yaml
# .gitea/workflows/build.yml  (no name: field)
on:
  workflow_dispatch:
jobs:
  build:
    steps:
      - run: echo "building"
```

To trigger this workflow, use: `workflow-name: build` (filename without extension)

## Permissions

A token with permission to list and dispatch workflows is required (e.g. default `GITHUB_TOKEN` or `GITEA_TOKEN`). See [Authentication & Permissions](#authentication--permissions) for details.

## Usage Examples

### Basic: Trigger a workflow in the same repo

```yaml
name: Trigger Deployment

on:
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deploy workflow
        uses: LiquidLogicLabs/git-action-trigger-workflow@v2
        with:
          workflow-name: Deploy
```

### Trigger a workflow in a different repo (same instance)

```yaml
name: Trigger Build in Another Repo

on:
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger build workflow
        uses: LiquidLogicLabs/git-action-trigger-workflow@v2
        with:
          repo: other-owner/other-repo
          workflow-name: Build
          ref: main
          inputs: '{"target":"staging","version":"1.0.0"}'
```

### Trigger a workflow on a different Gitea instance

```yaml
name: Trigger Cross-Instance Workflow

on:
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger remote workflow
        uses: LiquidLogicLabs/git-action-trigger-workflow@v2
        with:
          repo: https://gitea.other.example.com/other-owner/other-repo
          workflow-name: Build
          token: ${{ secrets.OTHER_GITEA_TOKEN }}
          verbose: "true"
```

### Trigger a workflow on GitHub (same org)

```yaml
name: Trigger GitHub workflow

on:
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger GitHub workflow
        uses: LiquidLogicLabs/git-action-trigger-workflow@v2
        with:
          repo: owner/repo
          workflow-name: CI
          ref: main
          token: ${{ secrets.GITHUB_TOKEN }}
```

### With workflow inputs

```yaml
- name: Trigger workflow with inputs
  uses: LiquidLogicLabs/git-action-trigger-workflow@v2
  with:
    workflow-name: Deploy
    inputs: |
      {
        "environment": "production",
        "dry_run": false,
        "version": "1.2.3"
      }
```

## Authentication & Permissions

The action requires an API token with sufficient permissions:

- **List workflows**: Read access to the target repository's Actions workflows
- **Dispatch workflows**: Write access to trigger workflow runs

### Token Options

1. **Explicit token** (recommended for cross-instance):
   ```yaml
   token: ${{ secrets.MY_TOKEN }}
   ```

2. **Environment fallback**:
   - GitHub: `GITHUB_TOKEN` (or PAT for cross-repo)
   - Gitea: `GITEA_TOKEN`
   - GitHub or Gitea runners set these automatically

The action sends the token as `Authorization: token <token>` in API requests.

## Troubleshooting

### 401 Unauthorized / 403 Forbidden

**Problem**: Token is missing, invalid, or lacks permissions.

**Solutions**:
- Verify the token has the required scopes (read workflows, dispatch workflows)
- Check that the token is valid and not expired
- For cross-instance, ensure you're using the correct token for that instance
- Enable `verbose: "true"` to see authentication details

### 404 Not Found (listing workflows)

**Problem**: Gitea instance may not expose the Actions workflow listing API.

**Solutions**:
- Verify your Gitea version supports Actions (1.19+)
- Check that Actions are enabled on the instance
- Enable `verbose: "true"` to see which endpoints were tried
- Some older Gitea versions may have limited API support

### Workflow dispatch fails

**Problem**: The target Gitea instance may not support remote workflow dispatch via API.

**Solutions**:
- Ensure the workflow has `workflow_dispatch:` trigger enabled
- Verify the workflow name matches exactly (case-sensitive)
- Enable `verbose: "true"` to see attempted endpoints and responses
- Check Gitea version compatibility (1.23+ recommended)

### Workflow not found

**Problem**: The specified `workflow-name` doesn't match any workflow.

**Solutions**:
- Verify the workflow has a `name:` field or use the filename
- Check that the workflow file is in `.gitea/workflows/` or `.github/workflows/`
- Enable `verbose: "true"` to see all available workflows
- Ensure the workflow is on the specified `ref` branch

## Outputs

| Output | Description |
| ------ | ----------- |
| `status` | HTTP status code returned by the dispatch request (typically `204` on Gitea, `204` on GitHub). |
| `endpoint` | The API endpoint URL used to dispatch the workflow. Useful for debugging which host and path were called. |

```yaml
- name: Trigger workflow
  id: trigger
  uses: LiquidLogicLabs/git-action-trigger-workflow@v2
  with:
    repository: owner/repo
    workflow: deploy.yml
    token: ${{ secrets.DISPATCH_TOKEN }}

- name: Report
  run: echo "dispatched via ${{ steps.trigger.outputs.endpoint }} (HTTP ${{ steps.trigger.outputs.status }})"
```

Failure is still reported through the step status; the outputs describe the dispatch that was made.

## Versioning

This action uses semantic versioning. It's recommended to pin to a major version:

```yaml
uses: LiquidLogicLabs/git-action-trigger-workflow@v2  # Recommended
```

Or pin to a specific version:

```yaml
uses: LiquidLogicLabs/git-action-trigger-workflow@v2  # Specific version (pick a tag from Releases)
```

## Documentation

For developers and contributors:

- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, development workflow, and contributing guidelines
- **[Testing Guide](docs/TESTING.md)** - Complete testing documentation
  - E2E tests use real APIs and skip automatically if `TEST_*` env/secrets are not provided.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/LiquidLogicLabs/git-action-trigger-workflow#readme)
- 🐛 [Report Issues](https://github.com/LiquidLogicLabs/git-action-trigger-workflow/issues)
- 💬 [Discussions](https://github.com/LiquidLogicLabs/git-action-trigger-workflow/discussions)
