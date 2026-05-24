export const footballCopy = {
  dashboardFallback: "Ingen kamper å tippe akkurat nå. Dommerbordet holder blyanten varm.",
  lockedLabel: "Kupongen er låst",
  lockError: "Dommeren har blåst i gang. Kupongen er låst.",
  predictionNote: "Kupongen kan justeres helt til avspark. Etter fløyta er den del av arkivet.",
  predictionSaved: "Tipset er levert til dommerbordet.",
};

export const dashboardLines = [
  "Før avspark er alle landslagssjefer. Etterpå kommer protokollen.",
  "Kupongen er åpen. Selvtilliten er foreløpig ikke VAR-sjekket.",
  "Tabellen lyver ikke, men den har dårlig folkeskikk.",
  "Alle tips føres med alvor. Alle bortforklaringer arkiveres med glede.",
  "Kampdag i kjelleren: presisjon belønnes, skråsikkerhet noteres.",
];

export function pickDashboardLine(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return dashboardLines[hash % dashboardLines.length];
}
