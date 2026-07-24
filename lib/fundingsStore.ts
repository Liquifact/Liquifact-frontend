export interface FundingRecord {
  id: string;
  invoiceId: string;
  amount: number;
  date: string; // ISO string
  issuer?: string;
  yield?: string;
  status?: string;
}

const STORE_KEY = 'liquifact_fundings';

export function listFundings(): FundingRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const data = window.localStorage.getItem(STORE_KEY);
    if (!data) return [];
    return JSON.parse(data) as FundingRecord[];
  } catch (err) {
    console.error('Failed to read fundings from localStorage:', err);
    return [];
  }
}

export function recordFunding(funding: Omit<FundingRecord, 'id' | 'date'>): FundingRecord {
  const newRecord: FundingRecord = {
    ...funding,
    id: `funding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString(),
  };
  
  if (typeof window === 'undefined') {
    return newRecord;
  }
  
  try {
    const existing = listFundings();
    existing.push(newRecord);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to write funding to localStorage:', err);
  }
  
  return newRecord;
}
