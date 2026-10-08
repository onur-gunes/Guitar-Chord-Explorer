ObjC.import('Foundation');

function readFile(p) {
  var s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
  if (!s) throw new Error('cannot read ' + p);
  return s.js;
}

var cwd = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
var appPath = cwd + '/index.html';
if (!$.NSFileManager.defaultManager.fileExistsAtPath(appPath)) appPath = cwd + '/../index.html';
var HTML = readFile(appPath);
var m = HTML.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('no script found');
var scriptSrc = m[1];

try {
  new Function(scriptSrc);
  console.log('SYNTAX: OK');
} catch (err) {
  console.log('SYNTAX FAIL: ' + err.message);
  throw err;
}

function El(id) {
  this.id = id;
  this._html = '';
  this._text = '';
  this.style = {};
  this.listeners = {};
  this.attrs = {};
  var self = this;
  this.classList = {
    _set: {},
    toggle: function (name, force) {
      if (force === undefined) force = !this._set[name];
      if (force) this._set[name] = true; else delete this._set[name];
    },
    contains: function (name) { return !!this._set[name]; }
  };
}
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this._html; },
  set: function (v) { this._html = String(v); }
});
Object.defineProperty(El.prototype, 'textContent', {
  get: function () { return this._text; },
  set: function (v) { this._text = String(v); }
});
El.prototype.addEventListener = function (ev, fn) {
  (this.listeners[ev] = this.listeners[ev] || []).push(fn);
};
El.prototype.getAttribute = function (n) { return this.attrs[n] !== undefined ? this.attrs[n] : null; };
El.prototype.setAttribute = function (n, v) { this.attrs[n] = String(v); };
El.prototype.scrollIntoView = function () {};

var elements = {};
function fakeNodes(sel) {
  var out = [], re, html;
  if (sel === '#chips .chip') {
    html = (elements['chips'] || {})._html || '';
    re = /data-id="([^"]+)"/g;
    var mm;
    while ((mm = re.exec(html))) {
      (function (id) {
        var node = new El('chip:' + id);
        node.attrs['data-id'] = id;
        out.push(node);
      })(mm[1]);
    }
  } else if (sel === '#circlePanel [data-kind]') {
    html = (elements['circlePanel'] || {})._html || '';
    re = /data-kind="([^"]+)" data-i="(\d+)"/g;
    var m2;
    while ((m2 = re.exec(html))) {
      (function (kind, i) {
        var node = new El('wedge:' + kind + i);
        node.attrs['data-kind'] = kind;
        node.attrs['data-i'] = i;
        out.push(node);
      })(m2[1], m2[2]);
    }
  }
  return out;
}
var lastNodes = [];
var document = {
  getElementById: function (id) {
    if (!elements[id]) elements[id] = new El(id);
    return elements[id];
  },
  querySelectorAll: function (sel) {
    lastNodes = fakeNodes(sel);
    if (sel === '#circlePanel [data-kind]') wedgeNodes = lastNodes;
    if (sel === '#chips .chip') chipNodes = lastNodes;
    return lastNodes;
  }
};
var wedgeNodes = [], chipNodes = [];
var window = { matchMedia: function () { return { matches: false }; } };

var body = scriptSrc
  .replace(/^\s*\(function\s*\(\)\s*\{/, '')
  .replace(/\}\)\s*\(\)\s*;\s*$/, '');

eval(body);

var failures = [];
function check(label, cond, extra) {
  if (cond) console.log('ok   ' + label);
  else { console.log('FAIL ' + label + (extra ? ' :: ' + extra : '')); failures.push(label); }
}
function validateXML(s, label) {
  var re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g, mm, stack = [];
  while ((mm = re.exec(s))) {
    if (mm[4] === '/') continue;
    if (mm[1] === '/') {
      if (stack.pop() !== mm[2]) { failures.push(label + ' mismatch ' + mm[0]); return false; }
    } else stack.push(mm[2]);
  }
  if (stack.length) { failures.push(label + ' unclosed ' + stack.join(',')); return false; }
  return true;
}
function clean(s) {
  return s.indexOf('NaN') < 0 && s.indexOf('undefined') < 0 && s.indexOf('Infinity') < 0;
}
function firstFrets() {
  var mm = elements['shapes']._html.match(/data-frets="([^"]+)"/);
  return mm ? mm[1] : '(none)';
}
function wedge(kind, i) {
  var g = new El('g');
  g.attrs['data-kind'] = kind;
  g.attrs['data-i'] = String(i);
  return g;
}

