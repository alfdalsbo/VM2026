import { access, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, extname, join } from "node:path";

const API_URL = "https://commons.wikimedia.org/w/api.php";
const OUTPUT_FILE = "src/lib/world-cup-image-assets.generated.ts";
const OUTPUT_DIR = "public/daily-images/commons";
const PUBLIC_PREFIX = "/daily-images/commons";
const TARGET_APPROVED_ASSETS = 180;
const MIN_APPROVED_ASSETS = 100;
const MAX_ASSETS_PER_CATEGORY = 40;
const MAX_DOWNLOAD_ATTEMPTS = 2;
const THUMB_WIDTH = 1400;
const USER_AGENT = "TippekjellerenLocal/1.0 (private VM nostalgia asset import)";

const requiredFiles = [
  "File:Uruguay_argentina_final.jpg",
  "File:Uruguay national football team 1930.jpg",
  "File:Uruguay goal v argentina 1930.jpg",
  "File:Uruguay en el Mundial 1930, Los Sports, 1930-08-08 (387).jpg",
  "File:Flopass3.jpg",
  "File:Bergkampscore3.jpg",
  "File:Edgar_Davids_and_Emerson_during_WC_1998_semifinal_Netherlands_vs_Brazil.jpg",
];

const requiredFileSpecs = {
  "File:Uruguay_argentina_final.jpg": {
    year: "1930",
    teams: ["Uruguay", "Argentina"],
    momentIds: ["uruguay-1930"],
    tags: ["1930", "uruguay", "argentina", "final", "rimet"],
    context:
      "Dette er startstreken for VM-bildene: Uruguay mot Argentina, finaledag i Montevideo og et mesterskap som fortsatt var mer eventyr enn rutine.",
    facts: ["Uruguay vant finalen 4-2.", "Finalen ble spilt på Estadio Centenario.", "Dette var den første VM-finalen."],
  },
  "File:Uruguay national football team 1930.jpg": {
    year: "1930",
    teams: ["Uruguay", "Argentina"],
    momentIds: ["uruguay-1930"],
    tags: ["1930", "uruguay", "argentina", "final", "team-photo", "early-world-cup"],
    context:
      "Uruguays verdensmestere fra 1930 ser mer ut som et alvorlig familiealbum enn moderne idrettsindustri, og det er nettopp derfor bildet virker.",
    facts: ["Uruguay ble første verdensmester i fotball.", "Finalen mot Argentina endte 4-2.", "José Nasazzi var kaptein for Uruguay."],
  },
  "File:Uruguay goal v argentina 1930.jpg": {
    year: "1930",
    teams: ["Uruguay", "Argentina"],
    momentIds: ["uruguay-1930"],
    tags: ["1930", "uruguay", "argentina", "final", "goal", "castro"],
    context:
      "Et finalemål fra 1930 er VM-historie i råformat: kornete, uperfekt og nesten for konkret til å være legende.",
    facts: ["Bildet viser Uruguays fjerde mål i finalen.", "Héctor Castro scoret målet.", "Uruguay slo Argentina 4-2."],
  },
  "File:Uruguay en el Mundial 1930, Los Sports, 1930-08-08 (387).jpg": {
    year: "1930",
    teams: ["Uruguay", "Argentina"],
    momentIds: ["uruguay-1930"],
    tags: ["1930", "uruguay", "argentina", "final", "los-sports", "team-photo"],
    context:
      "Los Sports-bildet gjør 1930-VM til avisstoff igjen: elleve menn, få fakter og en hel turneringshistorie pakket i sort-hvitt.",
    facts: ["Bildet ble publisert i Los Sports i 1930.", "Uruguay vant finalen mot Argentina.", "Finalen ble spilt 30. juli 1930."],
  },
  "File:Flopass3.jpg": {
    year: "1998",
    teams: ["Norway", "Brazil"],
    momentIds: ["norway-return-2026"],
    tags: ["1998", "norway", "brazil", "flo", "diagram"],
    context:
      "Norsk VM-nostalgi trenger ikke gullramme: en lang ball, en høy spiss og et Brasil som plutselig måtte se seg over skulderen.",
    facts: ["Tore André Flo utlignet mot Brasil i 1998.", "Norge vant kampen 2-1.", "Seieren sendte Norge til åttedelsfinale."],
  },
  "File:Bergkampscore3.jpg": {
    year: "1998",
    teams: ["Netherlands", "Argentina"],
    momentIds: ["bergkamp-1998"],
    tags: ["1998", "netherlands", "argentina", "bergkamp", "diagram"],
    context:
      "Bergkamp-målet er VM som tavlekunst: ett oppspill, én førsteberøring og en avslutning som fortsatt gir langballen et bedre rykte.",
    facts: ["Nederland slo Argentina 2-1 i kvartfinalen.", "Dennis Bergkamp scoret vinnermålet.", "Målet kom etter en lang pasning fra Frank de Boer."],
  },
  "File:Edgar_Davids_and_Emerson_during_WC_1998_semifinal_Netherlands_vs_Brazil.jpg": {
    year: "1998",
    teams: ["Netherlands", "Brazil"],
    momentIds: ["netherlands-brazil-1998"],
    tags: ["1998", "netherlands", "brazil", "semifinal", "davids", "emerson"],
    context:
      "Nederland-Brasil i 1998 er semifinalen uten pynt: dueller, tempo og straffer før Brasil igjen sto i en VM-finale.",
    facts: ["Brasil slo Nederland på straffer.", "Kampen endte 1-1 etter ekstraomganger.", "Ronaldo scoret Brasils mål i ordinær tid."],
  },
};

