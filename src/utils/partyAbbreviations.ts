export const PARTY_NAME_TO_ABBREVIATION: Record<string, string> = {
  Socialdemokraterna: "S",
  Moderaterna: "M",
  Sverigedemokraterna: "SD",
  Centerpartiet: "C",
  Vänsterpartiet: "V",
  Kristdemokraterna: "KD",
  Liberalerna: "L",
  Miljöpartiet: "MP",
};

export const PARTY_ABBREVIATION_TO_NAME: Record<string, string> =
  Object.fromEntries(
    Object.entries(PARTY_NAME_TO_ABBREVIATION).map(([name, abbreviation]) => [
      abbreviation,
      name,
    ]),
  );

export function getPartyAbbreviation(partyName: string): string | undefined {
  return PARTY_NAME_TO_ABBREVIATION[partyName];
}