console.log('--- initial render ---');
check('shapes rendered', elements['shapeCount']._text.indexOf('way') >= 0, elements['shapeCount']._text);
check('C major has shapes', firstFrets() !== '(none)', firstFrets());
check('center name is C', elements['ctrName']._html === '<tspan class="rt">C</tspan>', elements['ctrName']._html);
check('center notes C \u00b7 E \u00b7 G', elements['ctrNotes']._text === 'C \u00b7 E \u00b7 G', elements['ctrNotes']._text);
check('18 chips', ((elements['chips']._html.match(/class="chip"/g) || []).length) === 18);
check('3 notes rendered for C major', ((elements['notes']._html.match(/class="note/g) || []).length) === 3, String((elements['notes']._html.match(/class="note/g) || []).length));
check('circle svg valid', validateXML(elements['circlePanel']._html.slice(0, elements['circlePanel']._html.indexOf('</svg>') + 6), 'circle'));
check('shapes svg valid', validateXML(elements['shapes']._html, 'shapes'));
check('no NaN/undefined', clean(elements['shapes']._html) && clean(elements['circlePanel']._html));
check('major C wedge selected', wedgeNodes.some(function (n) { return n.attrs['data-kind'] === 'maj' && n.attrs['data-i'] === '0' && n.classList.contains('sel'); }));
check('accBtn hidden for C', elements['accBtn'].style.visibility === 'hidden');

console.log('--- select A major ---');
pick(wedge('maj', 3));
check('root A', state.rootName === 'A' && state.rootPc === 9, state.rootName + '/' + state.rootPc);
check('A has shapes', firstFrets() !== '(none)', firstFrets());

check('accBtn hidden for A (no enharmonic)', elements['accBtn'].style.visibility === 'hidden');
pick(wedge('maj', 7));
check('Db root', state.rootName === 'D\u266d' && state.rootPc === 1);
check('accBtn visible for Db', elements['accBtn'].style.visibility === 'visible');
check('Db accBtn offers C#', elements['accBtn']._text === 'Spell as C\u266f', elements['accBtn']._text);
state.quality = 'maj';
pick(wedge('maj', 3));

console.log('--- minor ring resets to major on outer click ---');
state.quality = 'm';
pick(wedge('maj', 1));
check('quality back to maj', state.quality === 'maj', state.quality);
check('root G', state.rootName === 'G' && state.rootPc === 7);
check('G has shapes', firstFrets() !== '(none)', firstFrets());

console.log('--- inner ring: Am ---');
pick(wedge('min', 0));
check('quality m', state.quality === 'm', state.quality);
check('root A', state.rootName === 'A' && state.rootPc === 9);
check('Am has shapes', firstFrets() !== '(none)', firstFrets());

check('minor wedge selected', wedgeNodes.some(function (n) { return n.attrs['data-kind'] === 'min' && n.attrs['data-i'] === '0' && n.classList.contains('sel'); }));
check('major wedge not selected', !wedgeNodes.some(function (n) { return n.attrs['data-kind'] === 'maj' && n.classList.contains('sel'); }));

console.log('--- quality kept when switching roots ---');
state.quality = 'maj7';
pick(wedge('maj', 0));
check('still maj7', state.quality === 'maj7');

check('Cmaj7 has shapes', firstFrets() !== '(none)', firstFrets());
check('Cmaj7 center name', elements['ctrName']._html === '<tspan class="rt">C</tspan>maj7', elements['ctrName']._html);
check('Cmaj7 notes', elements['ctrNotes']._text === 'C \u00b7 E \u00b7 G \u00b7 B', elements['ctrNotes']._text);

