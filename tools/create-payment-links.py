#!/usr/bin/env python3
"""Create the three Founding Membership payment links in Stripe.

Reads the key from ~/.config/smc-stripe/padel.env so it never travels through
a chat or a commit. A restricted key with write access to Products, Prices and
Payment Links is enough -- it does not need, and should not have, anything else.

Safe to re-run: it looks for an existing product of the same name before
creating one, so a second run does not leave duplicate tiers behind.

    python3 tools/create-payment-links.py            # dry run, shows the plan
    python3 tools/create-payment-links.py --apply    # actually creates them
"""
import json, os, pathlib, sys, urllib.parse, urllib.request

ENV = pathlib.Path.home() / '.config/smc-stripe/padel.env'

# Test links point at the preview, because /welcome is not on the live domain
# yet -- a test payment would otherwise finish on a 404 and prove nothing.
REDIRECT = {
    'TEST': 'https://padel-logan-memberships-preview.vercel.app/welcome',
    'LIVE': 'https://padellogan.com.au/welcome',
}

# name, amount in cents, and how many of that tier exist (None = uncapped)
TIERS = [
    ('Founding Platinum Membership', 275000, None),
    ('Founding Gold Membership',     215000, None),
    ('Founding Silver Membership',   150000, None),
]


def key():
    if not ENV.exists():
        sys.exit(f'No key file at {ENV}\n'
                 "Create a restricted key (Products, Prices, Payment Links -- write)\n"
                 f"then: echo 'STRIPE_SECRET_KEY=rk_test_...' > {ENV}")
    for line in ENV.read_text().splitlines():
        if line.startswith('STRIPE_SECRET_KEY='):
            k = line.split('=', 1)[1].strip().strip('"\'')
            if k.startswith('sk_'):
                sys.exit('That is an unrestricted secret key. Use a restricted key (rk_) --\n'
                         'this script only needs Products, Prices and Payment Links.')
            return k
    sys.exit(f'STRIPE_SECRET_KEY not found in {ENV}')


def call(k, method, path, params=None):
    url = 'https://api.stripe.com/v1/' + path
    data = None
    if params:
        flat = urllib.parse.urlencode(params, doseq=True).encode()
        if method == 'GET':
            url += '?' + flat.decode()
        else:
            data = flat
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={'Authorization': 'Bearer ' + k})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            msg = json.loads(body)['error']['message']
        except Exception:
            msg = body
        sys.exit(f'Stripe {e.code} on {method} {path}\n  {msg}')


def main():
    apply = '--apply' in sys.argv
    k = key()
    mode = 'TEST' if '_test_' in k else 'LIVE'
    redirect = REDIRECT[mode]
    print(f'Stripe {mode} mode' + ('' if apply else '  (dry run -- pass --apply to create)'))
    print('after payment ->', redirect)
    if mode == 'LIVE' and apply:
        if input('This creates LIVE payment links that take real money. Type LIVE to continue: ') != 'LIVE':
            sys.exit('stopped')

    out = {}
    for name, amount, cap in TIERS:
        print(f'\n{name}  ${amount/100:,.2f} AUD  (GST inclusive)')
        if not apply:
            print('   would create: product, price, payment link')
            continue

        existing = call(k, 'GET', 'products/search',
                        {'query': f"name:'{name}'", 'limit': 1}).get('data')
        if existing:
            product = existing[0]
            print('   product exists:', product['id'])
        else:
            product = call(k, 'POST', 'products', {'name': name})
            print('   product:', product['id'])

        price = call(k, 'POST', 'prices', {
            'product': product['id'],
            'unit_amount': amount,
            'currency': 'aud',
            'tax_behavior': 'inclusive',       # every price on the site says it includes GST
        })
        print('   price:', price['id'])

        params = {
            'line_items[0][price]': price['id'],
            'line_items[0][quantity]': 1,
            'after_completion[type]': 'redirect',
            'after_completion[redirect][url]': redirect,
            'allow_promotion_codes': 'false',
        }
        if cap:
            params['restrictions[completed_sessions][limit]'] = cap
        link = call(k, 'POST', 'payment_links', params)
        print('   link:', link['url'])
        out[name.split()[1]] = link['url']

    if apply and out:
        print('\nPaste into STRIPE_LINKS in assets/js/join.js:\n')
        for tier, url in out.items():
            print(f"        '{tier}': '{url}',")


if __name__ == '__main__':
    main()
