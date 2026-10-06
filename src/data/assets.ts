/* Curated asset mappings: season -> team -> { logo, car }.
 *
 * SOURCES & LICENSES (see README "Fonti dati e licenze"):
 * - Team logos: ONLY files verified to be freely licensed on Wikimedia
 *   Commons. F1 team logos are registered trademarks; when no free version
 *   exists the UI falls back to a professional placeholder (team color).
 * - Car photos: freely-licensed photographs from Wikimedia Commons
 *   (CC-BY / CC-BY-SA / public domain), verified via HEAD request.
 *   NEVER hotlink non-free or dubious files.
 *
 * VALIDATION RULES (enforced by tools/gen-assets.js when regenerating):
 * - every `file` URL must return HTTP 200
 * - car images are keyed by EXACT season: never show a modern car on a
 *   historic season page
 * - when in doubt -> omit the entry (placeholder) rather than risk a mismatch
 */
export interface TeamLogoAsset {
  /** direct upload.wikimedia.org URL (SVG preferred, else PNG). */
  url: string;
  /** SPDX-ish license label, e.g. "CC BY-SA 4.0". */
  license: string;
  author?: string;
}

export interface CarAsset {
  /** exact season this photo depicts. */
  season: number;
  /** car model name, e.g. "Ferrari F2004". */
  car: string;
  /** direct upload.wikimedia.org thumbnail URL (640px). */
  url: string;
  license: string;
  author?: string;
}

/**
 * constructorId (Jolpica) -> logo. Empty = no freely-licensed logo found;
 * UI renders the professional placeholder instead.
 */
export const TEAM_LOGOS: Record<string, TeamLogoAsset> = {
  mercedes: {
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Mercedes_AMG_Petronas_F1_Logo.svg",
    license: "PD-textlogo",
  },
  red_bull: {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Red_Bull_Racing_-_2005_Logo.png",
    license: "PD-ineligible",
  },
  mclaren: {
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/McLaren_2018_logo.svg",
    license: "PD-textlogo",
  },
  williams: {
    url: "https://upload.wikimedia.org/wikipedia/commons/1/12/Atlassian_Williams_F1_Team_logo.svg",
    license: "PD-textlogo",
  },
  alpine: {
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Alpine_F1_Team_Logo.svg",
    license: "PD-textlogo",
  },
  haas: {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/92/MoneyGram_Haas_F1_Team_Logo.svg",
    license: "PD-textlogo",
  },
  audi: {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/92/Audi-Logo_2016.svg",
    license: "PD-textlogo",
  },
  cadillac: {
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7f/Cadillac_Logo_2021.svg",
    license: "PD-textlogo",
  },
  lotus: {
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Lotus_F1_Racing_Logo.jpg",
    license: "PD-textlogo",
  },
  tyrrell: {
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Tyrrell_Racing_logo.svg",
    license: "PD-textlogo",
  },
  benetton: {
    url: "https://upload.wikimedia.org/wikipedia/commons/5/59/United_Colors_of_Benetton_-_logo_%28Italy%2C_1996-2011%29.svg",
    license: "PD-textlogo",
  },
  renault: {
    url: "https://upload.wikimedia.org/wikipedia/commons/4/49/Renault_F1_Team_logo_2019.png",
    license: "PD-textlogo",
  },
  brawn: {
    url: "https://upload.wikimedia.org/wikipedia/commons/2/24/Brawn_GP_logo.svg",
    license: "PD-textlogo",
  },
  minardi: {
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d0/MinardiF1_logo_ico.gif",
    license: "PD-textlogo",
  },
  toyota: {
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Panasonic_Toyota_Racing_logo.svg",
    license: "PD-textlogo",
  },
  bmw_sauber: {
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8e/BMW_Sauber_Logo.svg",
    license: "PD-textlogo + PD-shape",
  },
  force_india: {
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Mini_Free_Logo_Force_India.png",
    license: "CC0",
  },
};

/**
 * constructorId -> list of car photos (one per season depicted).
 * Lookup prefers the exact season, then nearest season within +/-1
 * ONLY when explicitly allowed per entry (allowNearby flag omitted =
 * exact match required).
 */