const categorySpecs = [
  {
    category: "Category:Final of the 1930 FIFA World Cup",
    year: "1930",
    teams: ["Uruguay", "Argentina"],
    momentIds: ["uruguay-1930"],
    tags: ["1930", "final", "uruguay", "argentina", "rimet", "early-world-cup"],
    context:
      "Den første VM-finalen gjør arkivet fysisk: korte bukser, lang reise og et mesterskap som ennå ikke visste at det skulle bli en verdenskalender.",
    facts: ["Uruguay slo Argentina 4-2 i finalen.", "Finalen ble spilt på Estadio Centenario i Montevideo.", "1930-VM hadde bare 13 lag."],
  },
  {
    category: "Category:Brazil at the World Cup 1950",
    year: "1950",
    teams: ["Brazil", "Uruguay"],
    momentIds: ["maracanazo-1950"],
    tags: ["1950", "brazil", "uruguay", "maracanazo", "archive"],
    context:
      "1950-bildene bærer VM-historiens mest berømte stillhet: Brasil var vert, favoritt og nesten kronet før Uruguay snudde rommet.",
    facts: ["Uruguay vant den avgjørende finalerundekampen 2-1.", "Maracanazo er fortsatt Brasils åpne VM-sår.", "1950 hadde finalerunde i stedet for vanlig finale."],
  },
  {
    category: "Category:Final of the 1954 FIFA World Cup",
    year: "1954",
    teams: ["Germany", "Hungary"],
    momentIds: ["germany-2014"],
    tags: ["1954", "germany", "hungary", "final", "miracle-of-bern"],
    context:
      "Bern-finalen er et arkivskap for alle som liker favoritter, regnvær og den typen resultat som gjør at folk endrer tonefall.",
    facts: ["Vest-Tyskland slo Ungarn 3-2.", "Kampen er kjent som Mirakelet i Bern.", "Ungarn hadde slått Vest-Tyskland 8-3 tidligere i turneringen."],
  },
  {
    category: "Category:Final of the 1970 FIFA World Cup",
    year: "1970",
    teams: ["Brazil", "Italy"],
    momentIds: ["brazil-1970"],
    tags: ["1970", "brazil", "italy", "final", "pele"],
    context:
      "Mexico 1970 er den vakre standarden alle Brasil-tips later som de har regnet seg frem til, selv når de egentlig bare savner Pelé.",
    facts: ["Brasil slo Italia 4-1 i finalen.", "Pelé ble første spiller med tre VM-gull.", "Carlos Albertos finalemål er fortsatt taktisk museumsstoff."],
  },
  {
    category: "Category:Final of the 1974 FIFA World Cup",
    year: "1974",
    teams: ["Germany", "Netherlands"],
    momentIds: ["netherlands-brazil-1998"],
    tags: ["1974", "germany", "netherlands", "cruyff", "total-football", "final"],
    context:
      "1974-finalen er totalfotballens store rettssak: Nederland hadde idéen, Vest-Tyskland hadde pokalen og kjelleren har fortsatt meninger.",
    facts: ["Vest-Tyskland slo Nederland 2-1.", "Nederland tok ledelsen før tysk spiller hadde rørt ballen.", "Cruyff-generasjonen ble stil uten gull."],
  },
  {
    category: "Category:Final of the 1978 FIFA World Cup",
    year: "1978",
    teams: ["Argentina", "Netherlands"],
    momentIds: ["bergkamp-1998"],
    tags: ["1978", "argentina", "netherlands", "final", "kempes"],
    context:
      "Buenos Aires-finalen har alt et privat VM-arkiv liker: konfetti, trykk, ekstraomganger og en vertsnasjon som gjorde kvelden enorm.",
    facts: ["Argentina slo Nederland 3-1 etter ekstraomganger.", "Mario Kempes scoret to mål i finalen.", "Nederland tapte sin andre strake VM-finale."],
  },
  {
    category: "Category:Final of the 1966 FIFA World Cup",
    year: "1966",
    teams: ["England", "Germany"],
    momentIds: ["england-croatia-2018"],
    tags: ["1966", "england", "germany", "final", "wembley", "extra-time"],
    context:
      "1966-finalen er engelsk VM-selvfølelse i ren konsentrat: Wembley, ekstraomganger og en mållinje som fortsatt får folk til å lene seg frem.",
    facts: ["England slo Vest-Tyskland 4-2 etter ekstraomganger.", "Geoff Hurst scoret hat trick i finalen.", "Finalen ble spilt på Wembley."],
  },
  {
    category: "Category:Final of the 1982 FIFA World Cup",
    year: "1982",
    teams: ["Italy", "Germany"],
    momentIds: ["rossi-1982"],
    tags: ["1982", "italy", "germany", "final", "rossi", "tardelli"],
    context:
      "Spania 1982 er finalen der Italia gikk fra mistenksom gruppespillprat til ren VM-myndighet, med Tardelli-løpet som følelsesarkiv.",
    facts: ["Italia slo Vest-Tyskland 3-1.", "Paolo Rossi ble turneringens toppscorer.", "Marco Tardellis jubel er et av VMs store følelsesbilder."],
  },
  {
    category: "Category:Final of the 1986 FIFA World Cup",
    year: "1986",
    teams: ["Argentina", "Germany"],
    momentIds: ["maradona-1986"],
    tags: ["1986", "argentina", "germany", "maradona", "final"],
    context:
      "1986-finalen er Maradona-turneringen med sluttstrek: Argentina hadde nerven, Vest-Tyskland hadde opphentingen, og Burruchaga hadde siste løp.",
    facts: ["Argentina slo Vest-Tyskland 3-2.", "Burruchaga avgjorde finalen sent.", "Maradona var turneringens gravitasjonssenter."],
  },
  {
    category: "Category:Argentina at the 1986 FIFA World Cup",
    year: "1986",
    teams: ["Argentina"],
    momentIds: ["maradona-1986"],
    tags: ["1986", "argentina", "maradona", "mexico", "archive"],
    context:
      "Argentina 1986 er VM som enkeltmannskraft og lagstruktur samtidig: Maradona bar overskriftene, men hele laget bar ham gjennom Mexico.",
    facts: ["Argentina vant VM 1986.", "Maradona ble kåret til turneringens spiller.", "Argentina scoret 14 mål i turneringen."],
  },
  {
    category: "Category:Argentina v England, 22 June 1986",
    year: "1986",
    teams: ["Argentina", "England"],
    momentIds: ["maradona-1986"],
    tags: ["1986", "argentina", "england", "maradona", "quarterfinal"],
    context:
      "Argentina-England i 1986 er kampen som gjør at nøytrale tippekuponger plutselig får historisk bagasje: hånd, geni og geopolitisk etterklang.",
    facts: ["Argentina slo England 2-1 i kvartfinalen.", "Maradona scoret begge Argentinas mål.", "Kampen ble spilt på Estadio Azteca."],
  },
  {
    category: "Category:Brazil vs Italy 1994 FIFA World Cup Final",
    year: "1994",
    teams: ["Brazil", "Italy"],
    momentIds: ["baggio-1994"],
    tags: ["1994", "brazil", "italy", "final", "penalties", "baggio"],
    context:
      "USA 1994-finalen er stillheten etter 0-0: Brasil ventet, Italia skalv, og Baggio-bommen ble et eget kapittel i tippernes frykt for straffer.",
    facts: ["Brasil slo Italia på straffer.", "Finalen endte 0-0 etter ekstraomganger.", "Brasil ble første nasjon med fire VM-gull."],
  },
  {
    category: "Category:Bulgaria v Germany, 10 July 1994",
    year: "1994",
    teams: ["Bulgaria", "Germany"],
    momentIds: ["baggio-1994"],
    tags: ["1994", "bulgaria", "germany", "quarterfinal", "stoichkov"],
    context:
      "Bulgaria-Tyskland i 1994 er den typen VM-smell som gjør gamle kuponger nervøse: regjerende mester ut, outsideren inn i historien.",
    facts: ["Bulgaria slo Tyskland 2-1.", "Hristo Stoichkov scoret i kampen.", "Bulgaria nådde semifinale i VM 1994."],
  },
  {
    category: "Category:Final of the 1998 FIFA World Cup",
    year: "1998",
    teams: ["France", "Brazil"],
    momentIds: ["france-1998"],
    tags: ["1998", "france", "brazil", "final", "zidane"],
    context:
      "Paris 1998 er fransk VM-fødsel med smell i panna: Zidane steg to ganger, Brasil ble menneskelig og Stade de France ble nasjonalhukommelse.",
    facts: ["Frankrike slo Brasil 3-0.", "Zidane scoret to hodemål i finalen.", "Dette var Frankrikes første VM-gull."],
  },
  {
    category: "Category:2002 FIFA World Cup Match 57, England v Brazil",
    year: "2002",
    teams: ["England", "Brazil"],
    momentIds: ["brazil-1970"],
    tags: ["2002", "england", "brazil", "quarterfinal", "ronaldinho"],
    context:
      "England-Brasil 2002 er kampen der et frispark ble en hel pubdiskusjon: var det ment, var det flaks, og hvorfor sto keeperen der?",
    facts: ["Brasil slo England 2-1.", "Ronaldinho scoret vinnermålet på frispark.", "Brasil vant senere hele VM 2002."],
  },
  {
    category: "Category:Senegal at the 2002 FIFA World Cup",
    year: "2002",
    teams: ["Senegal", "France"],
    momentIds: ["senegal-2002"],
    tags: ["2002", "senegal", "france", "opening-match", "upset"],
    context:
      "Senegal 2002 er påminnelsen om at VM ikke spør pent før det velter verdensmesteren: ett åpningsmål, og hele turneringen byttet temperatur.",
    facts: ["Senegal slo Frankrike 1-0 i åpningskampen.", "Papa Bouba Diop scoret kampens mål.", "Senegal nådde kvartfinale i debuten."],
  },
  {
    category: "Category:Final of the 2006 FIFA World Cup",
    year: "2006",
    teams: ["Italy", "France"],
    momentIds: ["baggio-1994", "france-1998"],
    tags: ["2006", "italy", "france", "final", "penalties", "zidane"],
    context:
      "Berlin 2006 er finalen som minner alle om at VM-historie ofte skrives etter 120 minutter og med litt for mye puls.",
    facts: ["Italia slo Frankrike på straffer.", "Kampen endte 1-1 etter ekstraomganger.", "Zidane spilte sin siste landskamp."],
  },
  {
    category: "Category:Final of the 2010 FIFA World Cup",
    year: "2010",
    teams: ["Spain", "Netherlands"],
    momentIds: ["spain-2010"],
    tags: ["2010", "spain", "netherlands", "final", "iniesta"],
    context:
      "2010-finalen er den lave scorens høymesse: Spania trillet, Nederland taklet, og Iniesta skrev punktum da rommet nesten hadde gitt opp.",
    facts: ["Spania slo Nederland 1-0 etter ekstraomganger.", "Iniesta scoret finalens eneste mål.", "Dette var Spanias første VM-gull."],
  },
  {
    category: "Category:Spain at the 2010 FIFA World Cup",
    year: "2010",
    teams: ["Spain"],
    momentIds: ["spain-2010"],
    tags: ["2010", "spain", "iniesta", "xavi", "tiki-taka"],
    context:
      "Spania 2010 er kontrollens VM: korte pasninger, lange diskusjoner og en finalescoring som gjorde all den forsiktige trilingen evig.",
    facts: ["Spania vant sitt første VM-gull i 2010.", "Spania vant alle utslagskampene 1-0.", "Iniesta avgjorde finalen mot Nederland."],
  },
  {
    category: "Category:Final of the 2014 FIFA World Cup",
    year: "2014",
    teams: ["Germany", "Argentina"],
    momentIds: ["germany-2014"],
    tags: ["2014", "germany", "argentina", "final", "goetze"],
    context:
      "Maracanã 2014 er tysk tålmodighet med argentinsk nerve: en finale som ventet på ett løp, én touch og Götzes øyeblikk.",
    facts: ["Tyskland slo Argentina 1-0 etter ekstraomganger.", "Mario Götze scoret finalens eneste mål.", "Tyskland ble første europeiske mester i Sør-Amerika."],
  },
  {
    category: "Category:2014 FIFA World Cup Match 61, Brazil v Germany",
    year: "2014",
    teams: ["Brazil", "Germany"],
    momentIds: ["germany-2014"],
    tags: ["2014", "brazil", "germany", "semifinal", "mineirazo"],
    context:
      "Brasil-Tyskland 2014 er resultatet som ser ut som en tastefeil selv i ettertid: et nasjonalt sjokk, syv mål og stillhet i Belo Horizonte.",
    facts: ["Tyskland slo Brasil 7-1 i semifinalen.", "Kampen kalles ofte Mineirazo.", "Tyskland scoret fem mål før pause."],
  },
  {
    category: "Category:Germany at the 2014 FIFA World Cup",
    year: "2014",
    teams: ["Germany"],
    momentIds: ["germany-2014"],
    tags: ["2014", "germany", "champion", "goetze", "neuer"],
    context:
      "Tyskland 2014 er maskinen med myke føtter: Neuer som ekstra stopper, Kroos som metronom og Götze som siste setning.",
    facts: ["Tyskland vant VM 2014.", "Manuel Neuer ble kåret til turneringens beste keeper.", "Miroslav Klose ble VMs mestscorende spiller gjennom tidene."],
  },
  {
    category: "Category:Final of the 2018 FIFA World Cup",
    year: "2018",
    teams: ["France", "Croatia"],
    momentIds: ["france-2018"],
    tags: ["2018", "france", "croatia", "final", "mbappe", "modric"],
    context:
      "Moskva 2018 er finalen med stormkast: fransk fart, kroatisk utholdenhet og et resultat som så mer åpent ut enn kampen føltes.",
    facts: ["Frankrike slo Kroatia 4-2.", "Mbappé scoret i finalen.", "Luka Modrić ble kåret til turneringens beste spiller."],
  },
  {
    category: "Category:Croatia at the 2018 FIFA World Cup",
    year: "2018",
    teams: ["Croatia"],
    momentIds: ["england-croatia-2018"],
    tags: ["2018", "croatia", "modric", "mandzukic", "finalist"],
    context:
      "Kroatia 2018 er sliteseierens VM: ekstraomganger, straffer og et lag som nektet å gå tomt før finalen sto der.",
    facts: ["Kroatia nådde sin første VM-finale.", "Kroatia slo England 2-1 etter ekstraomganger i semifinalen.", "Luka Modrić vant Gullballen."],
  },
  {
    category: "Category:England at the 2018 FIFA World Cup",
    year: "2018",
    teams: ["England"],
    momentIds: ["england-croatia-2018"],
    tags: ["2018", "england", "kane", "semifinal", "croatia"],
    context:
      "England 2018 er 'it's coming home' med hjertet utenpå drakta: nesten-finale, dødballtro og den velkjente engelske ettersmaken.",
    facts: ["England nådde semifinale i 2018.", "Harry Kane ble turneringens toppscorer.", "Kroatia slo England etter ekstraomganger."],
  },
  {
    category: "Category:Final of the 2022 FIFA World Cup",
    year: "2022",
    teams: ["Argentina", "France"],
    momentIds: ["argentina-2022"],
    tags: ["2022", "argentina", "france", "final", "messi", "mbappe"],
    context:
      "Lusail 2022 er finalen som nektet å slutte: Messi, Mbappé, 3-3 og straffer før Argentina endelig fikk sin moderne gullramme.",
    facts: ["Argentina slo Frankrike på straffer.", "Finalen endte 3-3 etter ekstraomganger.", "Mbappé scoret hat trick i finalen."],
  },
  {
    category: "Category:Argentina at the 2022 FIFA World Cup",
    year: "2022",
    teams: ["Argentina"],
    momentIds: ["argentina-2022"],
    tags: ["2022", "argentina", "messi", "champion", "lusail"],
    context:
      "Argentina 2022 er Messis VM med folkefest rundt: fra sjokkstart mot Saudi-Arabia til den mest ladede finalekvelden i moderne tid.",
    facts: ["Argentina vant sitt tredje VM-gull.", "Messi ble kåret til turneringens beste spiller.", "Argentina tapte åpningskampen før de vant resten av veien."],
  },
  {
    category: "Category:2026 FIFA World Cup in the United States",
    year: "2026",
    teams: ["USA"],
    momentIds: ["world-cup-2026-format"],
    tags: ["2026", "usa", "host", "venue", "format"],
    context:
      "2026-bildene handler om skala: tre vertsland, 48 lag og en turnering som gjør selv den ryddigste notatblokka litt nervøs.",
    facts: ["2026 blir første VM med 48 lag.", "USA, Canada og Mexico deler vertskapet.", "Turneringen får 104 kamper."],
  },
];

