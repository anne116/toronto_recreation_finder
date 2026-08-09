export interface FreeCentre {
  name: string;
  address: string;
  district: string;
  locationId: number | null;
}

// Source: https://www.toronto.ca/explore-enjoy/parks-recreation/how-to-use-our-services/how-to-register-for-recreation-programs/free-lower-cost-recreation-options/

export const FREE_CENTRES: FreeCentre[] = [
  { name: "Chalkfarm Community Recreation Centre", address: "180 Chalkfarm Dr.", district: "Etobicoke York", locationId: 486 },
  { name: "Driftwood Community Recreation Centre", address: "4401 Jane St.", district: "Etobicoke York", locationId: 575 },
  { name: "Elmbank Community Centre", address: "10 Rampart Rd.", district: "Etobicoke York", locationId: 750 },
  { name: "Falstaff Community Recreation Centre", address: "50 Falstaff Ave.", district: "Etobicoke York", locationId: 1063 },
  { name: "John English Community School", address: "95 Mimico Ave., room 100B", district: "Etobicoke York", locationId: 1236 },
  { name: "Islington Community School", address: "44 Cordova Ave.", district: "Etobicoke York", locationId: 1232 },
  { name: "Kingsview Village Community School", address: "1 York Rd.", district: "Etobicoke York", locationId: 1244 },
  { name: "North Kipling Community Centre", address: "2 Rowntree Rd.", district: "Etobicoke York", locationId: 749 },
  { name: "Oakdale Community Centre", address: "350 Grandravine Dr.", district: "Etobicoke York", locationId: 780 },
  { name: "The Elms Community School and Pool", address: "45 Golfdown Dr.", district: "Etobicoke York", locationId: 795 },
  { name: "York Recreation Centre", address: "115 Black Creek Dr.", district: "Etobicoke York", locationId: 3501 },
  { name: "Antibes Community Centre", address: "140 Antibes Dr.", district: "North York", locationId: 42 },
  { name: "Dennis R. Timbrell Resource Centre", address: "29 St. Dennis Dr.", district: "North York", locationId: 1056 },
  { name: "Grandravine Community Recreation Centre", address: "23 Grandravine Dr.", district: "North York", locationId: 647 },
  { name: "Jenner Jean-Marie Community Recreation Centre", address: "48 Thorncliffe Park Dr.", district: "North York", locationId: 1076 },
  { name: "Lawrence Heights Community Centre", address: "5 Replin Rd.", district: "North York", locationId: 675 },
  { name: "Oriole Community Recreation Centre", address: "2975 Don Mills Rd.", district: "North York", locationId: 714 },
  { name: "Cedarbrook Community Centre", address: "91 Eastpark Blvd.", district: "Scarborough", locationId: 600 },
  { name: "Centennial Recreation Centre - Scarborough", address: "1967 Ellesmere Rd.", district: "Scarborough", locationId: 537 },
  { name: "Don Montgomery Community Recreation Centre", address: "2467 Eglinton Ave. E.", district: "Scarborough", locationId: 712 },
  { name: "Heron Park Community Recreation Centre", address: "292 Manse Rd.", district: "Scarborough", locationId: 633 },
  { name: "L'Amoreaux Community Recreation Centre", address: "2000 McNicholl Ave.", district: "Scarborough", locationId: 788 },
  { name: "Malvern Recreation Centre", address: "30 Sewells Rd.", district: "Scarborough", locationId: 702 },
  { name: "Oakridge Community Recreation Centre", address: "63 Pharmacy Ave.", district: "Scarborough", locationId: 731 },
  { name: "Scarborough Village Recreation Centre", address: "3600 Kingston Rd.", district: "Scarborough", locationId: 743 },
  { name: "Stephen Leacock Community Recreation Centre", address: "2500 Birchmount Rd.", district: "Scarborough", locationId: 1105 },
  { name: "Stephen Leacock Seniors Community Centre", address: "2520 Birchmount Rd.", district: "Scarborough", locationId: 1873 },
  { name: "Harrison Pool", address: "15 Stephanie St.", district: "Toronto and East York", locationId: 45 },
  { name: "Jimmie Simpson Recreation Centre", address: "870 Queen St. E.", district: "Toronto and East York", locationId: 58 },
  { name: "John Innes Community Recreation Centre", address: "150 Sherbourne St.", district: "Toronto and East York", locationId: 63 },
  { name: "Masaryk-Cowan Community Recreation Centre", address: "220 Cowan Ave.", district: "Toronto and East York", locationId: 89 },
  { name: "O'Connor Community Centre", address: "1386 Victoria Park Ave.", district: "Toronto and East York", locationId: 1093 },
  { name: "Pam McConnell Aquatic Centre", address: "640 Dundas St.", district: "Toronto and East York", locationId: 2012 },
  { name: "Regent Park Community Centre", address: "402 Shuter St.", district: "Toronto and East York", locationId: 3502 },
  { name: "Scadding Court Community Centre", address: "707 Dundas St. W.", district: "Toronto and East York", locationId: 1098 },
  { name: "Secord Community Centre", address: "91 Barrington Ave.", district: "Toronto and East York", locationId: 325 },
  { name: "Wellesley Community Centre", address: "495 Sherbourne St.", district: "Toronto and East York", locationId: 451 },
];

export const FREE_CENTRE_LOCATION_IDS: ReadonlySet<number> = new Set(
  FREE_CENTRES.map((c) => c.locationId).filter((id): id is number => id !== null)
);

const FREE_CENTRE_LOCATION_ID_STRINGS: ReadonlySet<string> = new Set(
  Array.from(FREE_CENTRE_LOCATION_IDS, String)
);

export function isFreeCentreLocation(locationId: string | number | null | undefined): boolean {
  if (locationId == null) return false;
  return FREE_CENTRE_LOCATION_ID_STRINGS.has(String(locationId));
}