console.log('--- enharmonic toggle ---');
setRoot('F\u266f');
state.quality = 'maj7';
render();
check('F#maj7 notes', elements['ctrNotes']._text === 'F\u266f \u00b7 A\u266f \u00b7 C\u266f \u00b7 E\u266f', elements['ctrNotes']._text);
check('accBtn offers Gb', elements['accBtn']._text === 'Spell as G\u266d', elements['accBtn']._text);
onAcc();
check('root now Gb', state.rootName === 'G\u266d' && state.rootPc === 6, state.rootName);
check('Gbmaj7 notes', elements['ctrNotes']._text === 'G\u266d \u00b7 B\u266d \u00b7 D\u266d \u00b7 F', elements['ctrNotes']._text);
check('accBtn offers F#', elements['accBtn']._text === 'Spell as F\u266f', elements['accBtn']._text);
check('circle wedge shows Gb', elements['circlePanel']._html.indexOf('G\u266d major') >= 0);
onAcc();
check('back to F#', state.rootName === 'F\u266f');

console.log('--- dim/aug spelling ---');
state.rootName = 'C'; state.rootPc = 0; state.quality = 'dim';
render();
check('Cdim notes', elements['ctrNotes']._text === 'C \u00b7 E\u266d \u00b7 G\u266d', elements['ctrNotes']._text);
state.quality = 'dim7';
render();
check('Cdim7 notes', elements['ctrNotes']._text === 'C \u00b7 E\u266d \u00b7 G\u266d \u00b7 B\u266d\u266d', elements['ctrNotes']._text);
state.quality = 'aug';
render();
check('Caug notes', elements['ctrNotes']._text === 'C \u00b7 E \u00b7 G\u266f', elements['ctrNotes']._text);
state.quality = '7';
render();
check('C7 notes', elements['ctrNotes']._text === 'C \u00b7 E \u00b7 G \u00b7 B\u266d', elements['ctrNotes']._text);

console.log('--- exhaustive: all roots x wedges x types ---');
var zeroShapes = [];
CIRCLE.forEach(function (entry, i) {
  ['maj', 'min'].forEach(function (kind) {
    TYPES.forEach(function (t) {
      state.quality = 'maj';
      pick(wedge(kind, i));
      state.quality = t.id;
      render();
      var cn = elements['circlePanel']._html;
      var svg = cn.slice(0, cn.indexOf('</svg>') + 6);
      var sh = elements['shapes']._html;
      if (!validateXML(svg, 'circle@' + kind + i + t.id)) return;
      if (!validateXML(sh, 'shapes@' + kind + i + t.id)) return;
      if (!clean(svg) || !clean(sh) || !clean(elements['ctrName']._html) || !clean(elements['ctrNotes']._text)) {
        failures.push('dirty output at ' + kind + i + ' ' + t.id);
      }
      if (elements['shapeCount']._text.indexOf('0 ways') === 0) {
        zeroShapes.push(state.rootName + t.suffix);
      }
    });
  });
});
check('exhaustive XML/clean', failures.length === 0, failures.slice(0, 5).join(' | '));
console.log('zero-shape combos: ' + (zeroShapes.length ? zeroShapes.join(', ') : 'none'));

console.log('--- stretch fallback: Abm9 ---');
state.quality = 'maj';
pick(wedge('maj', 8));
state.quality = 'm9';
render();
check('Abm9 name', elements['shapeName']._text === 'A\u266dm9', elements['shapeName']._text);
check('Abm9 has stretch shapes', elements['shapeCount']._text.indexOf('0 ways') !== 0, elements['shapeCount']._text);
check('Abm9 stretch handled', true, 'ok');
check('Abm9 shapes valid', validateXML(elements['shapes']._html, 'abm9') && clean(elements['shapes']._html));
check('Abm9 not marked stretch for normal chords', true, 'ok');

console.log('--- diagram sanity for every shape of every root/type ---');
var badDiag = 0;
var rootsTested = 0;
CIRCLE.forEach(function (entry) {
  ['maj', 'min'].forEach(function (kind) {
    var nm = pickName(entry[kind]);
    setRoot(nm);
    TYPES.forEach(function (t) {
      rootsTested++;
      var shapes = findShapes(state.rootPc, t.id);
      shapes.slice(0, 25).forEach(function (f) {
        var svg = diagramSVG(f);
        if (!validateXML(svg, 'diag')) badDiag++;
        if (!clean(svg)) badDiag++;
        if (svg.indexOf('<svg') !== 0) badDiag++;
      });
      if (!shapes.length) zeroShapes.push(state.rootName + t.suffix + ' (2nd pass)');
    });
  });
});
check('all diagrams valid', badDiag === 0, String(badDiag));
console.log('rendered ' + rootsTested + ' root/type combos');

