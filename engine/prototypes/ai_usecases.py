"""Rehat AI use cases, prototyped on real NEA WBGT readings for 31 Oct 2025 (15 stations, 15-min).

1. Gap-filler: settles 'pending' hours when a station is down, from the other stations.
2. Site-log claim checker: verifies a firm's own site WBGT log (hybrid top-up claim) against the network.
3. Claim explainer: turns the payout calculation into a plain-language receipt.
"""
import numpy as np, pandas as pd
from sklearn.linear_model import Ridge

rng = np.random.default_rng(7)
d = pd.read_csv('data/seed/d1031.csv')
st = [c for c in d.columns if c.startswith('S')]
names = {'S124':'Changi','S125':'Woodlands','S126':'Choa Chu Kang','S127':'Kallang','S128':'Bishan','S129':'Bedok',
         'S130':'Clementi','S132':'Jurong West','S137':'Jurong Island','S139':'Tuas','S140':'CCK Stadium',
         'S141':'Yio Chu Kang','S142':'Sentosa','S143':'Punggol','S187':'Bukit Timah'}
X = d[st].values
train = np.arange(len(d)) < 20          # 08:00-12:45 learn; 13:00-17:30 test (the hot part)
test = ~train

def band(v):  # MOM rest band: 0 none, 1 = 32-32.9, 2 = 33+
    return np.where(v >= 33, 2, np.where(v >= 32, 1, 0))

# ---------- 1. Gap-filler: leave one station out ----------
rows = []
for i, s in enumerate(st):
    others = [j for j in range(len(st)) if j != i]
    y = X[:, i]; Z = X[:, others]
    med = np.median(Z, axis=1)
    off = (y[train] - med[train]).mean()
    p_med = med                                   # naive: network median
    p_off = med + off                             # median + learned station offset
    p_rdg = Ridge(alpha=5.0).fit(Z[train], y[train]).predict(Z)
    for nm, p in [('median', p_med), ('median+offset', p_off), ('ridge', p_rdg)]:
        rows.append((s, nm, np.abs(p[test] - y[test]).mean(), (band(p[test]) == band(y[test])).mean()))
g = pd.DataFrame(rows, columns=['station', 'method', 'mae', 'band_agree'])
summary = g.groupby('method')[['mae', 'band_agree']].mean().round(3)
print('GAP-FILLER, afternoon test, mean over 15 stations')
print(summary.to_string())

# ---------- 2. Site-log claim checker ----------
# A firm on a big site submits the main contractor's hourly WBGT log for its named station area.
# Checks: (a) uplift over the network estimate within plausible range, (b) daily shape follows the
# station, (c) no copy-paste flat values, (d) no clustering just at thresholds.
def check(site, ref):
    up = site - ref
    flags = []
    if np.median(up) > 2.0 or np.median(up) < -1.0: flags.append('uplift outside -1 to +2 C')
    if np.corrcoef(site, ref)[0, 1] < 0.7: flags.append('daily shape does not follow station')
    if np.std(np.diff(site)) < 0.05: flags.append('readings flat or copied')
    near = np.mean((site >= 33.0) & (site < 33.15)) + np.mean((site >= 32.0) & (site < 32.15))
    if near > 0.35: flags.append('readings bunched at payout thresholds')
    return flags

hourly = d.assign(h=d.time.str[:2].astype(int)).groupby('h')[st].mean()
hourly = hourly.loc[8:17]
res = []
for k in range(400):
    s = rng.choice(st); ref = hourly[s].values
    kind = ['honest'] * 3 + ['inflated', 'flat', 'threshold', 'other_day']
    kind = kind[k % len(kind)]
    if kind == 'honest':
        site = ref + rng.normal(0.8, 0.5) + rng.normal(0, 0.3, len(ref))
    elif kind == 'inflated':
        site = ref + rng.uniform(2.5, 4.0) + rng.normal(0, 0.3, len(ref))
    elif kind == 'flat':
        site = np.full(len(ref), 33.0 + rng.uniform(0, 0.4))
    elif kind == 'threshold':
        site = np.where(ref > 30.5, 33.0 + rng.uniform(0, 0.1, len(ref)), ref + 0.5)
    else:  # a log from a different, cooler-shaped day pasted in: reversed shape
        site = ref[::-1] + 1.0 + rng.normal(0, 0.3, len(ref))
    f = check(site, ref)
    res.append((kind, len(f) > 0))
r = pd.DataFrame(res, columns=['kind', 'flagged'])
print('\nSITE-LOG CHECKER, 400 simulated logs on real station curves')
print(r.groupby('kind').flagged.mean().round(3).to_string())

# top-up value for an honest site: hours where station said near-miss/none but site log says 32+ or 33+
s = 'S132'; ref = hourly[s].values
site = ref + 0.8
def rest_min(v): return np.where(v >= 33, 15, np.where(v >= 32, 10, np.where(v >= 31.5, 5, 0)))
base = rest_min(ref).sum(); full = rest_min(site).sum()
print(f'\nTOP-UP EXAMPLE {names[s]}: station rest {base} min, site log rest {full} min, top-up {full-base} min per worker')

# ---------- 3. Claim explainer ----------
def explain(firm, station, month, heat_h, rain_h, heat_allow, rain_allow, workers, rate=8):
    ih = max(0, heat_h - heat_allow); ir = max(0, rain_h - rain_allow)
    pay = round((ih + ir) * rate * workers)
    lines = [f'{firm}, {month}: station {station}.',
             f'Heat rest owed: {heat_h:.2f} h a worker. Normal plus 25%: {heat_allow:.2f} h. Paid: {ih:.2f} h.',
             f'Heavy rain: {rain_h:.2f} h. Normal plus 25%: {rain_allow:.2f} h. Paid: {ir:.2f} h.',
             f'{ih+ir:.2f} h x S${rate} x {workers} workers = S${pay}, by PayNow on the 5th working day.']
    if pay == 0:
        lines.append('Nothing paid: this month stayed within the normal range at your station.')
    return '\n'.join(lines)
print('\nCLAIM EXPLAINER')
print(explain('Lim Landscaping Pte Ltd', 'Bishan', 'May 2026', 1.69, 9.0, 1.25, 6.25, 20))
