import { pdf, Document, Page, Image as PdfImage, StyleSheet } from "@react-pdf/renderer";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/deckThemes";

const styles = StyleSheet.create({
  page: { padding: 0 },
  image: { width: "100%", height: "100%" },
});

// One full-bleed image per slide — each slide is a freeform Konva canvas (arbitrary
// positioned text/shapes/charts), not the kind of flowing content @react-pdf/renderer's
// own primitives are meant to lay out, so a pre-rendered PNG per page is the direct,
// reliable option rather than re-deriving each slide's layout in PDF primitives.
function DeckPdfDoc({ productName, slideImages }: { productName: string; slideImages: string[] }) {
  return (
    <Document title={`${productName} | Teardown Deck`} author="Tear">
      {slideImages.map((src, i) => (
        <Page key={i} size={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }} style={styles.page}>
          <PdfImage src={src} style={styles.image} />
        </Page>
      ))}
    </Document>
  );
}

export async function downloadDeckPdf(productName: string, slideImages: string[]) {
  const blob = await pdf(<DeckPdfDoc productName={productName} slideImages={slideImages} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${productName.replace(/\s+/g, "-").toLowerCase()}-deck.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
