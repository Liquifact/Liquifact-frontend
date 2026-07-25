import { metadata } from "./layout";
import { copy } from "./copy/en";

describe("Root Layout Metadata", () => {
  it("exports base metadata fields correctly", () => {
    expect(metadata.title).toBe(`LiquiFact — ${copy.home.heroTitle}`);
    expect(metadata.description).toBe(copy.home.heroSub);
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it("exports OpenGraph metadata correctly", () => {
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe(`LiquiFact — ${copy.home.heroTitle}`);
    expect(metadata.openGraph?.description).toBe(copy.home.heroSub);
    expect(metadata.openGraph?.url).toBe("/");
    expect(metadata.openGraph?.siteName).toBe("LiquiFact");
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LiquiFact Social Preview",
      },
    ]);
    expect(metadata.openGraph?.locale).toBe("en_US");
    expect(metadata.openGraph?.type).toBe("website");
  });

  it("exports Twitter metadata correctly", () => {
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe(`LiquiFact — ${copy.home.heroTitle}`);
    expect(metadata.twitter?.description).toBe(copy.home.heroSub);
    expect(metadata.twitter?.images).toEqual(["/opengraph-image"]);
  });
});
