import type { Standing, WorldCupMatch } from "@/lib/types";
import {
  getApprovedWorldCupImages,
  getRelevantWorldCupImages,
  getWorldCupImageById,
  type WorldCupImageAsset,
} from "@/lib/world-cup-image-assets";

export type NostalgiaSource = {
  name: string;
  url: string;
};

export type NostalgiaImage = WorldCupImageAsset;

export type NostalgiaMoment = {
  id: string;
  year: string;
  title: string;
  body: string;
  cellarVerdict: string;
  teams: string[];
  matchIds?: string[];
  imageIds?: string[];
  tags: string[];
  source: NostalgiaSource;
};

export type TeamNostalgiaProfile = {
  teamName: string;
  bestWorldCup: string;
  cultHeroes: string[];
  scar: string;
  signatureMatch: string;
  cellarAngle: string;
};

export type BadgeTheme = {
  id: "rekdal-pen" | "rossi-row" | "maracanazo-alert" | "baggio-miss" | "zidane-glance";
  title: string;
  text: string;
};

export type NostalgiaArchive = {
  timeline: NostalgiaMoment[];
  championWall: Array<{
    team: string;
    titles: string;
    note: string;
  }>;
  formatFacts: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  norwayNotes: string[];
  imageWall: WorldCupImageAsset[];
};

const fifaEarlySource: NostalgiaSource = {
  name: "FIFA: World Cup champions 1930-1978",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/articles/world-cup-champions-1930-1978-uruguay-italy-germany-brazil-england-argentina",
};

const fifaModernSource: NostalgiaSource = {
  name: "FIFA: World Cup champions 1982-2022",
  url: "https://www.fifa.com/en/articles/world-cup-champions-1982-2022-italy-argentina-germany-brazil-france-spain",
};

const fifaNorwaySource: NostalgiaSource = {
  name: "FIFA: Norway team profile and history",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/norway-team-profile-history?searchOverlay=1",
};

const fifaFormatSource: NostalgiaSource = {
  name: "FIFA: World Cup 2026 format",
  url: "https://gpcustomersupportfwc2026.tickets.fifa.com/hc/en-gb/articles/28784798873117-9-What-is-the-format-for-the-FIFA-World-Cup-2026-tournament",
};

