/* Static factual metadata: team brand colors, country flags, continents. */

export const TEAM_COLORS: Record<string, string> = {
  mercedes: "#00A19B",
  ferrari: "#E8002D",
  mclaren: "#FF8000",
  red_bull: "#3671C6",
  rb: "#6692FF",
  williams: "#64C4FF",
  alpine: "#0093CC",
  haas: "#B6BABD",
  audi: "#C9CDD2",
  aston_martin: "#229971",
  cadillac: "#D4A017",
};

export function teamColor(id: string): string {
  return TEAM_COLORS[id] ?? "#8892a3";
}

const CODE_BY_COUNTRY: Record<string, string> = {
  Australia: "AUS", Austria: "AUT", Azerbaijan: "AZE", Bahrain: "BHR", Belgium: "BEL",
  Brazil: "BRA", Canada: "CAN", China: "CHN", France: "FRA", Hungary: "HUN",
  Italy: "ITA", Japan: "JPN", Malaysia: "MYS", Mexico: "MEX", Monaco: "MON",
  Netherlands: "NED", Qatar: "QAT", Russia: "RUS", "Saudi Arabia": "KSA", Singapore: "SGP",
  Spain: "ESP", Turkey: "TUR", UAE: "UAE", UK: "GBR", USA: "USA", "United States": "USA",
  Germany: "GER", Portugal: "POR", "South Africa": "RSA", India: "IND", Korea: "KOR",
  Argentina: "ARG", Morocco: "MAR", Switzerland: "SUI", Sweden: "SWE",
  Finland: "FIN", Denmark: "DEN", Thailand: "THA", "New Zealand": "NZL", Poland: "POL",
  Ireland: "IRL", Colombia: "COL", Venezuela: "VEN",
  Chile: "CHI", Uruguay: "URU", "Czech Republic": "CZE", Rhodesia: "RHO", Liechtenstein: "LIE",
  East: "DDR",
};

const NAT_CODE: Record<string, string> = {
  Italian: "ITA", British: "GBR", German: "GER", French: "FRA", Dutch: "NED",
  Spanish: "ESP", Finnish: "FIN", Brazilian: "BRA", Mexican: "MEX", Australian: "AUS",
  Japanese: "JPN", Canadian: "CAN", Danish: "DEN", Thai: "THA", Monegasque: "MON",
  "New Zealander": "NZL", American: "USA", Argentine: "ARG", Chinese: "CHN", Austrian: "AUT",
  Swiss: "SUI", Swedish: "SWE", Irish: "IRL", Polish: "POL", Indian: "IND",
  Portuguese: "POR", Belgian: "BEL", Colombian: "COL", Venezuelan: "VEN", Chilean: "CHI",
  Russian: "RUS", Indonesian: "INA", Malaysian: "MYS", "South African": "RSA",
};

/** 3-letter code -> ISO 3166-1 alpha-2, for the flag-icons library. */
const ISO2_BY_CODE: Record<string, string> = {
  AUS: "au", AUT: "at", AZE: "az", BHR: "bh", BRN: "bh", /* BRN: codice OpenF1 per il Bahrain */ BEL: "be",
  BRA: "br", CAN: "ca", CHN: "cn", FRA: "fr", HUN: "hu",
  ITA: "it", JPN: "jp", MYS: "my", MEX: "mx", MON: "mc",
  NED: "nl", QAT: "qa", RUS: "ru", KSA: "sa", SGP: "sg",
  ESP: "es", TUR: "tr", UAE: "ae", GBR: "gb", USA: "us",
  GER: "de", POR: "pt", RSA: "za", IND: "in", KOR: "kr",
  ARG: "ar", MAR: "ma", SUI: "ch", SWE: "se", FIN: "fi",
  DEN: "dk", THA: "th", NZL: "nz", POL: "pl", IRL: "ie",
  COL: "co", VEN: "ve", CHI: "cl", URU: "uy", CZE: "cz",
  RHO: "zw", LIE: "li", DDR: "de", INA: "id",
};

/** ISO 3166-1 alpha-2 code for a 3-letter code, or undefined when unknown. */
export function flagIso2(code3: string): string | undefined {
  return ISO2_BY_CODE[code3];
}

/** 3-letter country code, rendered with the `.nat` chip (no emoji flags). */
export function countryCode(country: string): string {
  return CODE_BY_COUNTRY[country] ?? "···";
}

/** 3-letter nationality code, rendered with the `.nat` chip. */
export function nationalityCode(nationality: string): string {
  return NAT_CODE[nationality] ?? "···";
}

const CONTINENT_BY_COUNTRY: Record<string, string> = {
  Australia: "Oceania", Austria: "Europa", Azerbaijan: "Asia", Bahrain: "Asia",
  Belgium: "Europa", Brazil: "Americhe", Canada: "Americhe", China: "Asia",
  France: "Europa", Hungary: "Europa", Italy: "Europa", Japan: "Asia",
  Malaysia: "Asia", Mexico: "Americhe", Monaco: "Europa", Netherlands: "Europa",
  Qatar: "Asia", Russia: "Europa", "Saudi Arabia": "Asia", Singapore: "Asia",
  Spain: "Europa", Turkey: "Asia", UAE: "Asia", UK: "Europa", USA: "Americhe",
  "United States": "Americhe", Germany: "Europa", Portugal: "Europa",
  "South Africa": "Africa", India: "Asia", Korea: "Asia", Argentina: "Americhe",
  Morocco: "Africa",
};

export function continentOf(country: string): string {
  return CONTINENT_BY_COUNTRY[country] ?? "Altro";
}

/** Driver code -> OpenF1 driver_number mapping is session-dependent; we match by acronym. */
export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
