"""Prototype: ukulele chord shape finder (mirrors the JS logic)"""

TUNING = [67, 60, 64, 69]  # G4 C4 E4 A4
MAX_FRET = 12

CHORDS = {
    'maj':    ('', [[0,0,0],[4,2,0],[7,4,0]]),
    'm':      ('m', [[0,0,0],[3,2,-1],[7,4,0]]),
    '7':      ('7', [[0,0,0],[4,2,0],[7,4,0],[10,6,-1]]),
    'maj7':   ('maj7', [[0,0,0],[4,2,0],[7,4,0],[11,6,0]]),
    'm7':     ('m7', [[0,0,0],[3,2,-1],[7,4,0],[10,6,-1]]),
    'sus4':   ('sus4', [[0,0,0],[5,3,0],[7,4,0]]),
    'sus2':   ('sus2', [[0,0,0],[2,1,0],[7,4,0]]),
    '7sus4':  ('7sus4', [[0,0,0],[5,3,0],[7,4,0],[10,6,-1]]),
    '6':      ('6', [[0,0,0],[4,2,0],[7,4,0],[9,5,0]]),
    'm6':     ('m6', [[0,0,0],[3,2,-1],[7,4,0],[9,5,0]]),
    'dim':    ('dim', [[0,0,0],[3,2,-1],[6,4,-1]]),
    'dim7':   ('dim7', [[0,0,0],[3,2,-1],[6,4,-1],[9,6,-2]]),
    'aug':    ('aug', [[0,0,0],[4,2,0],[8,4,1]]),
    'add9':   ('add9', [[0,0,0],[4,2,0],[7,4,0],[14,8,0]]),
    'm7b5':   ('m7\u266d5', [[0,0,0],[3,2,-1],[6,4,-1],[10,6,-1]]),
    '9':      ('9', [[0,0,0],[4,2,0],[7,4,0],[10,6,-1],[14,8,0]]),
    'm9':     ('m9', [[0,0,0],[3,2,-1],[7,4,0],[10,6,-1],[14,8,0]]),
    'maj9':   ('maj9', [[0,0,0],[4,2,0],[7,4,0],[11,6,0],[14,8,0]]),
}


def essential_set(tones):
    if len(tones) > 4:
        rest = [t for i, t in enumerate(tones) if i != 2]
        return {t[0] % 12 for t in rest}
    return {t[0] % 12 for t in tones}


def playable(frets):
    non_zero = [f for f in frets if f > 0]
    if not non_zero:
        return True
    uniq = sorted(set(non_zero))
    span = uniq[-1] - uniq[0]
    has_open = any(f == 0 for f in frets)
    min_count = non_zero.count(uniq[0])
    if has_open:
        return span <= 3
    if span <= 3:
        return True
    return min_count >= 2 and len(uniq) <= 4 and span <= 5


def find_shapes(root_pc, chord_id):
    suffix, tones = CHORDS[chord_id]
    allowed = {(root_pc + t[0]) % 12 for t in tones}
    essential = {(root_pc + e) % 12 for e in essential_set(tones)}
    shapes = []
    for a in range(MAX_FRET + 1):
        for b in range(MAX_FRET + 1):
            for c in range(MAX_FRET + 1):
                for d in range(MAX_FRET + 1):
                    frets = [a, b, c, d]
                    pcs = [(TUNING[i] + frets[i]) % 12 for i in range(4)]
                    if not all(p in allowed for p in pcs):
                        continue
                    if not all(p in pcs for p in essential):
                        continue
                    if not playable(frets):
                        continue
                    shapes.append(tuple(frets))
    shapes.sort(key=lambda s: (max(s), sum(1 for f in s if f > 0), max(s)-min([f for f in s if f>0] or [0]), s))
    return shapes


PCS = {'C':0,'Db':1,'D':2,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}

tests = [
    ('C','maj'), ('F','maj'), ('G','maj'), ('A','maj'), ('A','m'), ('C','maj7'),
    ('G','7'), ('D','m7'), ('A','sus4'), ('E','7'), ('C','dim7'), ('C','aug'),
    ('Bb','maj'), ('F#','m'), ('B','m'), ('Eb','m'), ('C','9'), ('D','m9'),
    ('Ab','maj7'), ('E','m7b5'), ('Bb','add9'), ('G','6'), ('D','7sus4'),
    ('A','dim'), ('Db','m'), ('G','maj9'), ('C','sus2'), ('F','m6'),
    ('Gb','maj'), ('Db','7'), ('Eb','maj7'),
    ('E','m'), ('D','m'), ('C','7'), ('A','7'), ('F','maj7'), ('D','m7'),
    ('G','m7'), ('E','maj7'), ('C','6'), ('A','7sus4'), ('C','sus4'),
]
for root, cid in tests:
    shapes = find_shapes(PCS[root], cid)
    print(f"{root}{CHORDS[cid][0]}: {len(shapes)} {shapes[:10]}")
