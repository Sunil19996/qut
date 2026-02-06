import { NextResponse, NextRequest } from 'next/server';
import { getAccountToken } from '@/lib/alice';
import { cookies } from 'next/headers';

/**
 * Fetch real-time Trade Book data from Alice Blue API
 * GET /api/alice/trade-book?accountId=<id>
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const accountId = url.searchParams.get('accountId');

  try {
    // Get the saved OAuth token for this account
    const token = getAccountToken(accountId || 'Master');
    // Debug: log token presence (masked) and endpoint selection
    try {
      const masked = token ? `${token.slice(0,8)}...${token.slice(-8)}` : '<no-token>';
      console.log('[alice/trade-book] accountId=', accountId, 'token=', masked);
    } catch (e) {}
    if (!token) {
      return NextResponse.json(
        { ok: false, message: 'No OAuth token found for this account' },
        { status: 401 }
      );
    }

    // Fetch Trade Book from Alice Blue API
    // Alice Blue Trade Book endpoint (adjust based on their actual API docs)
    const tradeBookEndpoint = process.env.ALICE_TRADES_ENDPOINT || 'https://ant.aliceblueonline.com/open-api/od/v1/trades';
    console.log('[alice/trade-book] fetching endpoint=', tradeBookEndpoint);

    const fetchRes = await fetch(tradeBookEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!fetchRes.ok) {
      const errorBody = await fetchRes.text().catch(() => '');
      const snippet = (errorBody || '').toString().slice(0, 1000);
      console.error('[alice/trade-book] Alice Blue Trade Book API error:', fetchRes.status, snippet);
      return NextResponse.json(
        { ok: false, message: `Trade Book API returned ${fetchRes.status}`, details: errorBody },
        { status: fetchRes.status }
      );
    }

    const payload = await fetchRes.json();

    // Normalize the response to match our TradesTable format
    const trades = (Array.isArray(payload?.trades) ? payload.trades : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [])
      .map((trade: any, idx: number) => ({
        id: trade.id || trade.tradeId || `${accountId}-${Date.now()}-${idx}`,
        timestamp: trade.timestamp || trade.time || trade.createdAt || new Date().toISOString(),
        account: accountId || 'Master',
        symbol: trade.symbol || trade.instrument || trade.scrip || trade.scriptName || '',
        type: trade.type || trade.product || 'Market',
        side: trade.side || trade.buySell || trade.transactionType || 'Buy',
        quantity: Number(trade.quantity || trade.qty || 0),
        tradedQty: Number(trade.tradedQty || trade.filledQty || trade.quantity || trade.qty || 0),
        price: Number(trade.price || trade.rate || trade.fillPrice || 0),
        status: trade.status || 'Filled',
      }));

    return NextResponse.json({
      ok: true,
      trades,
      count: trades.length,
      source: 'alice-blue-api',
      accountId,
    });
  } catch (err: any) {
    console.error('Failed to fetch trade book:', err);
    return NextResponse.json(
      { ok: false, message: err?.message || 'Failed to fetch trade book' },
      { status: 500 }
    );
  }
}
