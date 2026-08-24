import fs from 'fs';
import path from 'path';

// Use /app/data if it exists (Railway Volume), otherwise use current directory
const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : process.cwd();
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
