/** Offline VIN validation & partial decoding (ISO 3779 / NHTSA check digit). */

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY';

const WMI: Record<string, string> = {
  '1HG': 'Honda', '2HG': 'Honda', JHM: 'Honda', '5FN': 'Honda', '5J6': 'Honda', '19X': 'Honda', '19U': 'Acura', JH4: 'Acura',
  '1FA': 'Ford', '1FT': 'Ford', '1FM': 'Ford', '1FD': 'Ford', '3FA': 'Ford', '3FT': 'Ford', '1LN': 'Lincoln', '5LM': 'Lincoln',
  '1G1': 'Chevrolet', '1GC': 'Chevrolet', '1GN': 'Chevrolet', '2G1': 'Chevrolet', '3GN': 'Chevrolet', '3GC': 'Chevrolet', KL7: 'Chevrolet',
  '1GT': 'GMC', '1GK': 'GMC', '3GT': 'GMC', '1G6': 'Cadillac', '1GY': 'Cadillac',
  '1C3': 'Chrysler', '2C3': 'Chrysler', '1C4': 'Jeep', '1J4': 'Jeep', '1J8': 'Jeep', '1C6': 'Ram', '3C6': 'Ram', '3C7': 'Ram', '2C4': 'Dodge', '2B3': 'Dodge',
  JTD: 'Toyota', JT2: 'Toyota', JTE: 'Toyota', JTM: 'Toyota', JTN: 'Toyota', '4T1': 'Toyota', '4T3': 'Toyota', '5TD': 'Toyota', '5TF': 'Toyota', '2T1': 'Toyota', '2T3': 'Toyota',
  JTH: 'Lexus', JTJ: 'Lexus', '2T2': 'Lexus', '58A': 'Lexus',
  JN1: 'Nissan', JN8: 'Nissan', '1N4': 'Nissan', '1N6': 'Nissan', '5N1': 'Nissan', '3N1': 'Nissan', JNK: 'Infiniti',
  KMH: 'Hyundai', '5NP': 'Hyundai', '5NM': 'Hyundai', KMU: 'Genesis', KNA: 'Kia', KND: 'Kia', '5XY': 'Kia', '5XX': 'Kia',
  WBA: 'BMW', WBS: 'BMW M', WBY: 'BMW', '5UX': 'BMW', '5YM': 'BMW M', WMW: 'MINI',
  WDD: 'Mercedes-Benz', WDC: 'Mercedes-Benz', WDB: 'Mercedes-Benz', W1K: 'Mercedes-Benz', W1N: 'Mercedes-Benz', '4JG': 'Mercedes-Benz', W1X: 'Mercedes-Benz',
  WAU: 'Audi', WA1: 'Audi', WUA: 'Audi Sport', WP0: 'Porsche', WP1: 'Porsche',
  WVW: 'Volkswagen', WVG: 'Volkswagen', '3VW': 'Volkswagen', '1VW': 'Volkswagen',
  '5YJ': 'Tesla', '7SA': 'Tesla', '7G2': 'Tesla', LRW: 'Tesla', XP7: 'Tesla', '3TM': 'Toyota', SHH: 'Honda', ZPB: 'Lamborghini', KM8: 'Hyundai', '7FC': 'Rivian', '7PD': 'Rivian', '50E': 'Lucid',
  SAL: 'Land Rover', SAJ: 'Jaguar', SCF: 'Aston Martin', SBM: 'McLaren', SCA: 'Rolls-Royce', SCB: 'Bentley',
  ZFF: 'Ferrari', ZHW: 'Lamborghini', ZAM: 'Maserati', ZAR: 'Alfa Romeo', ZFA: 'Fiat',
  YV1: 'Volvo', YV4: 'Volvo', LYV: 'Volvo', JF1: 'Subaru', JF2: 'Subaru', '4S3': 'Subaru', '4S4': 'Subaru',
  JM1: 'Mazda', JM3: 'Mazda', JA4: 'Mitsubishi', JA3: 'Mitsubishi', '7JR': 'Volvo', '1YV': 'Mazda',
};

const COUNTRY: Record<string, string> = {
  '1': 'United States', '4': 'United States', '5': 'United States', '2': 'Canada', '3': 'Mexico', '7': 'United States',
  J: 'Japan', K: 'South Korea', L: 'China', S: 'United Kingdom', W: 'Germany', Y: 'Sweden', Z: 'Italy', V: 'France/Spain', X: 'Netherlands',
};

export interface VinDecode {
  vin: string;
  valid: boolean;
  checkDigitValid: boolean;
  year?: number;
  make?: string;
  country?: string;
  wmi?: string;
}

export function checkDigit(vin: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i];
    const value = /\d/.test(ch) ? Number(ch) : TRANSLIT[ch] ?? 0;
    sum += value * WEIGHTS[i];
  }
  const rem = sum % 11;
  return rem === 10 ? 'X' : String(rem);
}

/** Model year from position 10; the 30-year cycle is resolved to the latest year not beyond next year. */
export function decodeYear(code: string, now = new Date()): number | undefined {
  const maxYear = now.getFullYear() + 1;
  let candidates: number[] = [];
  const letterIndex = YEAR_CODES.indexOf(code);
  if (letterIndex >= 0) candidates = [1980 + letterIndex, 2010 + letterIndex, 2040 + letterIndex];
  else if (/[1-9]/.test(code)) candidates = [2000 + Number(code), 2030 + Number(code)];
  const valid = candidates.filter((y) => y <= maxYear);
  return valid.length ? Math.max(...valid) : undefined;
}

export function decodeVin(raw: string): VinDecode {
  const vin = raw.trim().toUpperCase();
  const formatOk = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
  if (!formatOk) return { vin, valid: false, checkDigitValid: false };
  const checkDigitValid = checkDigit(vin) === vin[8];
  const wmi = vin.slice(0, 3);
  return {
    vin,
    // North American VINs must pass the check digit; other regions don't always use it.
    valid: checkDigitValid || !'12345'.includes(vin[0]),
    checkDigitValid,
    wmi,
    make: WMI[wmi],
    year: decodeYear(vin[9]),
    country: COUNTRY[vin[0]],
  };
}