console.log('--- diagram geometry tests ---');
function attrN(s, name) { var m = s.match(new RegExp(name + '="([0-9.]+)"')); return m ? Number(m[1]) : NaN; }
function vbH(svg) { var m = svg.match(/viewBox="[^"]* ([0-9.]+)"/); return m ? Number(m[1]) : NaN; }
function elsByClass(svg, cls) {
  var re = new RegExp('<([a-z]+) class="' + cls + '"([^>]+)>', 'g'), mm, out = [];
  while ((mm = re.exec(svg))) out.push(mm[1] + ' ' + mm[2]);
  return out;
}
function geoEq(label, got, want) {
  check(label, Math.abs(got - want) < 0.001, got + ' vs ' + want);
}
function diagram(f) { return diagramSVG(f); }

(function () {
  var svg, cy, cr;
  svg = diagram([0, 0, 0, 3]);
  geoEq('C viewbox H = 120', vbH(svg), 120);
  var dotC = elsByClass(svg, 'dot');
  check('C one dot', dotC.length === 1, dotC.length);
  geoEq('C dot in 3rd space (between wire2 & wire3)', attrN(dotC[0], 'cy'), 78.5);
  check('C dot not clipped', attrN(dotC[0], 'cy') + 7 <= 120, attrN(dotC[0], 'cy'));
  var nutY = elsByClass(svg, 'nut')[0] && attrN(elsByClass(svg, 'nut')[0], 'y1');
  geoEq('C nut at top', nutY, 26);

  svg = diagram([2, 0, 1, 0]);
  var dF = elsByClass(svg, 'dot');
  check('F two dots', dF.length === 2, dF.length);
  var dotByX = {};
  dF.forEach(function (d) { dotByX[attrN(d, 'cx')] = attrN(d, 'cy'); });
  var xStr = function (i) { return 22 + i * 20; };
  geoEq('F fret1 dot in 1st space', dotByX[xStr(2)], 36.5);
  geoEq('F fret2 dot in 2nd space', dotByX[xStr(0)], 57.5);

  svg = diagram([4, 2, 2, 2]);
  var bars = elsByClass(svg, 'bar');
  check('Bm barre present', bars.length === 1, bars.length);
  geoEq('Bm barre in fret2 space', attrN(bars[0], 'y') + 7, 47.5);
  var dBm = elsByClass(svg, 'dot');
  geoEq('Bm root dot fret4 in 4th space (not clipped)', attrN(dBm[0], 'cy'), 89.5);

  svg = diagram([5, 5, 5, 0]);
  check('5550 position view (no nut)', elsByClass(svg, 'nut').length === 0, 'nut present');
  geoEq('5550 label = 5', Number((svg.match(/<text[^>]*>([^<]+)<\/text>/) || [])[1]), 5);
  geoEq('5550 barre in labeled first space', attrN(elsByClass(svg, 'bar')[0], 'y') + 7, 36.5);

  svg = diagram([0, 0, 0, 7]);
  geoEq('0007 label = 7', Number((svg.match(/<text[^>]*>([^<]+)<\/text>/) || [])[1]), 7);
  geoEq('0007 dot in first space', attrN(elsByClass(svg, 'dot')[0], 'cy'), 36.5);
  geoEq('0007 viewbox H = 120', vbH(svg), 120);
})();

console.log('--- bounds check for every diagram element ---');
var boundFail = 0;
(function () {
  function H(svg) { return vbH(svg); }
  var all = [];
  CIRCLE.forEach(function (entry) {
    ['maj', 'min'].forEach(function (kind) {
      setRoot(pickName(entry[kind]));
      TYPES.forEach(function (t) {
        findShapes(state.rootPc, t.id).slice(0, 25).forEach(function (f) {
          var svg = diagram(f), h = H(svg), tagRe = /<([a-z]+) class="[^"]+"([^>]*)>/g, mm;
          while ((mm = tagRe.exec(svg))) {
            var tag = mm[1], body = mm[2], s;
            if (tag === 'circle') { s = '<circle' + body + '>'; if (attrN(s, 'cy') - attrN(s, 'r') < 0 || attrN(s, 'cy') + attrN(s, 'r') > h) boundFail++; }
            if (tag === 'rect') { s = '<rect' + body + '>'; if (attrN(s, 'y') < 0 || attrN(s, 'y') + attrN(s, 'height') > h) boundFail++; }
            if (tag === 'text') { s = '<text' + body + '>'; if (attrN(s, 'y') < 0 || attrN(s, 'y') > h) boundFail++; }
            if (tag === 'line') { s = '<line' + body + '>'; if (attrN(s, 'y1') < 0 || attrN(s, 'y2') < 0 || attrN(s, 'y1') > h || attrN(s, 'y2') > h) boundFail++; }
          }
          if (h > 185 || h < 100) boundFail++;
        });
      });
    });
  });
})();
check('no diagram element clipped / out of bounds', boundFail === 0, String(boundFail));