export const worldCupNostalgiaMoments: NostalgiaMoment[] = [
  {
    id: "uruguay-1930",
    year: "1930",
    title: "Rimet starter protokollen",
    body: "Uruguay vant det første VM i Montevideo, i et mesterskap der hele ideen fortsatt var ny og lett mistrodd.",
    cellarVerdict: "Dette er ur-kupongen: få lag, lang reise, maksimal selvhøytidelighet.",
    teams: ["Uruguay", "Argentina"],
    tags: ["timeline", "champion", "rimet"],
    source: fifaEarlySource,
    imageIds: ["uruguay-argentina-final-0a3cccbc"],
  },
  {
    id: "italy-1938",
    year: "1938",
    title: "Italia gjør reprise før reprise var moderne",
    body: "Italia ble første nasjon som forsvarte VM-tittelen, med Vittorio Pozzo som den eneste treneren med to VM-gull.",
    cellarVerdict: "Kjelleren noterer: én tittel kan være form. To på rad er en sak for dommerbordet.",
    teams: ["Italy"],
    tags: ["timeline", "champion"],
    source: fifaEarlySource,
  },
  {
    id: "maracanazo-1950",
    year: "1950",
    title: "Maracanazo blir fotballens åpne sår",
    body: "Uruguay snudde Brasils forventede kroning i Rio og ga VM-historien sin mest berømte stillhet.",
    cellarVerdict: "Alle sikre tips har en liten Maracanazo i lomma.",
    teams: ["Uruguay", "Brazil"],
    tags: ["timeline", "upset", "badge"],
    source: fifaEarlySource,
  },
  {
    id: "brazil-1970",
    year: "1970",
    title: "Brasil gjør VM til kunstfag",
    body: "Pelé, Jairzinho, Rivelino og Carlos Alberto gjorde Mexico 1970 til målestokken for vakkert, brutalt effektivt VM-spill.",
    cellarVerdict: "Dette er øyeblikket alle Brasil-tips fortsatt prøver å late som de bygger på.",
    teams: ["Brazil"],
    matchIds: ["m007", "m029", "m049"],
    tags: ["timeline", "champion", "brazil"],
    source: fifaEarlySource,
  },
  {
    id: "maradona-1986",
    year: "1986",
    title: "Maradona gjør Mexico til egen scene",
    body: "Argentina vant med Diego Maradona som turneringens gravitasjonssenter, fra kaos til kontroll i samme kamp.",
    cellarVerdict: "Når én mann bærer hele kupongen, kaller vi det ikke analyse. Vi kaller det 1986.",
    teams: ["Argentina"],
    matchIds: ["m019", "m043", "m070"],
    tags: ["timeline", "champion", "argentina"],
    source: fifaModernSource,
  },
  {
    id: "baggio-1994",
    year: "1994",
    title: "Baggio sender himmelen over mål",
    body: "USA-finalen ble avgjort på straffer, og Roberto Baggios bom gjorde én enkelt skyhøy ball til VM-mytologi.",
    cellarVerdict: "Et minutt for evigheten, og en vennlig påminnelse om at selvtillit ikke er treffsikkerhet.",
    teams: ["Brazil", "Italy"],
    tags: ["timeline", "penalties", "badge"],
    source: fifaModernSource,
  },
  {
    id: "norway-return-2026",
    year: "2026",
    title: "Norge åpner arkivet igjen",
    body: "Norge er tilbake i VM etter 28 år, med 1938, 1994 og 1998 som små, støvete mapper bak årets kupong.",
    cellarVerdict: "Rekdal-pennen er ikke borte. Den ligger bare i en skuff og venter på avspark.",
    teams: ["Norway"],
    matchIds: ["m018", "m041", "m061"],
    imageIds: ["flopass3-e5ebe8bf"],
    tags: ["norway", "2026", "return"],
    source: fifaNorwaySource,
  },
  {
    id: "france-1998",
    year: "1998",
    title: "Zidane løfter Frankrike inn i kanon",
    body: "Frankrike vant sitt første VM hjemme i 1998, og gjorde finalen mot Brasil til en blå nasjonal fortelling.",
    cellarVerdict: "Frankrike-tips må alltid svare på ett spørsmål: er dette eleganse eller bare veldig dyr orden?",
    teams: ["France"],
    matchIds: ["m042", "m061"],
    tags: ["timeline", "champion", "france"],
    source: fifaModernSource,
  },
  {
    id: "bergkamp-1998",
    year: "1998",
    title: "Bergkamp gjør langballen fin",
    body: "Nederland slo Argentina i Marseille etter en lang pasning, en førsteberøring og en avslutning som fortsatt får taktiske tavler til å rødme.",
    cellarVerdict: "Når ett oppspill blir pensum, er det lov å late som man alltid trodde på direkte spill.",
    teams: ["Netherlands", "Argentina"],
    imageIds: ["bergkampscore3-e97db9ac"],
    tags: ["timeline", "netherlands", "argentina", "diagram"],
    source: fifaModernSource,
  },
  {
    id: "netherlands-brazil-1998",
    year: "1998",
    title: "Semifinalen uten høflighetsfraser",
    body: "Nederland og Brasil dro 1998-semifinalen helt til straffer, med dueller som forklarte hvorfor finalebilletter sjelden deles ut pent.",
    cellarVerdict: "Dette er VM når glansbildene har tatt av seg slipset.",
    teams: ["Netherlands", "Brazil"],
    tags: ["brazil", "netherlands", "semifinal"],
    source: fifaModernSource,
  },
  {
    id: "senegal-2002",
    year: "2002",
    title: "Senegal åpner døra med et brak",
    body: "Senegal slo regjerende mester Frankrike i åpningskampen i 2002 og lærte verden å holde igjen på forhåndskonklusjoner.",
    cellarVerdict: "Når Senegal står på kortet, bør skråsikkerhet leveres med hjelm.",
    teams: ["Senegal", "France"],
    matchIds: ["m017", "m041"],
    tags: ["upset", "senegal", "france"],
    source: fifaModernSource,
  },
  {
    id: "ronaldo-2002",
    year: "2002",
    title: "Ronaldo fullfører returen",
    body: "Brasil tok sin femte VM-tittel i Yokohama, med Ronaldo som turneringens målgaranti og finalens klare punktum.",
    cellarVerdict: "Noen ganger er analysen enkel: niere scorer, alle nikker alvorlig.",
    teams: ["Brazil", "Germany"],
    tags: ["timeline", "champion", "brazil"],
    source: fifaModernSource,
  },
  {
    id: "spain-2010",
    year: "2010",
    title: "Spania gjør 1-0 til livsstil",
    body: "Spania vant sitt første VM etter tre strake 1-0-kamper i utslaget og Iniesta som siste pennestrøk.",
    cellarVerdict: "Ikke alle store kuponger bråker. Noen bare holder ballen til rommet gir opp.",
    teams: ["Spain", "Netherlands"],
    matchIds: ["m011", "m035", "m058", "m014", "m038", "m066"],
    tags: ["timeline", "champion", "spain"],
    source: fifaModernSource,
  },
  {
    id: "germany-2014",
    year: "2014",
    title: "Tyskland teller til sju",
    body: "Tysklands 7-1 mot Brasil i 2014 står igjen som et resultat som fortsatt ser ut som en skrivefeil.",
    cellarVerdict: "En påminnelse om at kampplan og katastrofe av og til bruker samme inngang.",
    teams: ["Germany", "Brazil"],
    matchIds: ["m010", "m033", "m056"],
    tags: ["timeline", "germany", "brazil"],
    source: fifaModernSource,
  },
  {
    id: "england-croatia-2018",
    year: "2018",
    title: "Croatia tar ekstraomgangene personlig",
    body: "Croatia stoppet Englands finalevisjon i 2018, og viste at slitne bein kan bære et helt lands overmot.",
    cellarVerdict: "England-Croatia er aldri bare en kamp. Det er et møte mellom sang, arr og ekstraomganger.",
    teams: ["England", "Croatia"],
    matchIds: ["m022"],
    tags: ["england", "croatia", "knockout"],
    source: fifaModernSource,
  },
  {
    id: "messi-2022",
    year: "2022",
    title: "Messi får siste kvittering",
    body: "Argentina vant en finaleklassiker mot Frankrike i Qatar, med Messi, Mbappé og straffer i samme trykkoker.",
    cellarVerdict: "Finaler skal ikke være ryddige. De skal være noe folk fortsatt krangler om når kaffen er kald.",
    teams: ["Argentina", "France"],
    matchIds: ["m104"],
    tags: ["timeline", "champion", "final"],
    source: fifaModernSource,
  },
  {
    id: "world-cup-2026-format",
    year: "2026",
    title: "VM blir større enn notatblokka",
    body: "2026-utgaven har 48 lag, 12 grupper og 104 kamper, med ny 32-delsfinale før den vanlige utslagsnerven.",
    cellarVerdict: "Flere kamper betyr flere poeng, flere forklaringer og flere sjanser til å si at man så det komme.",
    teams: [],
    tags: ["format", "2026", "archive"],
    source: fifaFormatSource,
  },
];

