# Developer documentation

Deployment steps, layout design notes, and other information for developers
that end users don't need.
(For usage instructions, see [README.md](README.md))

## Deploying to GitHub Pages

1. Push this repository to GitHub (branch name `main`)
2. Open **Settings → Pages** on the GitHub repository
3. Set **Build and deployment → Source** to **GitHub Actions**
4. Pushing to the `main` branch triggers the bundled workflow
   (`.github/workflows/deploy.yml`), which automatically builds and deploys the
   contents of `public/` (it can also be run manually from the Actions tab)
5. Once the deployment finishes, the app is available at the URL shown under
   Settings → Pages

## Running locally

```bash
cd public
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser (press `Ctrl+C` to stop).

## File structure

```
collage-maker/
├── README.md
├── ignore/                    # excluded via .gitignore
├── .github/workflows/deploy.yml
└── public/                    # directory published via GitHub Pages
    ├── index.html
    ├── .nojekyll
    ├── css/style.css
    └── js/
        ├── main.js            # state management and wiring up the UI
        ├── imageManager.js    # adding, removing, and reordering images
        ├── layouts.js         # layout patterns for each photo count (1-15)
        ├── cellEditor.js      # drag & zoom within a cell to set the crop area
        └── exporter.js        # drawing to canvas and exporting as PNG/JPEG
```

## Layout pattern design notes

Since the canvas is a 9:16 portrait, each row can use a different number of
columns to add visual variety, while keeping each cell's area
(row height ÷ columns in that row) roughly even.

To make the most of landscape photos (e.g. 3:2) as-is, the actual pixel aspect
ratio (width ÷ height) of each cell is kept within limited bounds:

- If a cell is too narrow (tall and thin), `object-fit: cover` cropping would
  cut off a large portion of the photo's left/right sides, so the allowed range
  on the "too tall" side is kept narrow.
- If a cell is wide, only the top/bottom get cropped, which is less harmful, so
  the allowed range on the "too wide" side is kept more generous (i.e. wide is
  preferred over tall for the same degree of "extreme").
- Within these bounds, only column counts that fit are used to split a given
  photo count into rows, and every distinct row-order permutation of that
  split is generated as a separate pattern (the number of variations depends
  on the photo count, and can range from a single pattern up to a few dozen).

See the comment at the top of `public/js/layouts.js` and `ROW_PATTERNS` for the
exact formulas and bounds.
