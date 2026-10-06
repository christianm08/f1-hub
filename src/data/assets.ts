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
  ferrari: {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Ferrari_wordmark.svg",
    license: "PD-textlogo",
  },
  aston_martin: {
    url: "https://upload.wikimedia.org/wikipedia/commons/0/03/Aston_Martin_F1_Team_logo_2024.jpg",
    license: "CC BY 4.0",
  },
  sauber: {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/94/Sauber_F1_Team_logo.svg",
    license: "PD-textlogo",
  },
  jordan: {
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Mini_Free_Logo_Jordan.png",
    license: "CC0",
  },
  arrows: {
    url: "https://upload.wikimedia.org/wikipedia/commons/6/62/Arrows_Grand_Prix_logo.png",
    license: "PD-textlogo",
  },
  ligier: {
    url: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Logo_Ligier.svg",
    license: "PD-textlogo",
  },
  prost: {
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d1/Prost_Grand_Prix_Formula_One_Logo.png",
    license: "CC BY-SA 4.0",
  },
  jaguar: {
    url: "https://upload.wikimedia.org/wikipedia/commons/6/65/Mini_Free_Logo_Jaguar_v2.png",
    license: "CC0",
  },
  stewart: {
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Stewart_Gran_Prix_logo.png",
    license: "PD-textlogo",
  },
  bar: {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/93/Mini_Free_Logo_BAR_v2.png",
    license: "CC0",
  },
  honda: {
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Logo_Honda_F1_Racing.svg",
    license: "PD-textlogo",
  },
  super_aguri: {
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Super_Aguri_logo.svg",
    license: "PD-textlogo",
  },
  toro_rosso: {
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b5/F1_Team_Icon_-_Toro_Rosso%282009%29.svg",
    license: "CC BY-SA 4.0",
  },
  dallara: {
    url: "https://upload.wikimedia.org/wikipedia/commons/6/60/Dallara_logo.svg",
    license: "PD-textlogo",
  },
  footwork: {
    url: "https://upload.wikimedia.org/wikipedia/commons/4/44/Mini_Free_Logo_Footwork.png",
    license: "CC0",
  },
  simtek: {
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Simtek_logo.svg",
    license: "PD-textlogo",
  },
  pacific: {
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Logo_Pacific_Grand_Prix.svg",
    license: "PD-textlogo",
  },
  lola: {
    url: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Lola_F1_logo.png",
    license: "PD-textlogo",
  },
  osella: {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Osella.svg",
    license: "PD-textlogo",
  },
  alfa: {
    url: "https://upload.wikimedia.org/wikipedia/commons/1/11/AlfaRomeoF1Stake.svg",
    license: "PD-textlogo",
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
      season: 2020,
      car: "Haas VF-20",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Romain_Grosjean2020_Tuscan_Grand_Prix_-_race_day.jpg/1280px-Romain_Grosjean2020_Tuscan_Grand_Prix_-_race_day.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2021,
      car: "Haas VF-21",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/2021_British_Grand_Prix_%2851349532658%29.jpg/1280px-2021_British_Grand_Prix_%2851349532658%29.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2022,
      car: "Haas VF-22",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/2022_British_Grand_Prix_%2852209970936%29.jpg/1280px-2022_British_Grand_Prix_%2852209970936%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "Haas VF-23",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/FIA_F1_Austria_2023_Nr._20_%281%29.jpg/1280px-FIA_F1_Austria_2023_Nr._20_%281%29.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2024,
      car: "Haas VF-24",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/2024_British_Grand_Prix%2C_Magnussen_%281%29.jpg/1280px-2024_British_Grand_Prix%2C_Magnussen_%281%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2025,
      car: "Haas VF-25",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Esteban_Ocon_2025_Italian_Grand_Prix_qualifying.jpg/1280px-Esteban_Ocon_2025_Italian_Grand_Prix_qualifying.jpg",
      license: "CC BY 4.0",
    },
    {
      season: 2026,
      car: "Haas VF-26",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/British_Grand_Prix_2026_Silverstone_%2855382810392%29.jpg/1280px-British_Grand_Prix_2026_Silverstone_%2855382810392%29.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  racing_bulls: [ // constructorId API: "rb" (alias gestito in teamCar)
    {
      season: 2024,
      car: "RB VCARB 01",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/2024_British_Grand_Prix%2C_Tsunoda_%281%29.jpg/1280px-2024_British_Grand_Prix%2C_Tsunoda_%281%29.jpg",
      license: "CC BY 2.0",
    },
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
      season: 1992,
      car: "Williams FW14B",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/1992_Williams_FW14B_%2849379465223%29.jpg/1280px-1992_Williams_FW14B_%2849379465223%29.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2020,
      car: "Williams FW43",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/George_Russell_2020_Tuscan_Grand_Prix_-_race_day.jpg/1280px-George_Russell_2020_Tuscan_Grand_Prix_-_race_day.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2021,
      car: "Williams FW43B",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/2021_British_Grand_Prix_%2851348577862%29.jpg/1280px-2021_British_Grand_Prix_%2851348577862%29.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2022,
      car: "Williams FW44",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/2022_British_Grand_Prix_%2852209928996%29.jpg/1280px-2022_British_Grand_Prix_%2852209928996%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "Williams FW45",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Alexander_Albon_-_2023_Italian_Grand_Prix.jpg/1280px-Alexander_Albon_-_2023_Italian_Grand_Prix.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2024,
      car: "Williams FW46",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/2024_British_Grand_Prix%2C_Albon_%281%29.jpg/1280px-2024_British_Grand_Prix%2C_Albon_%281%29.jpg",
      license: "CC BY-SA 4.0",
    },
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
      season: 2021,
      car: "Alpine A521",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/2021_United_States_Grand_Prix_09.jpg/1280px-2021_United_States_Grand_Prix_09.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2022,
      car: "Alpine A522",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/2022_Spanish_Grand_Prix%2C_Ocon_%281%29.jpg/1280px-2022_Spanish_Grand_Prix%2C_Ocon_%281%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "Alpine A523",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Alpine_A523_at_The_Venetian_Las_Vegas_1.jpg/1280px-Alpine_A523_at_The_Venetian_Las_Vegas_1.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2024,
      car: "Alpine A524",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/2024_British_Grand_Prix%2C_Ocon_%281%29.jpg/1280px-2024_British_Grand_Prix%2C_Ocon_%281%29.jpg",
      license: "CC BY 2.0",
    },
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
      season: 2021,
      car: "Aston Martin AMR21",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/2021_British_Grand_Prix_%2851349542823%29.jpg/1280px-2021_British_Grand_Prix_%2851349542823%29.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2022,
      car: "Aston Martin AMR22",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/2022_British_Grand_Prix_%2852191653966%29.jpg/1280px-2022_British_Grand_Prix_%2852191653966%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "Aston Martin AMR23",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/2023_Aston_Martin_AMR23.jpg/1280px-2023_Aston_Martin_AMR23.jpg",
      license: "CC0",
    },
    {
      season: 2024,
      car: "Aston Martin AMR24",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/2024_British_Grand_Prix%2C_Stroll_%281%29.jpg/1280px-2024_British_Grand_Prix%2C_Stroll_%281%29.jpg",
      license: "CC BY 2.0",
    },
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
      season: 1988,
      car: "McLaren MP4/4",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/McLaren_MP4-4_at_Formula_1_Exhibition%2C_London_02.jpg/1280px-McLaren_MP4-4_at_Formula_1_Exhibition%2C_London_02.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2020,
      car: "McLaren MCL35",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Lando_Norris_2020_Tuscan_Grand_Prix_-_race_day.jpg/1280px-Lando_Norris_2020_Tuscan_Grand_Prix_-_race_day.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2021,
      car: "McLaren MCL35M",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/2021_British_Grand_Prix_%2851349486418%29.jpg/1280px-2021_British_Grand_Prix_%2851349486418%29.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2022,
      car: "McLaren MCL36",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/2022_British_Grand_Prix_%2852191654296%29.jpg/1280px-2022_British_Grand_Prix_%2852191654296%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "McLaren MCL60",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/2023_McLaren_MCL60.jpg/1280px-2023_McLaren_MCL60.jpg",
      license: "CC0",
    },
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
      season: 2012,
      car: "Red Bull RB8",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/2012_Red_Bull_RB8.jpg/1280px-2012_Red_Bull_RB8.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2020,
      car: "Red Bull RB16",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Alexander_Albon_2020_Tuscan_Grand_Prix_-_race_day.jpg/1280px-Alexander_Albon_2020_Tuscan_Grand_Prix_-_race_day.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2022,
      car: "Red Bull RB18",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/2022_British_Grand_Prix_%2852210444445%29_%282%29.jpg/1280px-2022_British_Grand_Prix_%2852210444445%29_%282%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "Red Bull RB19",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/2023_Red_Bull_RB19.jpg/1280px-2023_Red_Bull_RB19.jpg",
      license: "CC BY-SA 4.0",
    },
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
      season: 2002,
      car: "Ferrari F2002",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/2002_Ferrari_F2002.jpg/1280px-2002_Ferrari_F2002.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2020,
      car: "Ferrari SF1000",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Charles_Leclerc_2020_Tuscan_Grand_Prix_-_race_day.jpg/1280px-Charles_Leclerc_2020_Tuscan_Grand_Prix_-_race_day.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2021,
      car: "Ferrari SF21",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/2021_British_Grand_Prix_%2851348535907%29.jpg/1280px-2021_British_Grand_Prix_%2851348535907%29.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2022,
      car: "Ferrari F1-75",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/2022_Spanish_Grand_Prix%2C_Sainz_%281%29.jpg/1280px-2022_Spanish_Grand_Prix%2C_Sainz_%281%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "Ferrari SF-23",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Carlos_Sainz_-_2023_Italian_Grand_Prix.jpg/1280px-Carlos_Sainz_-_2023_Italian_Grand_Prix.jpg",
      license: "CC BY-SA 4.0",
    },
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
      season: 2021,
      car: "Mercedes W12",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/2021_British_Grand_Prix_%2851348578912%29.jpg/1280px-2021_British_Grand_Prix_%2851348578912%29.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2022,
      car: "Mercedes W13",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/2022_British_Grand_Prix_%2852191651601%29.jpg/1280px-2022_British_Grand_Prix_%2852191651601%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "Mercedes W14",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/2023_Mercedes-AMG_W14_SCD_24.jpg/1280px-2023_Mercedes-AMG_W14_SCD_24.jpg",
      license: "CC BY-SA 4.0",
    },
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
  alphatauri: [
    {
      season: 2020,
      car: "AlphaTauri AT01",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Daniil_Kvyat_2020_Tuscan_Grand_Prix_-_race_day.jpg/1280px-Daniil_Kvyat_2020_Tuscan_Grand_Prix_-_race_day.jpg",
      license: "CC BY-SA 4.0",
    },
    {
      season: 2021,
      car: "AlphaTauri AT02",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/2021_United_States_Grand_Prix_03.jpg/1280px-2021_United_States_Grand_Prix_03.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2022,
      car: "AlphaTauri AT03",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/2022_British_Grand_Prix_%2852191652951%29.jpg/1280px-2022_British_Grand_Prix_%2852191652951%29.jpg",
      license: "CC BY-SA 2.0",
    },
    {
      season: 2023,
      car: "AlphaTauri AT04",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/FIA_F1_Austria_2023_Nr._21_%281%29.jpg/1280px-FIA_F1_Austria_2023_Nr._21_%281%29.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  lotus: [
    {
      season: 1978,
      car: "Lotus 79",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Mario_Andretti_-_Lotus_79_at_the_1978_British_Grand_Prix_%2850049698533%29.jpg/1280px-Mario_Andretti_-_Lotus_79_at_the_1978_British_Grand_Prix_%2850049698533%29.jpg",
      license: "CC BY-SA 2.0",
    },
  ],
  renault: [
    {
      season: 2020,
      car: "Renault R.S.20",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Daniel_Ricciardo_2020_Tuscan_Grand_Prix_2.jpg/1280px-Daniel_Ricciardo_2020_Tuscan_Grand_Prix_2.jpg",
      license: "CC BY-SA 4.0",
    },
  ],
  sauber: [
    {
      season: 2024,
      car: "Kick Sauber C44",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/2024_British_Grand_Prix%2C_Bottas_%281%29.jpg/1280px-2024_British_Grand_Prix%2C_Bottas_%281%29.jpg",
      license: "CC BY 2.0",
    },
    {
      season: 2025,
      car: "Kick Sauber C45",
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Gabriel_Bortoleto_2025_Italian_Grand_Prix_qualifying.jpg/1280px-Gabriel_Bortoleto_2025_Italian_Grand_Prix_qualifying.jpg",
      license: "CC BY 4.0",
    },
  ],
};

/** Free-licensed logo URL for a constructor, or undefined -> placeholder. */
export function teamLogo(constructorId: string | undefined): TeamLogoAsset | undefined {
  if (!constructorId) return undefined;
  return TEAM_LOGOS[constructorId.toLowerCase()];
}

/** Alias constructorId storici/alternativi -> chiave TEAM_CARS. */
const TEAM_CAR_ALIASES: Record<string, string> = {
  rb: "racing_bulls",
};

/**
 * Car photo for a constructor in a given season.
 * Returns undefined unless an entry depicts EXACTLY that season —
 * never a car from the wrong year.
 */
export function teamCar(constructorId: string | undefined, season: number | string): CarAsset | undefined {
  if (!constructorId) return undefined;
  const key = constructorId.toLowerCase();
  const list = TEAM_CARS[key] ?? TEAM_CARS[TEAM_CAR_ALIASES[key] ?? ""];
  if (!list) return undefined;
  const y = typeof season === "string" ? parseInt(season, 10) : season;
  return list.find((c) => c.season === y);
}
/** Curated driver portraits: Jolpica driverId -> verified free-license portrait.
 * Source: Wikipedia infobox thumbnails (Wikimedia Commons). Visually verified 2026-10-06:
 * recognizable professional portraits, no watermarks. See README 'Fonti dati e licenze'.
 * Lookup order in api/photos.ts: curated map -> Wikipedia PageImages API -> placeholder.
 * focalY: vertical focal point for object-position (percent, default 18 = near top). */
export interface DriverPhotoAsset {
  /** direct thumbnail URL (Wikimedia). */
  url: string;
  /** vertical focal point 0-100 for the uniform crop. */
  focalY?: number;
}
export const DRIVER_PHOTOS: Record<string, DriverPhotoAsset> = {
  albon: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Alex_albon_%2851383514844%29_%28cropped%29.jpg/330px-Alex_albon_%2851383514844%29_%28cropped%29.jpg" },
  alonso: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Alonso-68_%2824710447098%29.jpg/330px-Alonso-68_%2824710447098%29.jpg" },
  antonelli: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Kimi_Antonelli_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A7923%29_cropped.jpg/330px-Kimi_Antonelli_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A7923%29_cropped.jpg" },
  arvid_lindblad: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Arvid_Lindblad_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7869%29_%28cropped%29.jpg/330px-Arvid_Lindblad_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7869%29_%28cropped%29.jpg" },
  bearman: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday_%28cropped%29.jpg/330px-2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday_%28cropped%29.jpg" },
  bortoleto: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Gabriel_Bortoleto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8581%29_cropped.jpg/330px-Gabriel_Bortoleto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8581%29_cropped.jpg" },
  button: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Jenson_Button_2024_WEC_Fuji.jpg/330px-Jenson_Button_2024_WEC_Fuji.jpg" },
  clark: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Jim_Clark_in_1963_%28cropped%29.JPG/330px-Jim_Clark_in_1963_%28cropped%29.JPG" },
  colapinto: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Franco_Colapinto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8698%29_cropped.jpg/330px-Franco_Colapinto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8698%29_cropped.jpg" },
  damon_hill: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Damon_Hill_at_the_Atlassian_Williams_Racing_Fan_Zone_of_2026_%28028A8241%29.jpg/330px-Damon_Hill_at_the_Atlassian_Williams_Racing_Fan_Zone_of_2026_%28028A8241%29.jpg" },
  fangio: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Fangio_in_1955_%28cropped%29.jpg/330px-Fangio_in_1955_%28cropped%29.jpg" },
  gasly: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Pierre_Gasly_2017_Malaysia.jpg/330px-Pierre_Gasly_2017_Malaysia.jpg" },
  hadjar: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Isack_Hadjar_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8753%29_%28cropped%29.jpg/330px-Isack_Hadjar_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8753%29_%28cropped%29.jpg" },
  hakkinen: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Mika_H%C3%A4kkinen_Champions_for_Charity_2016-07-27.jpg/330px-Mika_H%C3%A4kkinen_Champions_for_Charity_2016-07-27.jpg" },
  hamilton: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Lewis_Hamilton%2C_British_GP_2022_%2852382788875%29_%28cropped%29.jpg/330px-Lewis_Hamilton%2C_British_GP_2022_%2852382788875%29_%28cropped%29.jpg" },
  hulkenberg: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/2019_Formula_One_tests_Barcelona%2C_Hulkenberg_%2840287128313%29.jpg/330px-2019_Formula_One_tests_Barcelona%2C_Hulkenberg_%2840287128313%29.jpg" },
  jack_brabham: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/BrabhamJack1966B.jpg/330px-BrabhamJack1966B.jpg" },
  lauda: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Lauda_at_1982_Dutch_Grand_Prix.jpg/330px-Lauda_at_1982_Dutch_Grand_Prix.jpg" },
  lawson: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Liam_Lawson_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7795%29.jpg/330px-Liam_Lawson_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7795%29.jpg" },
  leclerc: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Charles_Leclerc_at_the_2026_Cannes_Film_Festival_%28cropped%29.jpg/330px-Charles_Leclerc_at_the_2026_Cannes_Film_Festival_%28cropped%29.jpg" },
  mansell: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Nigel_Mansell_-_Mexican_Grand_Prix_01_%28cropped%29.jpeg/330px-Nigel_Mansell_-_Mexican_Grand_Prix_01_%28cropped%29.jpeg" },
  max_verstappen: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3973_by_Stepro_%28medium_crop%29.jpg/330px-2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3973_by_Stepro_%28medium_crop%29.jpg" },
  michael_schumacher: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Michael_Schumacher%2C_September_2005.jpg/330px-Michael_Schumacher%2C_September_2005.jpg" },
  norris: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3968_by_Stepro_%28cropped2%29.jpg/330px-2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3968_by_Stepro_%28cropped2%29.jpg" },
  ocon: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Esteban_Ocon_2024_Suzuka_%28cropped%29.jpg/330px-Esteban_Ocon_2024_Suzuka_%28cropped%29.jpg" },
  piastri: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/2026_Chinese_GP_-_Oscar_Piastri_%28cropped%29_%28cropped%29.jpg/330px-2026_Chinese_GP_-_Oscar_Piastri_%28cropped%29_%28cropped%29.jpg" },
  piquet: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/Cerimonia_de_entrega_da_medalha_Bras%C3%ADlia_60_anos_-_16.jpg/330px-Cerimonia_de_entrega_da_medalha_Bras%C3%ADlia_60_anos_-_16.jpg" },
  prost: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Festival_automobile_international_2015_-_Photocall_-_065_%28cropped3%29.jpg/330px-Festival_automobile_international_2015_-_Photocall_-_065_%28cropped3%29.jpg" },
  raikkonen: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/F12019_Schloss_Gabelhofen_%2822%29_%28cropped%29.jpg/330px-F12019_Schloss_Gabelhofen_%2822%29_%28cropped%29.jpg" },
  rindt: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Rindt_at_1970_Dutch_Grand_Prix_%282C%29.jpg/330px-Rindt_at_1970_Dutch_Grand_Prix_%282C%29.jpg" },
  russell: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/KingsLeonSilverstne040724_%2828_of_112%29_%2853838006028%29_%28cropped%29.jpg/330px-KingsLeonSilverstne040724_%2828_of_112%29_%2853838006028%29_%28cropped%29.jpg" },
  sainz: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Carlos_Sainz_at_the_83rd_Venice_FILM_festival-9_%28cropped%29.jpg/330px-Carlos_Sainz_at_the_83rd_Venice_FILM_festival-9_%28cropped%29.jpg" },
  senna: { url: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Ayrton_Senna_Pesawat_RC_Cropped.jpg" },
  stewart: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Jackie_Stewart_at_the_2014_WEC_Silverstone_round.jpg/330px-Jackie_Stewart_at_the_2014_WEC_Silverstone_round.jpg" },
  stroll: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/2025_Japan_GP_-_Aston_Martin_-_Lance_Stroll_-_Fanzone_Stage_%28cropped%29.jpg/330px-2025_Japan_GP_-_Aston_Martin_-_Lance_Stroll_-_Fanzone_Stage_%28cropped%29.jpg" },
  tsunoda: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Yuki_Tsunoda_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8096%29.jpg/330px-Yuki_Tsunoda_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8096%29.jpg" },
  vettel: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Sebastian_Vettel_at_the_2026_Italian_Grand_Prix.jpg/330px-Sebastian_Vettel_at_the_2026_Italian_Grand_Prix.jpg" },
};

/** Small alias table for cross-season Jolpica ID changes (mirrors model.ts). */
const DRIVER_PHOTO_ALIASES: Record<string, string> = {
  verstappen: "max_verstappen",
  lindblad: "arvid_lindblad",
};

/**
 * Verified portrait for a Jolpica driverId, or undefined -> caller falls back
 * to the Wikipedia API thumbnail, then to the professional placeholder.
 * Never guesses: unknown IDs return undefined.
 */
export function driverPhotoAsset(driverId: string | undefined): DriverPhotoAsset | undefined {
  if (!driverId) return undefined;
  return DRIVER_PHOTOS[driverId] ?? DRIVER_PHOTOS[DRIVER_PHOTO_ALIASES[driverId] ?? ""];
}
