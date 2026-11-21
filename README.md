# Projects

A single-page portfolio for [feesh42](https://github.com/feesh42), built with vanilla JavaScript and Vite.

## Development

Use Node.js 24. Run `npm ci`, then `npm run dev`. Use `npm run build` to produce `dist/`, and `npm run preview` to serve the build locally.

## Project listings

Each project opts in by placing **`<repository-name>.portfolio.json`** at the root of its default branch. Match the repository name and case exactly (for example, `my-project.portfolio.json` for `my-project`). The build discovers public repositories and generates the catalog from their manifests. The browser checks GitHub directly when the build catalog is unavailable. Trigger a portfolio rebuild after changing manifests or making a project public.

```json
{
  "title": "Example Project",
  "description": "One sentence explaining what the project does.",
  "deployment": "https://example.vercel.app",
  "thumbnail": "docs/preview.webp",
  "gif": "docs/preview.gif",
  "art": "generic"
}
```

Title and description are required. Use `null` for a missing deployment URL, thumbnail or GIF. Visit falls back to the GitHub profile if no deployment URL is set. Media paths are relative to the manifest or absolute HTTPS URLs. A still image with a GIF swaps to the GIF on mouse hover. The optional `art` field selects fallback art (`generic`, `tabs`, `links`, `button`, or `scholar`). Manifests in private repositories stay private.

## Vercel

Import `feesh42/portfolio` into Vercel as a Vite project and select `main` as the production branch. The checked-in `vercel.json` sets the framework and output directory. Vercel builds with `npm run build` and serves `dist/`. The site uses public GitHub data and requires no application secrets.
