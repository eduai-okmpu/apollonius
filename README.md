# Apollonius Problem

An interactive bilingual (Kazakh / English) site that teaches the Apollonius problem:
draw a circle tangent to three given elements, each a point, a line or a circle.

## Flow

1. **Choose** (`#home`): introduction and a picker for the three elements. All ten problems (PPP … CCC) are listed too.
2. **Cases** (`#case-plc`): the configurations of the chosen problem, with the number of solutions for each.
3. **Construct** (`#build-<case-id>`): step-by-step construction with compass and straightedge. The given elements can be dragged.

## Status

Skeleton. The construction for PPP is complete as a sample; other cases show a draft placeholder.

## Run

Static files, no build step. Open `index.html` in a browser or serve the folder:

```bash
python3 -m http.server 8000
```

## Structure

- `index.html` page shell, header, language toggle
- `assets/css/styles.css` design tokens and layout (light and dark)
- `assets/js/i18n.js` interface strings (kz, en)
- `assets/js/data.js` problems, cases, sample geometry and construction steps
- `assets/js/geometry.js` geometry helpers
- `assets/js/render.js` canvas drawing, construction drawings, hit testing
- `assets/js/app.js` views, routing, dragging
