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

const FLAG_BY_COUNTRY: Record<string, string> = {
  Australia: "🇦🇺", Austria: "🇦🇹", Azerbaijan: "🇦🇿", Bahrain: "🇧🇭", Belgium: "🇧🇪",
  Brazil: "🇧🇷", Canada: "🇨🇦", China: "🇨🇳", France: "🇫🇷", Hungary: "🇭🇺",
  Italy: "🇮🇹", Japan: "🇯🇵", Malaysia: "🇲🇾", Mexico: "🇲🇽", Monaco: "🇲🇨",
  Netherlands: "🇳🇱", Qatar: "🇶🇦", Russia: "🇷🇺", "Saudi Arabia": "🇸🇦", Singapore: "🇸🇬",
  Spain: "🇪🇸", Turkey: "🇹🇷", UAE: "🇦🇪", UK: "🇬🇧", USA: "🇺🇸", "United States": "🇺🇸",
  Germany: "🇩🇪", Portugal: "🇵🇹", "South Africa": "🇿🇦", India: "🇮🇳", Korea: "🇰🇷",
  Argentina: "🇦🇷", Morocco: "🇲🇦", Switzerland: "🇨🇭", Sweden: "🇸🇪",
  Finland: "🇫🇮", Denmark: "🇩🇰", Thailand: "🇹🇭", "New Zealand": "🇳🇿", Poland: "🇵🇱",
  Ireland: "🇮🇪", Colombia: "🇨🇴", Venezuela: "🇻🇪",
  Chile: "🇨🇱", Uruguay: "🇺🇾", "Czech Republic": "🇨🇿", Rhodesia: "🏁", Liechtenstein: "🇱🇮",
  East: "🏁",
};

const NAT_FLAG: Record<string, string> = {
  Italian: "🇮🇹", British: "🇬🇧", German: "🇩🇪", French: "🇫🇷", Dutch: "🇳🇱",
  Spanish: "🇪🇸", Finnish: "🇫🇮", Brazilian: "🇧🇷", Mexican: "🇲🇽", Australian: "🇦🇺",
  Japanese: "🇯🇵", Canadian: "🇨🇦", Danish: "🇩🇰", Thai: "🇹🇭", Monegasque: "🇲🇨",
  "New Zealander": "🇳🇿", American: "🇺🇸", Argentine: "🇦🇷", Chinese: "🇨🇳", Austrian: "🇦🇹",
  Swiss: "🇨🇭", Swedish: "🇸🇪", Irish: "🇮🇪", Polish: "🇵🇱", Indian: "🇮🇳",
  Portuguese: "🇵🇹", Belgian: "🇧🇪", Colombian: "🇨🇴", Venezuelan: "🇻🇪", Chilean: "🇨🇱",
  Russian: "🇷🇺", Indonesian: "🇮🇩", Malaysian: "🇲🇾", "South African": "🇿🇦",
};

export function countryFlag(country: string): string {
  return FLAG_BY_COUNTRY[country] ?? "🏁";
}

export function nationalityFlag(nationality: string): string {
  return NAT_FLAG[nationality] ?? "🏁";
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
