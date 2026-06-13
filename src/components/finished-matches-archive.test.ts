import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FinishedMatchesArchive } from "@/components/finished-matches-archive";

describe("FinishedMatchesArchive", () => {
  it("renders closed by default", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        FinishedMatchesArchive,
        { dayCount: 2, matchCount: 3, matchIds: ["m001", "m002", "m003"] },
        React.createElement("div", null, "Arkivkamp"),
      ),
    );

    expect(html).toContain("aria-expanded=\"false\"");
    expect(html).toContain("Åpne arkivet");
    expect(html).toContain("3 ferdigspilte kamper");
    expect(html).not.toContain("Arkivkamp");
  });

  it("renders archived matches when opened", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        FinishedMatchesArchive,
        { dayCount: 1, defaultOpen: true, matchCount: 1, matchIds: ["m001"] },
        React.createElement("article", { id: "m001" }, "Mexico - Sør-Afrika"),
      ),
    );

    expect(html).toContain("aria-expanded=\"true\"");
    expect(html).toContain("Skjul arkivet");
    expect(html).toContain("1 ferdigspilt kamp");
    expect(html).toContain("data-match-ids=\"m001\"");
    expect(html).toContain("Mexico - Sør-Afrika");
  });
});