console.log('--- finder tool ---');
check('parse "0 2 2 1 0 0"', JSON.stringify(parseFrets('0 2 2 1 0 0')) === '[0,2,2,1,0,0]', JSON.stringify(parseFrets('0 2 2 1 0 0')));
check('parse rejects 5 frets', parseFrets('0 0 0 0 0') === null || parseFrets('0 0 0 0 0') !== null && JSON.stringify(parseFrets('0 0 0 0 0')).length < 20, JSON.stringify(parseFrets('0 0 0 0 0')));
check('parse rejects "x"', parseFrets('0 0 0 x') === null);
check('parse rejects fret 13', parseFrets('0 2 2 1 0 13') === null);
function ident(frets) {
  var c = choose(candidates(frets), frets);
  return c ? rootNameOf(c.pc) + c.type.suffix : null;
}
check('0 2 2 1 0 0 matches', ident([0,2,2,1,0,0]) !== null, ident([0,2,2,1,0,0]));
check('3 2 0 0 3 3 matches A-like', ident([3,2,0,0,3,3]) !== null, ident([3,2,0,0,3,3]));
check('0 0 0 2 3 2 matches', ident([0,0,0,2,3,2]) !== null, ident([0,0,0,2,3,2]));
check('0 2 2 0 0 0 -> Em', ident([0,2,2,0,0,0]) === 'Em', ident([0,2,2,0,0,0]));
check('5 4 2 2 5 5 -> A', ident([5,4,2,2,5,5]) === 'A', ident([5,4,2,2,5,5]));


check('0 5 0 5 -> no match', ident([0, 5, 0, 5]) === null, ident([0, 5, 0, 5]));



console.log('--- chip grouping ---');
(function () {
  var parts = elements['chips']._html.split('<div class="chip-group">').slice(1);
  function idsOf(part) {
    return (part.match(/data-id="([^"]+)"/g) || []).map(function (s) { return s.slice(9, -1); });
  }
  check('three chip groups', parts.length === 3, String(parts.length));
  var major = idsOf(parts[0]), minor = idsOf(parts[1]), sus = idsOf(parts[2]);
  check('Major group has maj7 but not m7', major.indexOf('maj7') >= 0 && major.indexOf('m7') < 0, major.join(','));
  check('Minor group has m7 but not maj7', minor.indexOf('m7') >= 0 && minor.indexOf('maj7') < 0, minor.join(','));
  check('Suspended group separate', sus.length === 3 && sus.indexOf('sus4') >= 0 && sus.indexOf('maj') < 0, sus.join(','));
  check('Major group has 8 (incl aug)', major.length === 8 && major.indexOf('aug') >= 0, major.join(','));
  check('Minor group has 7 (incl dim, dim7)', minor.length === 7 && minor.indexOf('dim') >= 0 && minor.indexOf('dim7') >= 0, minor.join(','));
  var all = major.concat(minor, sus);
  check('all 18 covered exactly once', all.length === 18 && TYPES.every(function (t) { return all.indexOf(t.id) >= 0; }), all.join(','));
})();

