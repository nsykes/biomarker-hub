import { toBlob } from "html-to-image";

export async function copyElementAsPng(el: HTMLElement): Promise<void> {
  const surface = getComputedStyle(document.body)
    .getPropertyValue("--color-surface")
    .trim();

  const blob = await toBlob(el, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: surface || "#ffffff",
    filter: (node) =>
      !(node instanceof HTMLElement) || node.dataset.exportHide !== "true",
  });

  if (!blob) {
    throw new Error("Failed to render chart to image");
  }

  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}
