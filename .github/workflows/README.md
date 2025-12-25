# Docker Build and Publish Workflow

This GitHub Actions workflow automatically builds and publishes the QR Hunt Docker image to GitHub Container Registry (ghcr.io).

## Workflow Triggers

The workflow runs on:

- **Push to main branch**: Builds and pushes the `latest` tag
- **Version tags** (e.g., `v1.0.0`): Builds and pushes semantic version tags
- **Pull requests**: Builds the image but doesn't push (for validation)
- **Manual dispatch**: Can be triggered manually from the Actions tab

## Docker Image Location

The built images are published to:
```
ghcr.io/nunotek/qr-hunt
```

## Available Tags

- `latest` - Latest build from the main branch
- `main` - Latest build from the main branch
- `v1.0.0` - Semantic version tags (when using git tags)
- `v1.0` - Major.minor version tags
- `v1` - Major version tags
- `main-<sha>` - Branch-specific SHA tags

## Multi-Platform Support

The workflow builds images for:
- `linux/amd64` - x86_64 architecture
- `linux/arm64` - ARM64 architecture (Apple Silicon, ARM servers)

## Using the Pre-built Image

### With Docker Compose

Edit `docker-compose.yml` and uncomment the image line:

```yaml
qr-hunt:
  image: ghcr.io/nunotek/qr-hunt:latest
  # Comment out the build section when using pre-built image
```

### With Docker CLI

```bash
docker pull ghcr.io/nunotek/qr-hunt:latest
docker run -p 3000:3000 \
  -e ADMIN_CODE=your-admin-code \
  -e COOKIE_SECRET=your-secret \
  -v qr-hunt-data:/app/data \
  ghcr.io/nunotek/qr-hunt:latest
```

## Workflow Features

- **Build Cache**: Uses GitHub Actions cache to speed up subsequent builds
- **Multi-platform**: Builds for both AMD64 and ARM64 architectures
- **Artifact Attestation**: Generates build provenance for security and supply chain verification
- **Automatic Tagging**: Smart tagging based on git refs and semver patterns
- **Security**: Only pushes on non-PR events, uses GitHub token for authentication

## Troubleshooting

### Workflow Fails on First Run

The first time the workflow runs, it may take longer due to:
- Initial cache population
- Multi-platform build setup

### Permission Errors

The workflow requires the following permissions:
- `contents: read` - To checkout the repository
- `packages: write` - To push to GitHub Container Registry
- `id-token: write` - For artifact attestation

These are configured in the workflow file and should work automatically.

## Manual Trigger

To manually trigger a build:

1. Go to the Actions tab in the GitHub repository
2. Select "Build and Publish Docker Image" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## Monitoring

You can view:
- **Workflow runs**: GitHub Actions tab
- **Published images**: GitHub Packages tab
- **Image details**: `https://github.com/NunoTek/QR-Hunt/pkgs/container/qr-hunt`
