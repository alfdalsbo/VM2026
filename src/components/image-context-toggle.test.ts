import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ImageContextToggle } from "@/components/image-context-toggle";

describe("ImageContextToggle", () => {
  it("renders the full image context when opened", () => {
    const html = renderToStaticMarkup(
      React.createElement(ImageContextToggle, {
        title: "Flopass3",
        caption: "Et pasningsdiagram fra Norge-Brasil.",
        context: "Et lite stykke norsk VM-metode.",
        facts: ["Flo scoret mot Brasil.", "Norge vant 2-1."],
        credit: "Wikimedia Commons",
        license: "CC BY-SA 4.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Flopass3.jpg",
        defaultOpen: true,
      }),
    );

    expect(html).toContain("aria-expanded=\"true\"");
    expect(html).toContain("Hva ser vi?");
    expect(html).toContain("Hvorfor betyr det noe?");
    expect(html).toContain("Nerdekrok");
    expect(html).toContain("Wikimedia Commons · CC BY-SA 4.0");
    expect(html).toContain("Kilde");
  });

  it("omits optional rows when context metadata is missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(ImageContextToggle, {
        title: "Arkivkort",
        caption: "Et typografisk arkivkort.",
        context: "Brukes når bildet ikke er klarert.",
        defaultOpen: true,
      }),
    );

    expect(html).toContain("Hva ser vi?");
    expect(html).not.toContain("Nerdekrok");
    expect(html).not.toContain(" · ");
    expect(html).not.toContain(">Kilde</a>");
  });
});