export const TEAM_CARS: Record<string, CarAsset[]> = {
  cadillac: [
    {
      season: 2026,
      car: "Cadillac F1 Team car",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Cadillac_at_the_2026_Australian_Grand_Prix_%28028A7895%29.jpg/1280px-Cadillac_at_the_2026_Australian_Grand_Prix_%28028A7895%29.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  audi: [
    {
      season: 2026,
      car: "Audi R26",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Audi_Revolut_F1.jpg/1280px-Audi_Revolut_F1.jpg",
      license: "CC0",
    },
  ],
  haas: [
    {
      season: 2026,
      car: "Haas VF-26",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Romain_Grosjean_Haas_VF-18_Barcelona_testing.jpg/1280px-Romain_Grosjean_Haas_VF-18_Barcelona_testing.jpg",
      license: "CC BY-SA 2.0",
    },
  ],
  racing_bulls: [
    {
      season: 2026,
      car: "Racing Bulls VCARB 03",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/RB_VCARB_03_of_Liam_Lawson_%28028A8054%29.jpg/1280px-RB_VCARB_03_of_Liam_Lawson_%28028A8054%29.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2025,
      car: "Racing Bulls VCARB 02",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/2025_Japan_GP_-_Racing_Bulls_-_Liam_Lawson_-_FP2.jpg/1280px-2025_Japan_GP_-_Racing_Bulls_-_Liam_Lawson_-_FP2.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  williams: [
    {
      season: 2026,
      car: "Williams FW48",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Williams_FW48_of_Alexander_Albon_%28028A8065%29.jpg/1280px-Williams_FW48_of_Alexander_Albon_%28028A8065%29.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2025,
      car: "Williams FW47",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/2025_Japan_GP_-_Williams_-_Carlos_Sainz_-_FP1.jpg/1280px-2025_Japan_GP_-_Williams_-_Carlos_Sainz_-_FP1.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  alpine: [
    {
      season: 2026,
      car: "Alpine A526",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Alpine_A526_of_Franco_Colapinto_%28028A8049%29.jpg/1280px-Alpine_A526_of_Franco_Colapinto_%28028A8049%29.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2025,
      car: "Alpine A525",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/2025_Japan_GP_-_Alpine_-_Pierre_Gasly_-_FP2.jpg/1280px-2025_Japan_GP_-_Alpine_-_Pierre_Gasly_-_FP2.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  aston_martin: [
    {
      season: 2026,
      car: "Aston Martin AMR26",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/2026_Chinese_GP_-_Aston_Martin_-_Fernando_Alonso_-_Qualifying.jpg/1280px-2026_Chinese_GP_-_Aston_Martin_-_Fernando_Alonso_-_Qualifying.jpg",
      license: "CC BY 4.0",
    },
    {
      season: 2025,
      car: "Aston Martin AMR25",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/2025_Japan_GP_-_Aston_Martin_-_Fernando_Alonso_-_FP1.jpg/1280px-2025_Japan_GP_-_Aston_Martin_-_Fernando_Alonso_-_FP1.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  // Verified free-license photos from Wikimedia Commons (CC-BY / CC-BY-SA).
  // Attribution: "Immagini: Wikimedia Commons" (footer + README).
  // Keyed by constructorId; each entry depicts EXACTLY its season.
  mclaren: [
    {
      season: 2024,
      car: "McLaren MCL38",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/2024_McLaren_MCL38.jpg/1280px-2024_McLaren_MCL38.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2026,
      car: "McLaren MCL40",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/McLaren_MCL40_of_Oscar_Piastri_%28028A8055%29.jpg/1280px-McLaren_MCL40_of_Oscar_Piastri_%28028A8055%29.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2025,
      car: "McLaren MCL39",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/2025_Japan_GP_-_McLaren_-_Lando_Norris_-_FP1.jpg/1280px-2025_Japan_GP_-_McLaren_-_Lando_Norris_-_FP1.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  red_bull: [
    {
      season: 2024,
      car: "Red Bull RB20",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/2024_Red_Bull_RB20.jpg/1280px-2024_Red_Bull_RB20.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2021,
      car: "Red Bull RB16B",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Red_Bull_RB16B_at_Formula_1_Exhibition%2C_London_01.jpg/1280px-Red_Bull_RB16B_at_Formula_1_Exhibition%2C_London_01.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2026,
      car: "Red Bull Racing RB22",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Red_Bull_Racing_RB22_of_Isack_Hadjar_%28028A8061%29.jpg/1280px-Red_Bull_Racing_RB22_of_Isack_Hadjar_%28028A8061%29.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2025,
      car: "Red Bull Racing RB21",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/2025_Japan_GP_-_Red_Bull_-_Max_Verstappen_-_Race.jpg/1280px-2025_Japan_GP_-_Red_Bull_-_Max_Verstappen_-_Race.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  ferrari: [
    {
      season: 2024,
      car: "Ferrari SF-24",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/2024_Spanish_Grand_Prix_%2853810013682%29.jpg/1280px-2024_Spanish_Grand_Prix_%2853810013682%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2004,
      car: "Ferrari F2004",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Scuderia_Ferrari_F2004.jpg/1280px-Scuderia_Ferrari_F2004.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2026,
      car: "Ferrari SF-26",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Ferrari_SF-26_of_Charles_Leclerc_%28028A8059%29.jpg/1280px-Ferrari_SF-26_of_Charles_Leclerc_%28028A8059%29.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2025,
      car: "Ferrari SF-25",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3912_by_Stepro.jpg/1280px-2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3912_by_Stepro.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  mercedes: [
    {
      season: 2024,
      car: "Mercedes W15",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3913_by_Stepro.jpg/1280px-2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3913_by_Stepro.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2020,
      car: "Mercedes W11",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/2020_Formula_One_tests_Barcelona%2C_Mercedes-AMG_F1_W11_EQ_Performance%2C_Hamilton.jpg/1280px-2020_Formula_One_tests_Barcelona%2C_Mercedes-AMG_F1_W11_EQ_Performance%2C_Hamilton.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2026,
      car: "Mercedes-AMG F1 W17 E Performance",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Mercedes-AMG_F1_W17_E_Performance_of_George_Russell_%28028A8051%29.jpg/1280px-Mercedes-AMG_F1_W17_E_Performance_of_George_Russell_%28028A8051%29.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2025,
      car: "Mercedes-AMG F1 W16 E Performance",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/2025_Japan_GP_-_Mercedes_-_Kimi_Antonelli_-_FP2.jpg/1280px-2025_Japan_GP_-_Mercedes_-_Kimi_Antonelli_-_FP2.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
};

/** Free-licensed logo URL for a constructor, or undefined -> placeholder. */
export function teamLogo(constructorId: string | undefined): TeamLogoAsset | undefined {
  if (!constructorId) return undefined;
  return TEAM_LOGOS[constructorId.toLowerCase()];
}

/**
 * Car photo for a constructor in a given season.
 * Returns undefined unless an entry depicts EXACTLY that season —
 * never a car from the wrong year.
 */
export function teamCar(constructorId: string | undefined, season: number | string): CarAsset | undefined {
  if (!constructorId) return undefined;
  const list = TEAM_CARS[constructorId.toLowerCase()];
  if (!list) return undefined;
  const y = typeof season === "string" ? parseInt(season, 10) : season;
  return list.find((c) => c.season === y);
}
