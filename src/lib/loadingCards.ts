import rawCards from "../data/loading-cards.json";

export interface LoadingCardSource {
  name: string;
  section?: string;
  url: string;
}

export interface LoadingCard {
  kind: "region" | "lawyer";
  text: string;
  source?: LoadingCardSource;
}

interface LoadingCardsJson {
  _about: {
    built: string;
    how: string;
    show_source: string;
    approved_for_launch: boolean;
    approval_note: string;
    do_not_edit: string;
  };
  [key: string]: unknown;
}

const typedRaw = rawCards as unknown as LoadingCardsJson;

/**
 * Normalizes state/province code or name into a canonical region key.
 * e.g. "ON" -> "CA-ON", "Ontario" -> "CA-ON", "NY" -> "US-NY", "New York" -> "US-NY"
 */
export function normalizeRegionCode(
  inputCode?: string | null,
  countryHint?: string | null
): string {
  if (!inputCode) {
    return countryHint === "US" ? "US-*" : "CA-ON";
  }

  const trimmed = inputCode.trim().toUpperCase();

  // If already in CC-XX format
  if (trimmed.startsWith("CA-") || trimmed.startsWith("US-")) {
    return trimmed;
  }

  // Common US states
  const usStates: Record<string, string> = {
    AZ: "US-AZ", ARIZONA: "US-AZ",
    CA: "US-CA", CALIFORNIA: "US-CA",
    DE: "US-DE", DELAWARE: "US-DE",
    FL: "US-FL", FLORIDA: "US-FL",
    IL: "US-IL", ILLINOIS: "US-IL",
    IA: "US-IA", IOWA: "US-IA",
    ME: "US-ME", MAINE: "US-ME",
    MD: "US-MD", MARYLAND: "US-MD",
    MA: "US-MA", MASSACHUSETTS: "US-MA",
    MI: "US-MI", MICHIGAN: "US-MI",
    MN: "US-MN", MINNESOTA: "US-MN",
    NH: "US-NH", "NEW HAMPSHIRE": "US-NH",
    NJ: "US-NJ", "NEW JERSEY": "US-NJ",
    NY: "US-NY", "NEW YORK": "US-NY",
    NC: "US-NC", "NORTH CAROLINA": "US-NC",
    OH: "US-OH", OHIO: "US-OH",
    PA: "US-PA", PENNSYLVANIA: "US-PA",
    TN: "US-TN", TENNESSEE: "US-TN",
    TX: "US-TX", TEXAS: "US-TX",
    VT: "US-VT", VERMONT: "US-VT",
    WA: "US-WA", WASHINGTON: "US-WA",
    WI: "US-WI", WISCONSIN: "US-WI",
  };

  // Canadian provinces
  const caProvinces: Record<string, string> = {
    AB: "CA-AB", ALBERTA: "CA-AB",
    BC: "CA-BC", "BRITISH COLUMBIA": "CA-BC",
    FED: "CA-FED", FEDERAL: "CA-FED",
    MB: "CA-MB", MANITOBA: "CA-MB",
    NB: "CA-NB", "NEW BRUNSWICK": "CA-NB",
    NL: "CA-NL", "NEWFOUNDLAND AND LABRADOR": "CA-NL", NEWFOUNDLAND: "CA-NL",
    NS: "CA-NS", "NOVA SCOTIA": "CA-NS",
    ON: "CA-ON", ONTARIO: "CA-ON",
    PE: "CA-PE", PEI: "CA-PE", "PRINCE EDWARD ISLAND": "CA-PE",
    SK: "CA-SK", SASKATCHEWAN: "CA-SK",
  };

  if (countryHint === "US" || usStates[trimmed]) {
    return usStates[trimmed] || "US-*";
  }

  if (caProvinces[trimmed]) {
    return caProvinces[trimmed];
  }

  return countryHint === "CA" ? "CA-ON" : "US-*";
}

/**
 * Returns human-readable region display name for step 4 and card header.
 */
export function getRegionDisplayName(
  regionCode: string,
  providedName?: string | null
): string {
  if (providedName && providedName.trim()) {
    return providedName.trim();
  }

  const names: Record<string, string> = {
    "CA-AB": "Alberta",
    "CA-BC": "British Columbia",
    "CA-FED": "Federal jurisdiction",
    "CA-MB": "Manitoba",
    "CA-NB": "New Brunswick",
    "CA-NL": "Newfoundland and Labrador",
    "CA-NS": "Nova Scotia",
    "CA-ON": "Ontario",
    "CA-PE": "Prince Edward Island",
    "CA-SK": "Saskatchewan",
    "US-AZ": "Arizona",
    "US-CA": "California",
    "US-DE": "Delaware",
    "US-FL": "Florida",
    "US-IL": "Illinois",
    "US-IA": "Iowa",
    "US-ME": "Maine",
    "US-MD": "Maryland",
    "US-MA": "Massachusetts",
    "US-MI": "Michigan",
    "US-MN": "Minnesota",
    "US-NH": "New Hampshire",
    "US-NJ": "New Jersey",
    "US-NY": "New York",
    "US-NC": "North Carolina",
    "US-OH": "Ohio",
    "US-PA": "Pennsylvania",
    "US-TN": "Tennessee",
    "US-TX": "Texas",
    "US-VT": "Vermont",
    "US-WA": "Washington",
    "US-WI": "Wisconsin",
    "US-*": "United States",
  };

  return names[regionCode] || "your region";
}

/**
 * Loads loading cards for the selected region.
 * - Follows exact order in loading-cards.json (region -> lawyer -> region -> lawyer)
 * - If in production and !_about.approved_for_launch, filters out kind === "region"
 * - In US, replaces "lawyer" with "attorney"
 */
export function getLoadingCardsForRegion(
  regionCode: string,
  isUS: boolean,
  forceAllowRegionCards = false
): LoadingCard[] {
  let list = (typedRaw[regionCode] as LoadingCard[] | undefined) || [];

  // Fallback if region not found
  if (!list.length) {
    if (isUS || regionCode.startsWith("US-")) {
      list = (typedRaw["US-*"] as LoadingCard[] | undefined) || [];
    } else {
      list = (typedRaw["CA-FED"] as LoadingCard[] | undefined) || [];
    }
  }

  const approved = typedRaw._about?.approved_for_launch ?? false;
  const isProduction = process.env.NODE_ENV === "production";

  // In production, respect _about.approved_for_launch (hide region cards until approved)
  const shouldFilterRegionCards = isProduction && !approved && !forceAllowRegionCards;

  let filtered = list;
  if (shouldFilterRegionCards) {
    filtered = list.filter((c) => c.kind !== "region");
    // If filtering left zero cards, use generic lawyer cards from US-* or CA-ON
    if (!filtered.length) {
      const fallbackList = (typedRaw[isUS ? "US-*" : "CA-ON"] as LoadingCard[]) || [];
      filtered = fallbackList.filter((c) => c.kind !== "region");
    }
  }

  // If in US, adapt "lawyer" to "attorney" in card texts
  if (isUS) {
    return filtered.map((card) => {
      let text = card.text;
      text = text.replace(/\ban employment lawyer\b/gi, "an employment attorney");
      text = text.replace(/\ba lawyer\b/gi, "an attorney");
      text = text.replace(/\blawyer\b/gi, "attorney");
      text = text.replace(/\blawyers\b/gi, "attorneys");
      return { ...card, text };
    });
  }

  return filtered;
}

export const isApprovedForLaunch = Boolean(typedRaw._about?.approved_for_launch);

