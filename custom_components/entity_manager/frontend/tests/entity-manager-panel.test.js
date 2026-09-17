/**
 * Entity Manager Panel – Vitest unit tests
 *
 * Run:  npm test
 *
 * The vitest.setup.js file evals entity-manager-panel.js into the jsdom window
 * before these tests run, so customElements.get('entity-manager-panel') works.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockHass = {
  callWS: vi.fn().mockResolvedValue({}),
  states: {
    'light.living_room': {
      entity_id: 'light.living_room',
      state: 'on',
      attributes: { friendly_name: 'Living Room Light' },
      last_changed: new Date(Date.now() - 60_000).toISOString(),
      last_updated: new Date(Date.now() - 60_000).toISOString(),
    },
  },
  auth: { data: { hassUrl: 'http://localhost:8123' } },
};

// ---------------------------------------------------------------------------
// Panel instance factory
// ---------------------------------------------------------------------------

let Panel;

beforeAll(() => {
  Panel = customElements.get('entity-manager-panel');
  if (!Panel) throw new Error('entity-manager-panel not registered — check vitest.setup.js');
});

function makePanel() {
  const el = new Panel();
  // Bypass the setter to avoid triggering updateView() before the element is
  // connected to the DOM.
  el._hass = { ...mockHass, callWS: vi.fn().mockResolvedValue({}) };
  return el;
}

// ---------------------------------------------------------------------------
// _formatTimeDiff
// ---------------------------------------------------------------------------

describe('_formatTimeDiff(ms)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('returns "?" for null', () => {
    expect(el._formatTimeDiff(null)).toBe('?');
  });

  it('returns "?" for NaN', () => {
    expect(el._formatTimeDiff(NaN)).toBe('?');
  });

  it('formats seconds correctly', () => {
    expect(el._formatTimeDiff(5_000)).toBe('5s');
    expect(el._formatTimeDiff(59_000)).toBe('59s');
  });

  it('formats minutes correctly', () => {
    expect(el._formatTimeDiff(60_000)).toBe('1m');
    expect(el._formatTimeDiff(90_000)).toBe('1m');
    expect(el._formatTimeDiff(3_599_000)).toBe('59m');
  });

  it('formats hours correctly', () => {
    expect(el._formatTimeDiff(3_600_000)).toBe('1h');
    expect(el._formatTimeDiff(86_399_000)).toBe('23h');
  });

  it('formats days correctly', () => {
    expect(el._formatTimeDiff(86_400_000)).toBe('1 day');
    expect(el._formatTimeDiff(2 * 86_400_000)).toBe('2 days');
    // 7 days = 1 week (the function switches to weeks at 7+ days)
    expect(el._formatTimeDiff(7 * 86_400_000)).toBe('1 week');
  });
});

// ---------------------------------------------------------------------------
// _fmtAgo
// ---------------------------------------------------------------------------

describe('_fmtAgo(isoStr, fallback)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('returns default fallback "Never" for null', () => {
    expect(el._fmtAgo(null)).toBe('Never');
  });

  it('returns custom fallback for null', () => {
    expect(el._fmtAgo(null, 'Unknown')).toBe('Unknown');
  });

  it('returns "just now" or a time-ago string for a recent timestamp', () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const result = el._fmtAgo(oneMinuteAgo);
    // Should be something like "1m ago" — not the fallback
    expect(result).not.toBe('Never');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains "ago" suffix for past dates', () => {
    const tenMinutesAgo = new Date(Date.now() - 600_000).toISOString();
    expect(el._fmtAgo(tenMinutesAgo)).toContain('ago');
  });
});

// ---------------------------------------------------------------------------
// _escapeHtml / _escapeAttr
// ---------------------------------------------------------------------------

describe('_escapeHtml(str)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('escapes < and >', () => {
    expect(el._escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes ampersand', () => {
    expect(el._escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes double quotes', () => {
    expect(el._escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('passes through plain strings unchanged', () => {
    expect(el._escapeHtml('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(el._escapeHtml('')).toBe('');
  });
});

describe('_escapeAttr(str)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('escapes double quotes in attribute values', () => {
    const result = el._escapeAttr('say "hello"');
    expect(result).not.toContain('"');
  });

  it('handles plain strings', () => {
    expect(el._escapeAttr('sensor.temperature')).toBe('sensor.temperature');
  });
});

// ---------------------------------------------------------------------------
// _collGroup
// ---------------------------------------------------------------------------

describe('_collGroup(label, bodyHtml)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('returns a non-empty HTML string', () => {
    const html = el._collGroup('My Section', '<p>content</p>');
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('includes the label text', () => {
    const html = el._collGroup('Automations (5)', '<div>body</div>');
    expect(html).toContain('Automations (5)');
  });

  it('includes the body HTML', () => {
    const html = el._collGroup('Label', '<span id="inner">content</span>');
    expect(html).toContain('id="inner"');
    expect(html).toContain('content');
  });

  it('includes the em-collapsible class for listener attachment', () => {
    const html = el._collGroup('Label', '<div></div>');
    expect(html).toContain('em-collapsible');
  });

  it('produces a collapse arrow element', () => {
    const html = el._collGroup('Label', '<div></div>');
    // Arrow is either .em-collapse-arrow or .em-collapsible-icon
    const hasArrow = html.includes('em-collapse-arrow') || html.includes('em-collapsible-icon');
    expect(hasArrow).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// _reAttachCollapsibles
// ---------------------------------------------------------------------------

describe('_reAttachCollapsibles(root, opts)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  function buildRoot(bodyDisplay = '') {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="em-collapsible">
        Header
        <span class="em-collapse-arrow"></span>
      </div>
      <div class="em-group-body" style="display:${bodyDisplay}">Body content</div>
    `;
    return root;
  }

  it('toggles body visibility on header click (hide)', () => {
    const root = buildRoot('');
    el._reAttachCollapsibles(root);

    const header = root.querySelector('.em-collapsible');
    const body = root.querySelector('.em-group-body');

    expect(body.style.display).toBe('');
    header.click();
    expect(body.style.display).toBe('none');
  });

  it('toggles body visibility on header click (show again)', () => {
    const root = buildRoot('');
    el._reAttachCollapsibles(root);

    const header = root.querySelector('.em-collapsible');
    const body = root.querySelector('.em-group-body');

    header.click(); // hide
    header.click(); // show
    expect(body.style.display).toBe('');
  });

  it('expands a collapsed body when { expand: true }', () => {
    const root = buildRoot('none');
    el._reAttachCollapsibles(root, { expand: true });
    const body = root.querySelector('.em-group-body');
    expect(body.style.display).toBe('');
  });

  it('resets arrow transform when { expand: true }', () => {
    const root = buildRoot('none');
    const arrow = root.querySelector('.em-collapse-arrow');
    arrow.style.transform = 'rotate(-90deg)';
    el._reAttachCollapsibles(root, { expand: true });
    expect(arrow.style.transform).toBe('');
  });

  it('respects a custom selector', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="custom-toggle">Header</div>
      <div style="">Body</div>
      <div class="em-collapsible">Other</div>
      <div style="">Other body</div>
    `;
    el._reAttachCollapsibles(root, { selector: '.custom-toggle' });

    // Only the custom-toggle should have a click listener
    root.querySelector('.custom-toggle').click();
    expect(root.querySelector('div:nth-child(2)').style.display).toBe('none');
    // .em-collapsible should NOT be wired
    root.querySelector('.em-collapsible').click();
    expect(root.querySelector('div:nth-child(4)').style.display).toBe('');
  });
});

// ---------------------------------------------------------------------------
// _animateStatCounters — RAF cancellation guard
// ---------------------------------------------------------------------------

describe('_animateStatCounters()', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('cancels an existing RAF before starting a new animation', () => {
    const cancelSpy = vi.spyOn(global, 'cancelAnimationFrame');

    // Build a container with a .stat-value whose textContent is ≥ 2 (the early-return guard)
    // and a pre-existing _animRafId to trigger the cancellation path.
    const container = document.createElement('div');
    const stat = document.createElement('span');
    stat.className = 'stat-value';
    stat.textContent = '100'; // must be >= 2 to pass the isNaN/< 2 guard
    stat._animRafId = 42;     // simulate an in-progress animation
    container.appendChild(stat);

    el._animateStatCounters(container);

    expect(cancelSpy).toHaveBeenCalledWith(42);
    cancelSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// _triggerBadge — null vs undefined distinction
// ---------------------------------------------------------------------------

describe('_triggerBadge(item)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('returns "Never triggered" badge when last_triggered is explicitly null', () => {
    const html = el._triggerBadge({ last_triggered: null });
    expect(html).toContain('Never triggered');
    expect(html).toContain('em-never-triggered-badge');
  });

  it('does NOT return "Never triggered" when last_triggered is undefined (field absent)', () => {
    // Template sensors have no last_triggered field (undefined, not null)
    const html = el._triggerBadge({ triggered_by: undefined });
    expect(html).not.toContain('Never triggered');
  });

  it('returns human trigger badge for triggered_by="human"', () => {
    const item = { triggered_by: 'human', triggered_by_name: 'alice' };
    const html = el._triggerBadge(item);
    expect(html).toContain('alice');
    expect(html).not.toContain('Never triggered');
  });

  it('returns automation badge for triggered_by="automation"', () => {
    const html = el._triggerBadge({ triggered_by: 'automation' });
    expect(html).toContain('Automation');
    expect(html).not.toContain('Never triggered');
  });

  it('returns system/HA badge for unknown trigger type', () => {
    const html = el._triggerBadge({ triggered_by: 'system' });
    expect(html).toContain('HA');
    expect(html).not.toContain('Never triggered');
  });
});

// ---------------------------------------------------------------------------
// _attachDialogSearch — filtering and group hiding
// ---------------------------------------------------------------------------

describe('_attachDialogSearch(root)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  function buildSearchRoot(cards) {
    const root = document.createElement('div');
    root.innerHTML = `<input type="search" id="em-stat-search">`;
    const group = document.createElement('div');
    group.className = 'em-collapsible';
    root.appendChild(group);
    const body = document.createElement('div');
    body.className = 'em-group-body';
    root.appendChild(body);

    cards.forEach(({ id, name }) => {
      const card = document.createElement('div');
      card.className = 'em-mini-card';
      card.dataset.entityId = id;
      const nameEl = document.createElement('span');
      nameEl.className = 'entity-header-device';
      nameEl.textContent = name;
      card.appendChild(nameEl);
      body.appendChild(card);
    });
    return root;
  }

  it('adds the em-stat-search-input class to the input', () => {
    const root = buildSearchRoot([{ id: 'sensor.a', name: 'Sensor A' }]);
    el._attachDialogSearch(root);
    expect(root.querySelector('#em-stat-search').classList.contains('em-stat-search-input')).toBe(true);
  });

  it('hides cards whose entity_id does not match the search term', () => {
    const root = buildSearchRoot([
      { id: 'sensor.temperature', name: 'Temperature' },
      { id: 'light.kitchen', name: 'Kitchen Light' },
    ]);
    el._attachDialogSearch(root);
    const input = root.querySelector('#em-stat-search');
    input.value = 'temperature';
    input.dispatchEvent(new Event('input'));

    const cards = root.querySelectorAll('.em-mini-card');
    expect(cards[0].style.display).toBe(''); // matches
    expect(cards[1].style.display).toBe('none'); // does not match
  });

  it('shows all cards when search is cleared', () => {
    const root = buildSearchRoot([
      { id: 'sensor.foo', name: 'Foo' },
      { id: 'sensor.bar', name: 'Bar' },
    ]);
    el._attachDialogSearch(root);
    const input = root.querySelector('#em-stat-search');

    input.value = 'foo';
    input.dispatchEvent(new Event('input'));
    input.value = '';
    input.dispatchEvent(new Event('input'));

    root.querySelectorAll('.em-mini-card').forEach(card => {
      expect(card.style.display).not.toBe('none');
    });
  });

  it('hides group header when all cards in the group are hidden', () => {
    const root = buildSearchRoot([{ id: 'sensor.xyz', name: 'XYZ' }]);
    el._attachDialogSearch(root);
    const input = root.querySelector('#em-stat-search');
    input.value = 'no_match_at_all';
    input.dispatchEvent(new Event('input'));

    const body = root.querySelector('.em-group-body');
    expect(body.style.display).toBe('none');
  });

  it('does nothing when there is no #em-stat-search input', () => {
    const root = document.createElement('div'); // no search input
    expect(() => el._attachDialogSearch(root)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Bulk rename CSV: _parseCsv, _validateRenameCsv, _renameCsvText
// ---------------------------------------------------------------------------

describe('_parseCsv(text)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('splits comma rows with CRLF and trims cells', () => {
    expect(el._parseCsv('a, b ,c\r\nd,e,f\r\n')).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']]);
  });

  it('strips a BOM and handles quoted delimiters, quotes and newlines', () => {
    expect(el._parseCsv('﻿x,"Eldhús, loft","say ""hi"""\ny,"two\nlines",z'))
      .toEqual([['x', 'Eldhús, loft', 'say "hi"'], ['y', 'two\nlines', 'z']]);
  });

  it('detects semicolon as the delimiter', () => {
    expect(el._parseCsv('a;b;Stofa, ljós\n')).toEqual([['a', 'b', 'Stofa, ljós']]);
  });

  it('honours an Excel sep= line', () => {
    expect(el._parseCsv('sep=;\na;b,c\n')).toEqual([['a', 'b,c']]);
  });

  it('returns no rows for empty input', () => {
    expect(el._parseCsv('')).toEqual([]);
  });
});

describe('_validateRenameCsv(rows, known)', () => {
  let el;
  const known = new Map([
    ['light.stofa', 'Stofa'],
    ['light.eldhus', 'Eldhús'],
    ['sensor.temp', ''],
  ]);
  beforeEach(() => { el = makePanel(); });
  const run = rows => el._validateRenameCsv(rows, known);

  it('skips the header, blank and comment rows', () => {
    const r = run([['old_entity_id', 'new_entity_id', 'display_name'], [''], ['# note'], ['light.stofa', 'light.lounge']]);
    expect(r.problems).toEqual([]);
    expect(r.changes).toEqual([{ old: 'light.stofa', new: 'light.lounge', name: null }]);
  });

  it('accepts a new ID without the domain', () => {
    expect(run([['light.stofa', 'lounge']]).changes[0].new).toBe('light.lounge');
  });

  it('drops unchanged rows and unchanged display names', () => {
    expect(run([['light.stofa', 'light.stofa', 'Stofa'], ['light.eldhus', '', '']]).changes).toEqual([]);
  });

  it('keeps a display-name-only change', () => {
    expect(run([['light.eldhus', 'light.eldhus', 'Eldhúsljós']]).changes)
      .toEqual([{ old: 'light.eldhus', new: 'light.eldhus', name: 'Eldhúsljós' }]);
  });

  it('rejects bad rows with a reason and 1-based row number', () => {
    const r = run([
      ['light.missing', 'light.x'],
      ['Light.Stofa', 'x'],
      ['light.stofa', 'switch.stofa'],
      ['light.stofa', 'light.Bad-Name'],
      ['light.stofa', 'light.eldhus'],
      ['sensor.temp', 'sensor.a'],
      ['light.eldhus', 'light.a'.replace('light', 'sensor')],
    ]);
    expect(r.changes).toEqual([{ old: 'sensor.temp', new: 'sensor.a', name: null }]);
    expect(r.problems.map(p => [p.row, p.reason])).toEqual([
      [1, 'Entity not found'],
      [2, 'Current entity ID is not valid'],
      [3, 'The domain cannot change'],
      [4, 'New entity ID is not valid — lowercase letters, digits and _ only'],
      [5, 'light.eldhus is already in use'],
      [7, 'The domain cannot change'],
    ]);
  });

  it('rejects duplicate sources and duplicate targets', () => {
    const r = run([['light.stofa', 'light.a'], ['light.stofa', 'light.b'], ['light.eldhus', 'light.a']]);
    expect(r.changes).toHaveLength(1);
    expect(r.problems.map(p => p.reason)).toEqual([
      'Entity is listed more than once',
      'Another row already renames to light.a',
    ]);
  });

  it('rejects a swap', () => {
    const r = run([['light.stofa', 'light.eldhus'], ['light.eldhus', 'light.stofa']]);
    expect(r.changes).toEqual([]);
    expect(r.problems).toHaveLength(2);
  });
});

describe('_renameCsvText(entityIds)', () => {
  it('writes a BOM, header and quoted display names that round-trip', () => {
    const el = makePanel();
    el._hass.states['light.q'] = { attributes: { friendly_name: 'Stofa, "aðal"' } };
    const text = el._renameCsvText(['light.living_room', 'light.q']);
    expect(text.startsWith('﻿old_entity_id,new_entity_id,display_name\r\n')).toBe(true);
    const rows = el._parseCsv(text);
    expect(rows[1]).toEqual(['light.living_room', 'light.living_room', 'Living Room Light']);
    expect(rows[2]).toEqual(['light.q', 'light.q', 'Stofa, "aðal"']);
    const known = new Map([['light.living_room', 'Living Room Light'], ['light.q', 'Stofa, "aðal"']]);
    expect(el._validateRenameCsv(rows, known).changes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// File import / export helpers (work in the Companion apps too)
// ---------------------------------------------------------------------------

describe('_decodeImportText(bytes)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });
  const utf8 = s => new TextEncoder().encode(s);

  it('decodes UTF-8, keeping Icelandic letters', () => {
    expect(el._decodeImportText(utf8('light.a,light.b,Eldhúsljós þvottahús\r\n')))
      .toBe('light.a,light.b,Eldhúsljós þvottahús\r\n');
  });

  it('reads a BOM-prefixed export back through the CSV parser', () => {
    const text = el._decodeImportText(utf8('﻿old_entity_id,new_entity_id\r\nlight.a,light.b\r\n'));
    expect(el._parseCsv(text)).toEqual([['old_entity_id', 'new_entity_id'], ['light.a', 'light.b']]);
  });

  it('falls back to Windows-1252 for non-UTF-8 files from Excel', () => {
    // "Stofa ljós, gólf ð" in Windows-1252: ó = 0xF3, ð = 0xF0
    const bytes = new Uint8Array([...utf8('light.a,light.b,Stofa lj'), 0xf3, ...utf8('s g'), 0xf3, ...utf8('lf '), 0xf0]);
    expect(el._decodeImportText(bytes)).toBe('light.a,light.b,Stofa ljós gólf ð');
  });

  it('refuses an Excel workbook with a hint to save as CSV', () => {
    const xlsx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    expect(() => el._decodeImportText(xlsx)).toThrow(/Excel workbook.*CSV UTF-8/);
  });

  it('refuses an old .xls file', () => {
    const xls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(() => el._decodeImportText(xls)).toThrow(/\.xls/);
  });

  it('refuses other binary files', () => {
    expect(() => el._decodeImportText(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]))).toThrow(/not a text file/);
  });
});

describe('_readImportText(file)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('reads a File as text', async () => {
    const file = new File(['light.a,light.b,Bílskúr'], 'rename.csv', { type: 'text/comma-separated-values' });
    await expect(el._readImportText(file)).resolves.toBe('light.a,light.b,Bílskúr');
  });

  it('reads a file whose reported type is not text/csv', async () => {
    const file = new File(['light.a,light.b'], 'rename.csv', { type: 'application/octet-stream' });
    await expect(el._readImportText(file)).resolves.toBe('light.a,light.b');
  });

  it('refuses files over 5 MB before reading them', async () => {
    const readSpy = vi.spyOn(el, '_readFileBytes');
    await expect(el._readImportText({ size: 6 * 1024 * 1024, name: 'big.csv' })).rejects.toThrow(/5 MB/);
    expect(readSpy).not.toHaveBeenCalled();
  });
});

describe('_pickFile(onFile)', () => {
  let el;
  let clickSpy;
  beforeEach(() => {
    el = makePanel();
    clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => {
    clickSpy.mockRestore();
    document.querySelectorAll('input.em-file-picker').forEach(i => i.remove());
  });

  const current = () => document.querySelector('input.em-file-picker');

  it('opens an unfiltered file input that is attached to the page', () => {
    el._pickFile(() => {});
    const input = current();
    expect(input).not.toBeNull();
    expect(input.type).toBe('file');
    expect(input.accept).toBe('');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('passes the chosen file on and removes the input', () => {
    const onFile = vi.fn();
    el._pickFile(onFile);
    const input = current();
    const file = new File(['x'], 'a.csv');
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    expect(onFile).toHaveBeenCalledWith(file);
    expect(current()).toBeNull();
  });

  it('removes the input when the picker is cancelled', () => {
    const onFile = vi.fn();
    el._pickFile(onFile);
    current().dispatchEvent(new Event('cancel'));
    expect(current()).toBeNull();
    expect(onFile).not.toHaveBeenCalled();
  });

  it('replaces a picker left behind by an earlier call', () => {
    el._pickFile(() => {});
    el._pickFile(() => {});
    expect(document.querySelectorAll('input.em-file-picker')).toHaveLength(1);
  });
});

describe('_downloadFile(blob, filename)', () => {
  let el;
  beforeEach(() => {
    el = makePanel();
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/abc');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicks an attached link, removes it, and keeps the blob URL alive for 10 s', () => {
    let seen = null;
    const dispatchSpy = vi.spyOn(HTMLAnchorElement.prototype, 'dispatchEvent').mockImplementation(function () {
      seen = { href: this.getAttribute('href'), download: this.download, target: this.target, attached: document.body.contains(this) };
      return true;
    });
    el._downloadFile(new Blob(['a,b'], { type: 'text/csv' }), 'em-rename.csv');
    dispatchSpy.mockRestore();

    expect(seen).toEqual({ href: 'blob:http://localhost/abc', download: 'em-rename.csv', target: '_blank', attached: true });
    expect(document.querySelector('a[download="em-rename.csv"]')).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(9_999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/abc');
  });
});

describe('_confirmReferencePreview(renameCount, preview)', () => {
  afterEach(() => document.querySelectorAll('.confirm-no').forEach(b => b.click()));

  it('pluralises counts correctly and lets long paths wrap', () => {
    const el = makePanel();
    const longPath = 'amira/snapshots/20260314_235710_automations.yaml';
    el._confirmReferencePreview(2, {
      total_replacements: 28,
      files_updated: [{ file: longPath, replacements: 27 }, { file: 'configuration.yaml', replacements: 1 }],
      manual_references: [{ file: '.storage/daily_brief_items', matches: 1 }, { file: '.storage/home_health_overview.frequency', matches: 481 }],
    });
    const text = document.body.textContent;
    expect(text).toContain('27 refs');
    expect(text).toContain('1 ref');
    expect(text).toContain('1 match');
    expect(text).toContain('481 matches');
    expect(text).not.toContain('matchs');
    const label = [...document.querySelectorAll('span')].find(s => s.textContent === longPath);
    expect(label.style.overflowWrap).toBe('anywhere');
    expect(parseFloat(label.style.minWidth)).toBe(0);
  });
});
