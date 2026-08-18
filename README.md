# Collage Maker

A web app that automatically arranges your photos into an Instagram Story-ratio
(1080×1920px, 9:16) collage and lets you export it as PNG/JPEG on the spot.
No installation required — it runs entirely in the browser.

## Features

- Select up to 15 photos (click or drag & drop)
- Choose from several layout options depending on the number of photos
- Long-press and drag a cell to swap photos between cells
- Drag and scroll/pinch on each photo to adjust position and zoom, controlling the crop area
- Simple styling: cell gap, background color, rounded corners
- Download as PNG or JPEG

## Privacy

- **Images are processed entirely in your browser.** No upload to a server or
  any external network request ever happens. You can open the network tab and
  confirm that no image-related request is sent.
- **EXIF metadata (timestamps, location, etc.) is automatically dropped on export.**
  Because the image is drawn onto a canvas before being exported, metadata from
  the original file is not carried over to the output file.
- No external dependencies — implemented entirely in plain HTML/CSS/JavaScript.

## Usage

1. Select up to 15 photos (click or drag & drop)
2. Remove unwanted photos or reorder them in the thumbnail list
3. Click a layout thumbnail under "Choose a layout" to pick your preferred arrangement
4. Drag each photo within its cell to reposition, and scroll/pinch to zoom and adjust
   the crop area. Long-press a cell and move it to swap with another cell's photo
5. Adjust cell gap, background color, and rounded corners if needed
6. Choose an export format (PNG/JPEG) and download

## For developers

Deployment steps and layout design notes are documented in
[DEVELOPMENT.md](DEVELOPMENT.md).

## License

[MIT](LICENSE)
