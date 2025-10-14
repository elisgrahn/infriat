export interface Promise {
  id: number;
  promise: string;
  party: string;
  date: string;
  status: "kept" | "broken" | "in-progress";
  description?: string;
}

export const mockPromises: Promise[] = [
  {
    id: 1,
    promise: "Sänka bensinpriset med 5 kronor per liter",
    party: "Moderaterna",
    date: "2022-09-15",
    status: "broken",
    description: "Löfte om att sänka bensinpriset genom skattesänkningar. Ingen konkret åtgärd har genomförts som resulterat i denna sänkning.",
  },
  {
    id: 2,
    promise: "Anställa 10 000 fler poliser",
    party: "Socialdemokraterna",
    date: "2018-08-20",
    status: "in-progress",
    description: "Pågående rekrytering av poliser. Cirka 6 500 nya poliser anställda sedan löftet gavs.",
  },
  {
    id: 3,
    promise: "Höja lägstalönerna inom vården",
    party: "Vänsterpartiet",
    date: "2022-06-10",
    status: "kept",
    description: "Genomförd reform som höjt lägstanivån för löner inom vårdsektorn med 5%.",
  },
  {
    id: 4,
    promise: "Införa hårdare straff för gängkriminalitet",
    party: "Sverigedemokraterna",
    date: "2022-09-11",
    status: "in-progress",
    description: "Lagförslag under behandling i riksdagen. Flera skärpningar av straff för gängrelaterad brottslighet föreslagna.",
  },
  {
    id: 5,
    promise: "Satsa 100 miljarder på klimatomställning",
    party: "Miljöpartiet",
    date: "2018-09-05",
    status: "broken",
    description: "Endast 40 miljarder har allokerats till klimatrelaterade projekt. Löftet har inte uppfyllts till fullo.",
  },
  {
    id: 6,
    promise: "Sänka skatten på pension",
    party: "Centerpartiet",
    date: "2022-07-20",
    status: "kept",
    description: "Skattesänkning för pensionärer genomförd 2023. Lägre skatt på pension för låg- och medelinkomsttagare.",
  },
  {
    id: 7,
    promise: "Öka resurserna till skolan med 10 miljarder",
    party: "Liberalerna",
    date: "2022-08-15",
    status: "in-progress",
    description: "7 miljarder har allokerats till skolsektorn. Ytterligare resurser planeras i kommande budget.",
  },
  {
    id: 8,
    promise: "Stärka försvarets budget med 2% av BNP",
    party: "Kristdemokraterna",
    date: "2022-09-01",
    status: "kept",
    description: "Försvarsbudgeten har ökat till 2% av BNP enligt NATO:s riktlinjer.",
  },
  {
    id: 9,
    promise: "Halvera bostadsköerna i storstäderna",
    party: "Socialdemokraterna",
    date: "2014-09-10",
    status: "broken",
    description: "Bostadsköerna har inte minskat nämnvärt. I vissa områden har de till och med ökat.",
  },
  {
    id: 10,
    promise: "Avskaffa värnskatten",
    party: "Moderaterna",
    date: "2019-01-15",
    status: "kept",
    description: "Värnskatten avskaffades 2020.",
  },
  {
    id: 11,
    promise: "Införa fri tandvård för alla under 25 år",
    party: "Centerpartiet",
    date: "2022-05-12",
    status: "in-progress",
    description: "Utredning pågår. Pilotprojekt har startat i vissa regioner.",
  },
  {
    id: 12,
    promise: "Bygga ut kollektivtrafiken i landsbygden",
    party: "Vänsterpartiet",
    date: "2018-07-08",
    status: "broken",
    description: "Minimal utbyggnad har skett. Många landsbygdsområden saknar fortfarande adekvat kollektivtrafik.",
  },
];
