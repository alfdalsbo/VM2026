import type { TeamSquadPlayer } from "@/lib/types";

type PlaceholderPlayer = {
  name: string;
  position: TeamSquadPlayer["position"];
};

const placeholderSquads: Record<string, PlaceholderPlayer[]> = {
  Algeria: [
    { name: "Rabah Madjer", position: "forward" },
    { name: "Lakhdar Belloumi", position: "midfielder" },
    { name: "Madjid Bougherra", position: "defender" },
    { name: "Rafik Saïfi", position: "forward" },
  ],
  Argentina: [
    { name: "Diego Maradona", position: "midfielder" },
    { name: "Gabriel Batistuta", position: "forward" },
    { name: "Mario Kempes", position: "forward" },
    { name: "Juan Sebastián Verón", position: "midfielder" },
    { name: "Hernán Crespo", position: "forward" },
  ],
  Australia: [
    { name: "Mark Schwarzer", position: "goalkeeper" },
    { name: "Harry Kewell", position: "forward" },
    { name: "Tim Cahill", position: "midfielder" },
    { name: "Mark Viduka", position: "forward" },
  ],
  Austria: [
    { name: "Hans Krankl", position: "forward" },
    { name: "Andreas Herzog", position: "midfielder" },
    { name: "Toni Polster", position: "forward" },
    { name: "Herbert Prohaska", position: "midfielder" },
  ],
  Belgium: [
    { name: "Jean-Marie Pfaff", position: "goalkeeper" },
    { name: "Enzo Scifo", position: "midfielder" },
    { name: "Eric Gerets", position: "defender" },
    { name: "Marc Wilmots", position: "forward" },
  ],
  "Bosnia and Herzegovina": [
    { name: "Hasan Salihamidžić", position: "midfielder" },
    { name: "Sergej Barbarez", position: "forward" },
    { name: "Elvir Bolić", position: "forward" },
    { name: "Edin Džeko", position: "forward" },
  ],
  Brazil: [
    { name: "Pelé", position: "forward" },
    { name: "Ronaldo", position: "forward" },
    { name: "Ronaldinho", position: "midfielder" },
    { name: "Cafu", position: "defender" },
    { name: "Roberto Carlos", position: "defender" },
  ],
  "Cabo Verde": [
    { name: "Henrik Larsson", position: "forward" },
    { name: "Hélder Cabral", position: "defender" },
    { name: "Nivaldo", position: "goalkeeper" },
  ],
  Canada: [
    { name: "Dwayne De Rosario", position: "midfielder" },
    { name: "Paul Stalteri", position: "defender" },
    { name: "Atiba Hutchinson", position: "midfielder" },
    { name: "Tomasz Radzinski", position: "forward" },
  ],
  Colombia: [
    { name: "Carlos Valderrama", position: "midfielder" },
    { name: "Faustino Asprilla", position: "forward" },
    { name: "René Higuita", position: "goalkeeper" },
    { name: "Iván Córdoba", position: "defender" },
  ],
  "Congo DR": [
    { name: "Shabani Nonda", position: "forward" },
    { name: "Lomana LuaLua", position: "forward" },
    { name: "Pierre Kalala", position: "midfielder" },
  ],
  Croatia: [
    { name: "Davor Šuker", position: "forward" },
    { name: "Zvonimir Boban", position: "midfielder" },
    { name: "Robert Prosinečki", position: "midfielder" },
    { name: "Robert Jarni", position: "defender" },
  ],
  "Curaçao": [
    { name: "Patrick Kluivert", position: "forward" },
    { name: "Jurgen Locadia", position: "forward" },
    { name: "Cuco Martina", position: "defender" },
  ],
  Czechia: [
    { name: "Pavel Nedvěd", position: "midfielder" },
    { name: "Karel Poborský", position: "midfielder" },
    { name: "Patrik Berger", position: "midfielder" },
    { name: "Jan Koller", position: "forward" },
    { name: "Petr Čech", position: "goalkeeper" },
  ],
  "Côte d'Ivoire": [
    { name: "Didier Drogba", position: "forward" },
    { name: "Yaya Touré", position: "midfielder" },
    { name: "Kolo Touré", position: "defender" },
    { name: "Salomon Kalou", position: "forward" },
  ],
  Ecuador: [
    { name: "Álex Aguinaga", position: "midfielder" },
    { name: "Iván Hurtado", position: "defender" },
    { name: "Agustín Delgado", position: "forward" },
    { name: "Antonio Valencia", position: "midfielder" },
  ],
  Egypt: [
    { name: "Mohamed Aboutrika", position: "midfielder" },
    { name: "Hossam Hassan", position: "forward" },
    { name: "Ahmed Hassan", position: "midfielder" },
    { name: "Essam El-Hadary", position: "goalkeeper" },
  ],
  England: [
    { name: "Bobby Charlton", position: "midfielder" },
    { name: "Gary Lineker", position: "forward" },
    { name: "Paul Gascoigne", position: "midfielder" },
    { name: "David Beckham", position: "midfielder" },
    { name: "Steven Gerrard", position: "midfielder" },
  ],
  France: [
    { name: "Zinedine Zidane", position: "midfielder" },
    { name: "Michel Platini", position: "midfielder" },
    { name: "Thierry Henry", position: "forward" },
    { name: "Patrick Vieira", position: "midfielder" },
    { name: "Lilian Thuram", position: "defender" },
  ],
  Germany: [
    { name: "Franz Beckenbauer", position: "defender" },
    { name: "Gerd Müller", position: "forward" },
    { name: "Lothar Matthäus", position: "midfielder" },
    { name: "Oliver Kahn", position: "goalkeeper" },
    { name: "Michael Ballack", position: "midfielder" },
  ],
  Ghana: [
    { name: "Abedi Pele", position: "midfielder" },
    { name: "Tony Yeboah", position: "forward" },
    { name: "Michael Essien", position: "midfielder" },
    { name: "Asamoah Gyan", position: "forward" },
  ],
  Haiti: [
    { name: "Emmanuel Sanon", position: "forward" },
    { name: "Joe Gaetjens", position: "forward" },
    { name: "Pierre-Richard Bruny", position: "midfielder" },
  ],
  "IR Iran": [
    { name: "Ali Daei", position: "forward" },
    { name: "Khodadad Azizi", position: "forward" },
    { name: "Mehdi Mahdavikia", position: "midfielder" },
    { name: "Ali Karimi", position: "midfielder" },
  ],
  Iraq: [
    { name: "Younis Mahmoud", position: "forward" },
    { name: "Ahmed Radhi", position: "forward" },
    { name: "Hussein Saeed", position: "forward" },
  ],
  Japan: [
    { name: "Hidetoshi Nakata", position: "midfielder" },
    { name: "Shunsuke Nakamura", position: "midfielder" },
    { name: "Kazuyoshi Miura", position: "forward" },
    { name: "Junichi Inamoto", position: "midfielder" },
  ],
  Jordan: [
    { name: "Faisal Ibrahim", position: "midfielder" },
    { name: "Hassouneh Al-Sheikh", position: "forward" },
    { name: "Amer Deeb", position: "midfielder" },
  ],
  "Korea Republic": [
    { name: "Park Ji-sung", position: "midfielder" },
    { name: "Cha Bum-kun", position: "forward" },
    { name: "Hong Myung-bo", position: "defender" },
    { name: "Ahn Jung-hwan", position: "forward" },
  ],
  Mexico: [
    { name: "Hugo Sánchez", position: "forward" },
    { name: "Cuauhtémoc Blanco", position: "forward" },
    { name: "Rafael Márquez", position: "defender" },
    { name: "Jorge Campos", position: "goalkeeper" },
    { name: "Luis García", position: "forward" },
  ],
  Morocco: [
    { name: "Mustapha Hadji", position: "midfielder" },
    { name: "Noureddine Naybet", position: "defender" },
    { name: "Aziz Bouderbala", position: "midfielder" },
    { name: "Marouane Chamakh", position: "forward" },
  ],
  Netherlands: [
    { name: "Johan Cruyff", position: "forward" },
    { name: "Marco van Basten", position: "forward" },
    { name: "Ruud Gullit", position: "midfielder" },
    { name: "Dennis Bergkamp", position: "forward" },
    { name: "Frank Rijkaard", position: "midfielder" },
  ],
  "New Zealand": [
    { name: "Wynton Rufer", position: "forward" },
    { name: "Ricki Herbert", position: "defender" },
    { name: "Ryan Nelsen", position: "defender" },
  ],
  Norway: [
    { name: "Tore André Flo", position: "forward" },
    { name: "Henning Berg", position: "defender" },
    { name: "Erik Mykland", position: "midfielder" },
    { name: "Ronny Johnsen", position: "defender" },
    { name: "John Carew", position: "forward" },
  ],
  Panama: [
    { name: "Julio Dely Valdés", position: "forward" },
    { name: "Felipe Baloy", position: "defender" },
    { name: "Jaime Penedo", position: "goalkeeper" },
  ],
  Paraguay: [
    { name: "José Luis Chilavert", position: "goalkeeper" },
    { name: "Roque Santa Cruz", position: "forward" },
    { name: "Carlos Gamarra", position: "defender" },
    { name: "Romerito", position: "forward" },
  ],
  Portugal: [
    { name: "Eusébio", position: "forward" },
    { name: "Luís Figo", position: "midfielder" },
    { name: "Rui Costa", position: "midfielder" },
    { name: "Deco", position: "midfielder" },
    { name: "Cristiano Ronaldo", position: "forward" },
  ],
  Qatar: [
    { name: "Mohammed Salem Al-Enazi", position: "midfielder" },
    { name: "Khalfan Ibrahim", position: "midfielder" },
    { name: "Sebastián Soria", position: "forward" },
  ],
  "Saudi Arabia": [
    { name: "Sami Al-Jaber", position: "forward" },
    { name: "Majed Abdullah", position: "forward" },
    { name: "Mohamed Al-Deayea", position: "goalkeeper" },
    { name: "Saeed Al-Owairan", position: "midfielder" },
  ],
  Scotland: [
    { name: "Kenny Dalglish", position: "forward" },
    { name: "Denis Law", position: "forward" },
    { name: "Jim Baxter", position: "midfielder" },
    { name: "Graeme Souness", position: "midfielder" },
    { name: "Ally McCoist", position: "forward" },
  ],
  Senegal: [
    { name: "El Hadji Diouf", position: "forward" },
    { name: "Khalilou Fadiga", position: "midfielder" },
    { name: "Henri Camara", position: "forward" },
    { name: "Papa Bouba Diop", position: "midfielder" },
  ],
  "South Africa": [
    { name: "Lucas Radebe", position: "defender" },
    { name: "Benni McCarthy", position: "forward" },
    { name: "Steven Pienaar", position: "midfielder" },
    { name: "Shaun Bartlett", position: "forward" },
  ],
  Spain: [
    { name: "Raúl", position: "forward" },
    { name: "Iker Casillas", position: "goalkeeper" },
    { name: "Xavi", position: "midfielder" },
    { name: "Andrés Iniesta", position: "midfielder" },
    { name: "Fernando Torres", position: "forward" },
  ],
  Sweden: [
    { name: "Henrik Larsson", position: "forward" },
    { name: "Zlatan Ibrahimović", position: "forward" },
    { name: "Tomas Brolin", position: "forward" },
    { name: "Patrik Andersson", position: "defender" },
  ],
  Switzerland: [
    { name: "Stéphane Chapuisat", position: "forward" },
    { name: "Alexander Frei", position: "forward" },
    { name: "Tranquillo Barnetta", position: "midfielder" },
    { name: "Pascal Zuberbühler", position: "goalkeeper" },
  ],
  Tunisia: [
    { name: "Adel Sellimi", position: "forward" },
    { name: "Hatem Trabelsi", position: "defender" },
    { name: "Radhi Jaïdi", position: "defender" },
    { name: "Francileudo Santos", position: "forward" },
  ],
  Türkiye: [
    { name: "Hakan Şükür", position: "forward" },
    { name: "Rüştü Reçber", position: "goalkeeper" },
    { name: "Emre Belözoğlu", position: "midfielder" },
    { name: "Tugay Kerimoğlu", position: "midfielder" },
  ],
  Uruguay: [
    { name: "Enzo Francescoli", position: "midfielder" },
    { name: "Diego Forlán", position: "forward" },
    { name: "Álvaro Recoba", position: "forward" },
    { name: "Daniel Fonseca", position: "forward" },
    { name: "Diego Lugano", position: "defender" },
  ],
  USA: [
    { name: "Landon Donovan", position: "forward" },
    { name: "Brian McBride", position: "forward" },
    { name: "Claudio Reyna", position: "midfielder" },
    { name: "Tim Howard", position: "goalkeeper" },
    { name: "Cobi Jones", position: "midfielder" },
  ],
  Uzbekistan: [
    { name: "Maksim Shatskikh", position: "forward" },
    { name: "Ulug'bek Bakayev", position: "forward" },
    { name: "Server Djeparov", position: "midfielder" },
  ],
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPlaceholderSquad(teamName: string): TeamSquadPlayer[] {
  const players = placeholderSquads[teamName];
  if (!players) return [];
  const team = slugify(teamName);
  return players.map((player, index) => ({
    id: `placeholder-${team}-${index + 1}`,
    name: player.name,
    shortName: null,
    position: player.position,
    shirtNumber: null,
    source: "placeholder",
  }));
}
