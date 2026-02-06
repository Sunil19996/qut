#!/usr/bin/env python3
"""
Fetch Alice Blue trade book for debugging.

Usage examples:
  # using alice_blue library (recommended if installed)
  python3 scripts/fetch_alice_trades.py --username YOUR_USER --session YOUR_SESSION_TOKEN

  # using a saved token from the project data store (.data/tokens.json)
  python3 scripts/fetch_alice_trades.py --account 2548613

  # direct token
  python3 scripts/fetch_alice_trades.py --token eyJ...yourtoken

Requires: pip install alice_blue requests
"""
import argparse
import json
import os
import sys

try:
    from alice_blue import AliceBlue  # type: ignore
    HAVE_ALICE_LIB = True
except Exception:
    HAVE_ALICE_LIB = False

import requests

DATA_DIR = os.environ.get('DATA_DIR', os.path.join(os.getcwd(), '.data'))
TOKENS_FILE = os.path.join(DATA_DIR, 'tokens.json')


def load_token_from_store(account_id: str):
    try:
        with open(TOKENS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        entry = data.get(str(account_id))
        if not entry:
            print(f'No token entry for account {account_id} in {TOKENS_FILE}', file=sys.stderr)
            return None
        return entry.get('token')
    except FileNotFoundError:
        print(f'{TOKENS_FILE} not found', file=sys.stderr)
        return None
    except Exception as e:
        print('Failed reading tokens file:', e, file=sys.stderr)
        return None


def call_api_with_token(endpoint: str, token: str):
    headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
    r = requests.get(endpoint, headers=headers, timeout=15)
    print('HTTP', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text[:2000])


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--username', help='Alice Blue username (for alice_blue lib)')
    p.add_argument('--session', help='Session token / session_id for alice_blue lib')
    p.add_argument('--token', help='Direct bearer token')
    p.add_argument('--account', help='Account ID to lookup in .data/tokens.json')
    p.add_argument('--endpoint', help='Override trades endpoint', default='https://ant.aliceblueonline.com/open-api/od/v1/trades')
    args = p.parse_args()

    # Prefer alice_blue library if available and both username+session provided
    if HAVE_ALICE_LIB and args.username and args.session:
        print('Using alice_blue library')
        alice = AliceBlue(username=args.username, session_id=args.session)
        trades = alice.get_trade_book()
        print(json.dumps(trades, indent=2))
        return

    token = args.token
    if not token and args.account:
        token = load_token_from_store(args.account)

    if not token:
        print('No token provided or found. Provide --token or --account', file=sys.stderr)
        sys.exit(2)

    call_api_with_token(args.endpoint, token)


if __name__ == '__main__':
    main()