const teamProfiles: Record<string, TeamNostalgiaProfile> = {
  Argentina: {
    teamName: "Argentina",
    bestWorldCup: "Mester i 1978, 1986 og 2022.",
    cultHeroes: ["Diego Maradona", "Lionel Messi", "Mario Kempes"],
    scar: "Finaletapene i 1990 og 2014 gjør selv gullnasjoner litt mørke i blikket.",
    signatureMatch: "Argentina - Frankrike 3-3, finale 2022.",
    cellarAngle: "Argentina er alltid litt poesi, litt rettssak og litt straffespark.",
  },
  Brazil: {
    teamName: "Brazil",
    bestWorldCup: "Rekordnasjon med fem VM-gull.",
    cultHeroes: ["Pelé", "Ronaldo", "Romário", "Jairzinho"],
    scar: "Maracanazo i 1950 og 7-1 i 2014 ligger fortsatt i samme arkivskap.",
    signatureMatch: "Brasil - Italia 4-1, finale 1970.",
    cellarAngle: "Brasil gir alle tips en liten fristelse til å bli romantiske.",
  },
  Croatia: {
    teamName: "Croatia",
    bestWorldCup: "Finale i 2018 og bronse i 1998 og 2022.",
    cultHeroes: ["Davor Šuker", "Luka Modrić", "Zvonimir Boban"],
    scar: "Så nær, så ofte, og alltid med ekstraomgangene i baklomma.",
    signatureMatch: "Croatia - England 2-1 etter ekstraomganger, semifinale 2018.",
    cellarAngle: "Croatia er laget for alle som tror erfaring er en egen dødball.",
  },
  England: {
    teamName: "England",
    bestWorldCup: "Mester hjemme i 1966.",
    cultHeroes: ["Bobby Charlton", "Gary Lineker", "Paul Gascoigne"],
    scar: "Straffer, stolper og sanger som bærer mer historie enn godt er.",
    signatureMatch: "England - Vest-Tyskland 4-2, finale 1966.",
    cellarAngle: "England-tips bør leveres med både brystkasse og forbehold.",
  },
  France: {
    teamName: "France",
    bestWorldCup: "Mester i 1998 og 2018.",
    cultHeroes: ["Zinedine Zidane", "Thierry Henry", "Kylian Mbappé"],
    scar: "2002-åpningen mot Senegal og 2006-finalen gjør elegansen mindre glatt.",
    signatureMatch: "Frankrike - Brasil 3-0, finale 1998.",
    cellarAngle: "Frankrike er luksus med innebygd varsellampe.",
  },
  Germany: {
    teamName: "Germany",
    bestWorldCup: "Fire VM-gull og en historikk som sjelden ber om unnskyldning.",
    cultHeroes: ["Franz Beckenbauer", "Gerd Müller", "Miroslav Klose"],
    scar: "Når Tyskland ryker tidlig, føles det som om regnearket har fått feber.",
    signatureMatch: "Brasil - Tyskland 1-7, semifinale 2014.",
    cellarAngle: "Tyskland er det tryggeste tipset helt til det plutselig ikke er det.",
  },
  Mexico: {
    teamName: "Mexico",
    bestWorldCup: "Kvartfinale på hjemmebane i 1970 og 1986.",
    cultHeroes: ["Hugo Sánchez", "Jorge Campos", "Rafael Márquez"],
    scar: "Den evige jakten på det femte utslagssteget.",
    signatureMatch: "Mexico som VM-vert i 1970 og 1986.",
    cellarAngle: "Mexico gjør åpningskamper til seremoni og tabeller til familiedrama.",
  },
  Morocco: {
    teamName: "Morocco",
    bestWorldCup: "Semifinale i 2022, først for et afrikansk landslag.",
    cultHeroes: ["Mustapha Hadji", "Noureddine Naybet", "Achraf Hakimi"],
    scar: "Så mye nesten-historie før 2022 endelig flyttet grensen.",
    signatureMatch: "Marokko - Portugal 1-0, kvartfinale 2022.",
    cellarAngle: "Marokko er laget som minner kjelleren om å ikke undervurdere struktur.",
  },
  Netherlands: {
    teamName: "Netherlands",
    bestWorldCup: "Tre finaler, ingen gull, ubehagelig mye stil.",
    cultHeroes: ["Johan Cruyff", "Dennis Bergkamp", "Ruud Gullit"],
    scar: "1974, 1978 og 2010: tre finaler som fortsatt står og banker på.",
    signatureMatch: "Nederland - Argentina 2-1, kvartfinale 1998.",
    cellarAngle: "Nederland er vakker nok til å lure kupongen og sårbar nok til å knuse den.",
  },
  Norway: {
    teamName: "Norway",
    bestWorldCup: "Åttedelsfinale i 1938 og 1998.",
    cultHeroes: ["Kjetil Rekdal", "Tore André Flo", "Egil Olsen"],
    scar: "Italia dukket opp i 1938, 1994 og 1998 som en altfor punktlig regning.",
    signatureMatch: "Norge - Brasil 2-1, gruppespill 1998.",
    cellarAngle: "Norge er ikke nostalgi i denne appen. Norge er et pågående kontrollspørsmål.",
  },
  Portugal: {
    teamName: "Portugal",
    bestWorldCup: "Tredjeplass i 1966.",
    cultHeroes: ["Eusébio", "Luís Figo", "Cristiano Ronaldo"],
    scar: "For mye talent har ofte møtt for lite turneringsfred.",
    signatureMatch: "Portugal - Nord-Korea 5-3, kvartfinale 1966.",
    cellarAngle: "Portugal får alle til å spørre om dette endelig er året, igjen.",
  },
  Senegal: {
    teamName: "Senegal",
    bestWorldCup: "Kvartfinale i debuten i 2002.",
    cultHeroes: ["Papa Bouba Diop", "El Hadji Diouf", "Henri Camara"],
    scar: "Debuten var så sterk at alt etterpå må måles mot et brak.",
    signatureMatch: "Senegal - Frankrike 1-0, åpningskamp 2002.",
    cellarAngle: "Senegal er selve påminnelsen om at åpningskamper ikke leser manus.",
  },
  Spain: {
    teamName: "Spain",
    bestWorldCup: "Mester i 2010.",
    cultHeroes: ["Andrés Iniesta", "Xavi", "Iker Casillas"],
    scar: "Før 2010 var Spania ofte favoritten som pakket kofferten for tidlig.",
    signatureMatch: "Nederland - Spania 0-1, finale 2010.",
    cellarAngle: "Spania er for dem som tror ballbesittelse også kan være et karaktertrekk.",
  },
  Sweden: {
    teamName: "Sweden",
    bestWorldCup: "Finale på hjemmebane i 1958.",
    cultHeroes: ["Nils Liedholm", "Tomas Brolin", "Henrik Larsson"],
    scar: "1958-finalen kom med både stolthet og brasiliansk realitetsorientering.",
    signatureMatch: "Sverige - Bulgaria 4-0, bronsefinale 1994.",
    cellarAngle: "Sverige er naboen som plutselig har bedre turnerings-CV enn man liker.",
  },
  Uruguay: {
    teamName: "Uruguay",
    bestWorldCup: "Mester i 1930 og 1950.",
    cultHeroes: ["Obdulio Varela", "Diego Forlán", "Enzo Francescoli"],
    scar: "De gamle bragdene er så store at nåtiden alltid må snakke høyt.",
    signatureMatch: "Brasil - Uruguay 1-2, avgjørende finalerunde 1950.",
    cellarAngle: "Uruguay er liten på kartet og stor nok i arkivet til å kreve egen hylle.",
  },
  USA: {
    teamName: "USA",
    bestWorldCup: "Tredjeplass i 1930 og vertskap i 1994 og 2026.",
    cultHeroes: ["Landon Donovan", "Claudio Reyna", "Tim Howard"],
    scar: "VM-historien svinger mellom pionertid, vertsfest og evig gjennombruddsprat.",
    signatureMatch: "USA - England 1-0, 1950.",
    cellarAngle: "USA gjør 2026 stort, bredt og litt vanskelig å late som man har oversikt over.",
  },
};

