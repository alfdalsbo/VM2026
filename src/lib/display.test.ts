import { describe, expect, it } from "vitest";

import { displayGroupLabel, displayKnockoutPlaceholder, displayTeamName, formatCompactMatchStatus } from "@/lib/display";

describe("display helpers", () => {
  it("shows Norwegian team names without changing unknown names", () => {
    expect(displayTeamName("South Africa")).toBe("Sør-Afrika");
    expect(displayTeamName("Korea Republic")).toBe("Sør-Korea");
    expect(displayTeamName("Czechia")).toBe("Tsjekkia");
    expect(displayTeamName("Bosnia and Herzegovina")).toBe("Bosnia-Hercegovina");
    expect(displayTeamName("Türkiye")).toBe("Tyrkia");
    expect(displayTeamName("Côte d'Ivoire")).toBe("Elfenbenskysten");
    expect(displayTeamName("Cabo Verde")).toBe("Kapp Verde");
    expect(displayTeamName("IR Iran")).toBe("Iran");
    expect(displayTeamName("Netherlands")).toBe("Nederland");
    expect(displayTeamName("Congo DR")).toBe("DR Kongo");
    expect(displayTeamName("Atlantis FC")).toBe("Atlantis FC");
  });

  it("formats group and knockout placeholders for users", () => {
    expect(displayGroupLabel("Group A")).toBe("Gruppe A");
    expect(displayKnockoutPlaceholder("1A")).toBe("Vinner gruppe A");
    expect(displayKnockoutPlaceholder("2B")).toBe("Toer gruppe B");
    expect(displayKnockoutPlaceholder("3CEFHI")).toBe("Treer fra C/E/F/H/I");
    expect(displayKnockoutPlaceholder("W79")).toBe("Vinner kamp 79");
    expect(displayKnockoutPlaceholder("RU101")).toBe("Taper kamp 101");
  });

  it("formats compact match statuses", () => {
    expect(formatCompactMatchStatus({ status: "scheduled", minute: null }).label).toBe("Kommer");
    expect(formatCompactMatchStatus({ status: "live", minute: 63 }).label).toBe("Live 63'");
    expect(formatCompactMatchStatus({ status: "halftime", minute: null }).label).toBe("Pause");
    expect(formatCompactMatchStatus({ status: "finished", minute: null }).label).toBe("Ferdig");
    expect(formatCompactMatchStatus({ status: "postponed", minute: null }).label).toBe("Utsatt");
    expect(formatCompactMatchStatus({ status: "cancelled", minute: null }).label).toBe("Avlyst");
  });
});
