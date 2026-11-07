# Apollonius Problem

An interactive bilingual (Kazakh / English) site that teaches the Apollonius problem:
draw a circle tangent to three given elements, each a point, a line or a circle.

## Flow

1. **Choose** (`#home`): introduction and a picker for the three elements. All ten problems (PPP … CCC) are listed too.
2. **Cases** (`#case-plc`): the configurations of the chosen problem, with the number of solutions for each.
3. **Construct** (`#build-<case-id>`): step-by-step construction with compass and straightedge. The given elements can be dragged.

## How the constructions work

`assets/js/construct.js` builds every problem with classical compass-and-straightedge methods and records each step with its drawing:

| Problem | Method |
| --- | --- |
| PPP | Perpendicular bisectors meet at the circumcentre |
| PPL | Power of a point: MT² = MA·MB gives the tangency points on the line |
| PLL | Angle bisector plus homothety from the vertex |
| LLL | Inner and outer angle bisectors (incircle and excircles) |
| PPC | Helper circle and radical centre, then tangents from it |
| PLC | Ends of the diameter perpendicular to the line give a second point, reducing to PPL |
| PCC | Centres of similarity give a second point, reducing to PPC |
| LLC | Shrink the circle to its centre and shift the lines, reducing to PLL |
| LCC | Shrink the smaller circle, reducing to PLC |
| CCC | Shrink the smallest circle, reducing to PCC |

Every answer is checked for tangency against the original elements. As the user drags, the steps, the detected case and the number of solutions update live.

## Run

Static files, no build step. Open `index.html` in a browser or serve the folder:

```bash
python3 -m http.server 8000
```

## PDF report

The **PDF** button on the construction page opens a preview of the document for the current figure. Next to the preview are 33 settings: author, group, institution, supervisor, city, date, document language, paper size, margins (including GOST 30/10/20/20 mm), font size, line spacing, sections, figures, colour and more. The preview and the file come from the same layout, so the download matches what you see. Settings are remembered in the browser.

The PDF uses Literata (SIL Open Font License), embedded so Kazakh letters render everywhere. jsPDF is loaded from cdnjs when the dialog first opens.

## Structure

- `index.html` page shell, header, language toggle
- `assets/css/styles.css` design tokens and layout (light and dark)
- `assets/js/i18n.js` interface strings (kz, en)
- `assets/js/data.js` problems, cases, sample geometry and construction steps
- `assets/js/geometry.js` geometry helpers
- `assets/js/render.js` canvas drawing, construction drawings, hit testing
- `assets/js/app.js` views, routing, dragging, pan/zoom, full screen
- `assets/js/report.js` PDF dialog: settings, page layout, preview, export
- `assets/js/fonts-literata.js` embedded font for the PDF (loaded on demand)
