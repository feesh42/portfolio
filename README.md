# DEMOS

A single-page portfolio for [feesh42](https://github.com/feesh42), built with vanilla JavaScript and Vite.

## Development

Use Node.js 24. Run `npm ci`, then `npm run dev`. Use `npm run build` to produce `dist/`, and `npm run preview` to serve the build locally.

## Project listings

The page reads the public GitHub repository list on load. It includes owner repositories and excludes forks, archived repositories, this portfolio, and repos tagged `portfolio-hidden`. A private repository becomes eligible once it is made public. If GitHub is unreachable or rate-limited, the page uses the bundled snapshot in `src/projects.js`.

Use the repository’s GitHub **About** description and **Website** for the description and live demo. When there is no demo URL, the tile links to GitHub. Add the `portfolio` topic and a `portfolio.json` file at the root of the default branch to customize a card. All fields are optional.

```json
{
  "title": "Example Project",
  "description": "One sentence explaining what the project does.",
  "demo": "https://example.vercel.app",
  "thumbnail": "docs/preview.webp",
  "gif": "docs/preview.gif"
}
```

Media can use repository-relative paths or absolute HTTPS URLs. Pair a GIF with a still to show the still by default and play the GIF on mouse hover. The repository’s social preview remains useful for sharing on GitHub. The manifest defines what the portfolio displays.

## Vercel

Import `feesh42/portfolio` into Vercel as a Vite project and select `main` as the production branch. The checked-in `vercel.json` sets the framework and output directory. Vercel builds with `npm run build` and serves `dist/`. The site uses public GitHub data and requires no application secrets.