const blockedTitlePattern =
  /(logo|wordmark|emblem|mascot|maple|zayu|clutch|kit body|jersey|shirt|trophy|copa jules rimet|replica|ticket|fanion|poster|draw reception|coca cola|sponsor|launch edition|miniature|badge)/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, { json = true, attempts = 7, timeoutMs = 45_000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
      if (response.status !== 429 && response.status < 500) {
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
        return json ? response.json() : response.arrayBuffer();
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 4000 * attempt;
      console.log(`Rate/temporary limit (${response.status}). Waiting ${waitMs} ms before retry ${attempt}.`);
      await sleep(waitMs);
    } catch (error) {
      const waitMs = 3000 * attempt;
      console.log(`Fetch failed (${error.name ?? "Error"}). Waiting ${waitMs} ms before retry ${attempt}.`);
      await sleep(waitMs);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Could not fetch after retries: ${url}`);
}

async function commonsQuery(params) {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({ format: "json", origin: "*", ...params });
  const data = await fetchWithRetry(url);
  await sleep(900);
  return data;
}

async function getCategoryFiles(spec) {
  const files = [];
  let cmcontinue;
  do {
    const data = await commonsQuery({
      action: "query",
      list: "categorymembers",
      cmtitle: spec.category,
      cmtype: "file",
      cmlimit: "60",
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    files.push(...(data.query?.categorymembers ?? []));
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue && files.length < 90);
  return files.map((file) => ({ title: file.title, spec }));
}

async function getImageInfo(titles) {
  const pages = [];
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const data = await commonsQuery({
      action: "query",
      prop: "imageinfo",
      titles: batch.join("|"),
      iiprop: "url|mime|size|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
    });
    pages.push(...Object.values(data.query?.pages ?? {}));
  }
  return pages;
}

function stripHtml(value = "") {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCredit(value = "") {
  const credit = stripHtml(value) || "Wikimedia Commons";
  const words = credit.split(" ");
  if (words.length % 2 === 0) {
    const midpoint = words.length / 2;
    const firstHalf = words.slice(0, midpoint).join(" ");
    const secondHalf = words.slice(midpoint).join(" ");
    if (firstHalf === secondHalf) return firstHalf;
  }
  return credit;
}

function isAllowedLicense(value = "") {
  const normalized = stripHtml(value).toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("noncommercial") || normalized.includes("no derivatives") || normalized.includes("fair use")) return false;
  return (
    normalized === "public domain" ||
    normalized.startsWith("cc0") ||
    normalized.startsWith("cc by ") ||
    normalized.startsWith("cc by-") ||
    normalized.startsWith("cc-by") ||
    normalized.startsWith("creative commons attribution")
  );
}

function humanTitle(title) {
  return title
    .replace(/^File:/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shortTitle(title, spec) {
  const clean = humanTitle(title)
    .replace(/\bFIFA World Cup\b/gi, "VM")
    .replace(/\bWorld Cup\b/gi, "VM")
    .replace(/\bFinal\b/gi, "finale");
  const label = clean.length > 58 ? `${clean.slice(0, 55).trim()}...` : clean;
  return `${spec.year}: ${label}`;
}

function fileSlug(title) {
  const clean = humanTitle(title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
  const hash = createHash("sha1").update(title).digest("hex").slice(0, 8);
  return `${clean || "commons"}-${hash}`;
}

function getDownloadedExtension(url, mime) {
  const parsed = new URL(url);
  const pathBase = basename(parsed.pathname).toLowerCase();
  const ext = extname(pathBase.replace(/\.svg\.png$/, ".png").replace(/\.tif\.jpg$/, ".jpg"));
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  if (mime?.includes("png")) return ".png";
  if (mime?.includes("webp")) return ".webp";
  return ".jpg";
}

function mediaTypeFor(title, mime) {
  const lower = title.toLowerCase();
  if (lower.endsWith(".svg") || lower.includes("line-up") || lower.includes("lineup") || lower.includes("diagram") || lower.includes("formation")) return "diagram";
  if (lower.includes("map") || lower.includes("countries") || lower.includes("qualification")) return "map";
  if (mime?.includes("svg")) return "diagram";
  return "photo";
}

function buildCaption(title, spec, mediaType) {
  const clean = humanTitle(title);
  if (mediaType === "diagram") return `Diagram/oppstilling fra ${spec.year}-arkivet: ${clean}.`;
  if (mediaType === "map") return `Kart- eller oversiktsasset fra ${spec.year}-arkivet: ${clean}.`;
  return `Arkivbilde fra ${spec.year}-sporet i VM-arkivet: ${clean}.`;
}

function imageFocus(title) {
  const lower = title.toLowerCase();
  if (lower.includes("lineup") || lower.includes("line-up") || lower.includes("map")) return "center";
  if (lower.includes("cropped") || lower.includes("portrait")) return "top";
  return "center";
}

function imageDisplayPolicy({ mediaType, orientation, title, tags }) {
  const lowerTitle = title.toLowerCase();
  const tagText = tags.join(" ").toLowerCase();
  const cropRiskPattern = /(federal interagency|coordination plan|fan|octopus|stage|ceremony|line-up|lineup|diagram|map|cropped|portrait)/i;
  const weakHomePattern = /(federal interagency|coordination plan|octopus|stage|ceremony|fan outside|dutch fan)/i;
  const combinedText = `${lowerTitle} ${tagText}`;
  const cropSafe = mediaType === "photo" && orientation === "landscape" && !cropRiskPattern.test(combinedText);
  return {
    displayMode: "contain",
    cropSafe,
    homeEligible: mediaType !== "map" && !weakHomePattern.test(combinedText),
  };
}

async function download(url, filename) {
  try {
    await access(join(OUTPUT_DIR, filename));
    console.log(`Skipping existing ${filename}`);
    return;
  } catch {
    // File is not present yet.
  }
  try {
    const bytes = await fetchWithRetry(url, { json: false, attempts: MAX_DOWNLOAD_ATTEMPTS, timeoutMs: 25_000 });
    await writeFile(join(OUTPUT_DIR, filename), Buffer.from(bytes));
    await sleep(500);
    return true;
  } catch (error) {
    console.log(`Skipping failed download ${filename}: ${error.message}`);
    return false;
  }
}

function toAsset(page, spec) {
  const info = page.imageinfo?.[0];
  if (!info?.thumburl) return null;
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value ?? meta.UsageTerms?.value ?? "");
  const credit = normalizeCredit(meta.Artist?.value ?? meta.Credit?.value ?? meta.Attribution?.value ?? "Wikimedia Commons");
  const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title).replace(/%3A/g, ":")}`;
  const mediaType = mediaTypeFor(page.title, info.mime);
  const id = fileSlug(page.title);
  const extension = getDownloadedExtension(info.thumburl, info.mime);
  const filename = `${id}${extension}`;
  const tags = Array.from(new Set([...spec.tags, mediaType, "commons"]));
  const orientation = info.width >= info.height ? "landscape" : "portrait";
  const displayPolicy = imageDisplayPolicy({ mediaType, orientation, title: page.title, tags });
  return {
    id,
    src: `${PUBLIC_PREFIX}/${filename}`,
    downloadUrl: info.thumburl,
    title: shortTitle(page.title, spec),
    alt: `${mediaType === "photo" ? "Arkivbilde" : mediaType === "diagram" ? "Diagram" : "Kart"} fra ${spec.year}: ${humanTitle(page.title)}`,
    caption: buildCaption(page.title, spec, mediaType),
    context: spec.context,
    facts: spec.facts,
    credit: credit || "Wikimedia Commons",
    license,
    sourceUrl,
    approved: true,
    mediaType,
    year: spec.year,
    teams: spec.teams,
    matchIds: [],
    momentIds: spec.momentIds,
    tags,
    orientation,
    focus: imageFocus(page.title),
    ...displayPolicy,
  };
}

function isUsableCandidate(title) {
  return !blockedTitlePattern.test(title);
}

function tsString(value) {
  return JSON.stringify(value);
}

function renderAsset(asset) {
  return `  {
    id: ${tsString(asset.id)},
    src: ${tsString(asset.src)},
    title: ${tsString(asset.title)},
    alt: ${tsString(asset.alt)},
    caption: ${tsString(asset.caption)},
    context: ${tsString(asset.context)},
    facts: ${tsString(asset.facts)},
    credit: ${tsString(asset.credit)},
    license: ${tsString(asset.license)},
    sourceUrl: ${tsString(asset.sourceUrl)},
    approved: true,
    mediaType: ${tsString(asset.mediaType)},
    year: ${tsString(asset.year)},
    teams: ${tsString(asset.teams)},
    matchIds: ${tsString(asset.matchIds)},
    momentIds: ${tsString(asset.momentIds)},
    tags: ${tsString(asset.tags)},
    orientation: ${tsString(asset.orientation)},
    focus: ${tsString(asset.focus)},
    displayMode: ${tsString(asset.displayMode)},
    cropSafe: ${asset.cropSafe ? "true" : "false"},
    homeEligible: ${asset.homeEligible ? "true" : "false"},
  }`;
}

function toPublicAsset(asset) {
  const publicAsset = { ...asset };
  delete publicAsset.downloadUrl;
  return publicAsset;
}

async function writeGeneratedAssets(assets) {
  const content = `import type { WorldCupImageAsset } from "@/lib/world-cup-image-assets";

export const worldCupImageAssets: WorldCupImageAsset[] = [
${assets.map(renderAsset).join(",\n")}
];
`;
  await writeFile(OUTPUT_FILE, content, "utf8");
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const categoryFiles = [];
  for (const spec of categorySpecs) {
    console.log(`Reading ${spec.category}`);
    categoryFiles.push(...(await getCategoryFiles(spec)));
  }

  const required = requiredFiles.map((title) => ({ title, spec: requiredFileSpecs[title] }));

  const rawCandidates = [...required, ...categoryFiles]
    .filter((item) => isUsableCandidate(item.title))
    .filter((item, index, list) => list.findIndex((candidate) => candidate.title === item.title) === index);
  const candidates = interleaveBySpec(rawCandidates);

  console.log(`Checking metadata for ${candidates.length} candidates.`);
  const pages = await getImageInfo(candidates.map((candidate) => candidate.title));
  const specByTitle = new Map(candidates.map((candidate) => [candidate.title, candidate.spec]));
  const orderByTitle = new Map(candidates.map((candidate, index) => [candidate.title, index]));
  pages.sort((a, b) => (orderByTitle.get(a.title) ?? 9999) - (orderByTitle.get(b.title) ?? 9999));
  const countBySpec = new Map();
  const assets = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const license = stripHtml(info?.extmetadata?.LicenseShortName?.value ?? info?.extmetadata?.UsageTerms?.value ?? "");
    if (!isAllowedLicense(license)) continue;
    const spec = specByTitle.get(page.title);
    if (!spec) continue;
    const specKey = spec.category ?? spec.momentIds.join("-");
    const nextCount = countBySpec.get(specKey) ?? 0;
    if (nextCount >= MAX_ASSETS_PER_CATEGORY) continue;
    const asset = toAsset(page, spec);
    if (!asset) continue;
    assets.push(asset);
    countBySpec.set(specKey, nextCount + 1);
  }

  if (assets.length < MIN_APPROVED_ASSETS) {
    throw new Error(`Only ${assets.length} approved assets found; need at least ${MIN_APPROVED_ASSETS}.`);
  }

  if (process.env.IMPORT_COMMONS_SKIP_DOWNLOADS === "1") {
    const publicAssets = assets.slice(0, TARGET_APPROVED_ASSETS).map(toPublicAsset);
    await writeGeneratedAssets(publicAssets);
    console.log(`Wrote ${publicAssets.length} approved manifest candidates to ${OUTPUT_FILE}; skipped downloads.`);
    return;
  }

  const downloadedAssets = [];
  for (const [index, asset] of assets.entries()) {
    const filename = basename(asset.src);
    console.log(`Downloading ${index + 1}/${assets.length}: ${filename}`);
    if (await download(asset.downloadUrl, filename)) {
      downloadedAssets.push(asset);
    }
    if (downloadedAssets.length >= TARGET_APPROVED_ASSETS) break;
  }

  if (downloadedAssets.length < MIN_APPROVED_ASSETS) {
    throw new Error(`Only ${downloadedAssets.length} assets downloaded; need at least ${MIN_APPROVED_ASSETS}.`);
  }

  const publicAssets = downloadedAssets.map(toPublicAsset);
  await writeGeneratedAssets(publicAssets);
  console.log(`Wrote ${publicAssets.length} approved assets to ${OUTPUT_FILE}.`);
}

function specKey(spec) {
  return spec.category ?? spec.momentIds.join("-");
}

function interleaveBySpec(items) {
  const groups = new Map();
  for (const item of items) {
    const key = specKey(item.spec);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const output = [];
  let index = 0;
  while (output.length < items.length) {
    let added = false;
    for (const group of groups.values()) {
      if (group[index]) {
        output.push(group[index]);
        added = true;
      }
    }
    if (!added) break;
    index += 1;
  }
  return output;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
