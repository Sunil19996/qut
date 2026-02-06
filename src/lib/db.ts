import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
const TRADES_FILE = path.join(DATA_DIR, 'trades.json');

function readJson(file: string) {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf-8');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('readJson failed', file, e);
    return null;
  }
}

function writeJson(file: string, data: any) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), { encoding: 'utf-8' });
  } catch (e) {
    console.error('writeJson failed', file, e);
  }
}

export function dbSaveToken(accountId: string, token: string, refreshToken?: string, expiresAt?: number) {
  if (!accountId) return;
  const current = readJson(TOKENS_FILE) || {};
  current[accountId] = { token, refreshToken: refreshToken ?? null, expiresAt: expiresAt ?? null, updatedAt: Date.now() };
  writeJson(TOKENS_FILE, current);
}

export function dbGetToken(accountId: string): string | undefined {
  if (!accountId) return undefined;
  const current = readJson(TOKENS_FILE) || {};
  return current[accountId]?.token;
}

export function dbSaveTrades(trades: Array<any>) {
  if (!Array.isArray(trades) || trades.length === 0) return;
  const current = readJson(TRADES_FILE) || {};
  // store as map by id for dedupe
  for (const t of trades) {
    const id = t.id || t.providerId || `${t.account}-${t.timestamp}-${Math.random()}`;
    if (!current[id]) {
      current[id] = {
        id,
        providerId: t.providerId ?? null,
        account_id: t.account ?? null,
        timestamp: t.timestamp ?? new Date().toISOString(),
        symbol: t.symbol ?? null,
        side: t.side ?? null,
        quantity: Math.floor(t.quantity ?? 0),
        traded_qty: Math.floor(t.tradedQty ?? 0),
        price: Number(t.price ?? 0),
        status: t.status ?? null,
        raw: t,
        created_at: Date.now(),
      };
    }
  }
  writeJson(TRADES_FILE, current);
}

export function dbGetTrades(accountId?: string, limit = 200) {
  const current = readJson(TRADES_FILE) || {};
  const arr = Object.values(current) as any[];
  const filtered = accountId ? arr.filter(r => String(r.account_id) === String(accountId)) : arr;
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return filtered.slice(0, limit);
}

export default {
  dbSaveToken,
  dbGetToken,
  dbSaveTrades,
  dbGetTrades,
};