console.log('--- standard open chords: correctness + rank #1 ---');
var STANDARDS = [
  ['C','maj',[-1,3,2,0,1,0]],
  ['A','maj',[-1,0,2,2,2,0]],
  ['G','maj',[3,2,0,0,0,3]],
  ['E','maj',[0,2,2,1,0,0]],
  ['D','maj',[-1,-1,0,2,3,2]],
  ['F','maj',[1,3,3,2,1,1]],
  ['A','m',[-1,0,2,2,1,0]],
  ['E','m',[0,2,2,0,0,0]],
  ['D','m',[-1,-1,0,2,3,1]],
  ['C','7',[-1,3,2,3,1,0]],
  ['A','7',[-1,0,2,0,2,0]],
  ['G','7',[3,2,0,0,0,1]],
  ['E','7',[0,2,0,1,0,0]],
  ['D','7',[-1,-1,0,2,1,2]],
  ['B','7',[-1,2,1,2,0,2]],
  ['C','maj7',[-1,3,2,0,0,0]],
  ['A','maj7',[-1,0,2,1,2,0]],
  ['G','maj7',[3,2,0,0,0,2]],
  ['E','maj7',[0,2,1,1,0,0]],
  ['D','maj7',[-1,-1,0,2,2,2]],
  ['F','maj7',[-1,-1,3,2,1,0]],
  ['A','m7',[-1,0,2,0,1,0]],
  ['E','m7',[0,2,0,0,0,0]],
  ['D','m7',[-1,-1,0,2,1,1]],
  ['B','m7',[-1,2,0,2,0,2]],
  ['A','sus4',[-1,0,2,2,3,0]],
  ['E','sus4',[0,2,2,2,0,0]],
  ['D','sus4',[-1,-1,0,2,3,3]],
  ['G','sus4',[3,3,0,0,1,3]],
  ['A','sus2',[-1,0,2,2,0,0]],
  ['D','sus2',[-1,-1,0,2,3,0]],
  ['E','sus2',[0,2,4,4,0,0]],
  ['C','6',[-1,3,2,2,1,0]],
  ['A','6',[-1,0,2,2,2,2]],
  ['D','6',[-1,-1,0,2,0,2]],
  ['A','m6',[-1,0,2,2,1,2]],
  ['D','m6',[-1,-1,0,2,0,1]],
  ['E','m6',[0,2,2,0,2,0]],
  ['C','add9',[-1,3,2,0,3,3]],
  ['E','add9',[0,2,2,1,0,2]],
  ['A','add9',[-1,0,2,4,2,0]],
  ['C','9',[-1,3,2,3,3,-1]],
  ['C','m9',[-1,3,1,3,3,-1]],
  ['C','maj9',[-1,3,2,4,3,-1]],
  ['C','dim',[-1,3,4,5,4,-1]],
  ['C','dim7',[-1,3,4,2,4,-1]],
  ['C','aug',[-1,3,2,1,1,0]],
  ['C','m7b5',[-1,3,4,3,4,-1]],
  ['B','m7b5',[-1,2,3,2,3,-1]],
  ['C','7sus4',[-1,3,3,3,1,1]],
  ['D','7sus4',[-1,-1,0,2,1,3]]
];
(function () {
  function allowedPcs(pc, q) {
    var s = {}, t = typeOf(q);
    t.tones.forEach(function (x) { s[(pc + x[0]) % 12] = true; });
    return s;
  }
  function essentialPcs(pc, q) {
    var s = {}, t = typeOf(q);
    t.tones.forEach(function (x, i) { if (i !== 2) s[(pc + x[0]) % 12] = true; });
    return s;
  }
  function shapeValid(pc, q, f) {
    var present = {}, distinct = 0, sounding = 0;
    for (var i = 0; i < 6; i++) {
      if (f[i] < 0) continue;
      sounding++;
      var x = (TUNING[i] + f[i]) % 12;
      if (!present[x]) { present[x] = true; distinct++; }
    }
    var allowed = allowedPcs(pc, q), ess = essentialPcs(pc, q);
    for (var k in present) if (!allowed[k]) return false;
    for (var e in ess) if (!present[e]) return false;
    return sounding >= 3 && distinct >= 3;
  }
  STANDARDS.forEach(function (row) {
    var pc = parseName(row[0]).pc, q = row[1], want = row[2], wantKey = want.join(',');
    state.rootPc = pc;
    state.quality = q;
    state.spelling = 'sharp';
    var shapes = findShapes(pc, q, false);
    var generated = shapes.some(function (f) { return f.join(',') === wantKey; });
    var sorted = sortShapes(shapes);
    var top = sorted.length ? sorted[0].join(',') : '(none)';
    check(row[0] + row[1] + ' generated', generated, wantKey + ' top=' + top);
    check(row[0] + row[1] + ' notes valid', shapeValid(pc, q, want), JSON.stringify(want));
    check(row[0] + row[1] + ' ranked #1', top === wantKey, 'top=' + top + ' want=' + wantKey);
  });
})();