const genericTeamProfile = (teamName: string): TeamNostalgiaProfile => ({
  teamName,
  bestWorldCup: "VM-pass føres fortløpende når arkivet har nok å bite i.",
  cultHeroes: ["Kvalikheltene", "Kapteinen", "Han alle plutselig husker"],
  scar: "Alle landslag har et lite arr. Noen har bare ikke fått det katalogisert i kjelleren ennå.",
  signatureMatch: "VM 2026-kampene blir første mappe i dette passet.",
  cellarAngle: "Kjelleren krever først og fremst presise tips og en verdig forklaring etterpå.",
});

export function getApprovedMomentImage(moment: NostalgiaMoment): NostalgiaImage | null {
  for (const imageId of moment.imageIds ?? []) {
    const image = getWorldCupImageById(imageId);
    if (image) return image;
  }
  return (
    getRelevantWorldCupImages({
      momentId: moment.id,
      year: moment.year,
      teams: moment.teams,
      tags: moment.tags,
    }, 1)[0] ?? null
  );
}

export function getTeamNostalgiaProfile(teamName: string): TeamNostalgiaProfile {
  return teamProfiles[teamName] ?? genericTeamProfile(teamName);
}

export function getMatchNostalgia(match: Pick<WorldCupMatch, "id" | "homeTeam" | "awayTeam" | "stage">): NostalgiaMoment {
  const direct = worldCupNostalgiaMoments.find((moment) => moment.matchIds?.includes(match.id));
  if (direct) return direct;
  if (match.stage === "final") return byId("messi-2022");

  const scored = worldCupNostalgiaMoments
    .map((moment) => ({ moment, score: scoreMomentForMatch(moment, match) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.moment.year.localeCompare(b.moment.year));

  return scored[0]?.moment ?? byId("world-cup-2026-format");
}

export function pickDailyNostalgiaMoment(dateKey: string, matches: Array<Pick<WorldCupMatch, "id" | "homeTeam" | "awayTeam" | "stage">> = []) {
  const matchMoments = uniqueById(matches.map(getMatchNostalgia));
  const pool = matchMoments.length ? matchMoments : worldCupNostalgiaMoments;
  return pool[hashString(dateKey) % pool.length];
}

export function getNostalgiaArchive(): NostalgiaArchive {
  return {
    timeline: worldCupNostalgiaMoments.filter((moment) => moment.tags.includes("timeline")),
    championWall: [
      { team: "Brasil", titles: "5", note: "1958, 1962, 1970, 1994, 2002" },
      { team: "Tyskland", titles: "4", note: "1954, 1974, 1990, 2014" },
      { team: "Italia", titles: "4", note: "1934, 1938, 1982, 2006" },
      { team: "Argentina", titles: "3", note: "1978, 1986, 2022" },
      { team: "Frankrike", titles: "2", note: "1998, 2018" },
      { team: "Uruguay", titles: "2", note: "1930, 1950" },
      { team: "England", titles: "1", note: "1966" },
      { team: "Spania", titles: "1", note: "2010" },
    ],
    formatFacts: [
      { label: "Lag", value: "48", detail: "Første VM med 12 grupper à fire lag." },
      { label: "Kamper", value: "104", detail: "72 gruppespillkamper før utslaget begynner." },
      { label: "Finalevei", value: "8", detail: "Finalistene må spille åtte kamper." },
    ],
    norwayNotes: [
      "Norge spiller sitt første VM siden 1998.",
      "Beste VM: åttedelsfinale i 1938 og 1998.",
      "Kjetil Rekdal er eneste nordmann med mer enn ett VM-mål.",
      "Brasil 1998 er fortsatt referansepunktet alle norske VM-drømmer må hilse pent på.",
    ],
    imageWall: getApprovedWorldCupImages({ includeFallback: false }),
  };
}

export function buildNostalgiaBadges({
  standing,
  hitRate,
  completedTips,
}: {
  standing: Pick<Standing, "exactResults" | "roundsWon" | "bonusPoints"> | null | undefined;
  hitRate: number;
  completedTips: number;
}): BadgeTheme[] {
  const badges: Array<BadgeTheme | null> = [
    standing?.exactResults
      ? {
          id: "rekdal-pen",
          title: "Rekdal-pennen",
          text: `${standing.exactResults} eksakte resultater. Kald hånd, ryddig kvittering.`,
        }
      : null,
    hitRate >= 50
      ? {
          id: "rossi-row",
          title: "Rossi-raden",
          text: `${hitRate}% riktig utfall. Nok treff til at selvtilliten får pressekort.`,
        }
      : null,
    standing?.roundsWon
      ? {
          id: "maracanazo-alert",
          title: "Maracanazo-varsel",
          text: `${standing.roundsWon} rundeseire. Små jordskjelv er også jordskjelv.`,
        }
      : null,
    standing?.bonusPoints
      ? {
          id: "zidane-glance",
          title: "Zidane-blikket",
          text: `${standing.bonusPoints} bonustips-poeng. Detaljene er observert med mistenkelig ro.`,
        }
      : null,
    completedTips >= 3 && hitRate < 35
      ? {
          id: "baggio-miss",
          title: "Baggio-bommen",
          text: "Nok historikk til at bommene har fått egen hymne.",
        }
      : null,
  ];

  return badges.filter(Boolean) as BadgeTheme[];
}

function byId(id: string): NostalgiaMoment {
  return worldCupNostalgiaMoments.find((moment) => moment.id === id) ?? worldCupNostalgiaMoments[0];
}

function scoreMomentForMatch(moment: NostalgiaMoment, match: Pick<WorldCupMatch, "homeTeam" | "awayTeam">) {
  const teams = new Set([match.homeTeam, match.awayTeam]);
  let score = 0;
  for (const team of moment.teams) {
    if (teams.has(team)) score += 10;
  }
  if (moment.teams.length === 2 && teams.has(moment.teams[0]) && teams.has(moment.teams[1])) score += 20;
  if (moment.tags.includes("2026")) score += 1;
  return score;
}

function uniqueById(moments: NostalgiaMoment[]) {
  const seen = new Set<string>();
  return moments.filter((moment) => {
    if (seen.has(moment.id)) return false;
    seen.add(moment.id);
    return true;
  });
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
