import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

export interface PersistedData {
  products: any[];
  orders: any[];
  customOrders: any[];
  discounts: any[];
  supportTickets: any[];
  customers: any[];
  walletTransactions: any[];
  backupSnapshots: any[];
  backupSchedule: any;
}

export function loadData(): PersistedData | null {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return null;
}

export function saveData(data: PersistedData): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}