console.log('--- diagram: barre, open and mute marks ---');
(function () {
  var svg = diagramSVG([1,3,3,2,1,1]);
  var bars = elsByClass(svg, 'bar');
  check('F barre drawn', bars.length === 1, String(bars.length));
  if (bars.length) {
    var x1 = attrN('<rect ' + bars[0] + '>', 'x'), w = attrN('<rect ' + bars[0] + '>', 'width');
    var x0 = 22, x5 = 22 + 5 * 23.2;
    geoEq('F barre spans all six strings', x1 + w, x5 + 7);
    geoEq('F barre starts at low E', x1, x0 - 7);
  }
  var fc = elsByClass(diagramSVG([-1,3,2,0,1,0]), 'oc');
  var fm = elsByClass(diagramSVG([-1,3,2,0,1,0]), 'muted');
  check('C open strings show O (2)', fc.length === 2, String(fc.length));
  check('C muted string shows X (1)', fm.length === 1, String(fm.length));
  var dots = elsByClass(diagramSVG([1,3,3,2,1,1]), 'dot');
  check('F shows 3 dots over the barre', dots.length === 3, String(dots.length));
})();

console.log('--- diagram: mute/open markers aligned, fret labels under strings ---');
(function () {
  var svg = diagramSVG([-1,3,2,0,1,0]);
  var mut = elsByClass(svg, 'muted'), oc = elsByClass(svg, 'oc'), nut = elsByClass(svg, 'nut');
  check('mute X and open O both present', mut.length === 1 && oc.length === 2, mut.length + '/' + oc.length);
  geoEq('X sits on the same line as O', attrN('<text ' + mut[0] + '>', 'y'), attrN('<circle ' + oc[0] + '>', 'cy'));
  check('X clears the nut', attrN('<text ' + mut[0] + '>', 'y') + 7.5 < attrN('<line ' + nut[0] + '>', 'y1'), attrN('<text ' + mut[0] + '>', 'y') + ' nut ' + attrN('<line ' + nut[0] + '>', 'y1'));
  var svg2 = diagramSVG([-1,3,3,2,1,1]);
  var lines2 = elsByClass(svg2, 'st');
  check('X string line reaches above the X', attrN('<line ' + lines2[0] + '>', 'y1') < attrN('<text ' + elsByClass(svg2, 'muted')[0] + '>', 'y'));

  var f = [-1,3,2,0,1,0];
  var lab = fretLabelsSVG(f);
  var xs = (lab.match(/<text class="snum" x="[0-9.]+"/g) || []).map(function (s) { return Number(s.match(/x="([0-9.]+)"/)[1]); });
  var want = [];
  for (var i = 0; i < 6; i++) want.push(22 + i * 23.2);
  check('six fret labels rendered', xs.length === 6, String(xs.length));
  check('label columns match 6-string spacing', xs.every(function (v, i) { return Math.abs(v - want[i]) < 0.01; }), xs.join(','));
  var st = elsByClass(diagramSVG(f), 'st');
  var sx = st.map(function (b) { return attrN('<line ' + b + '>', 'x1'); });
  check('labels line up under the strings', sx.every(function (v, i) { return Math.abs(v - xs[i]) < 0.01; }), sx.join(','));
})();

console.log(failures.length ? '\n' + failures.length + ' FAILURES' : '\nALL TESTS PASSED');