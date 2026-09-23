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

// ---------------------------------------------------------------------------
// Header filter pills
// ---------------------------------------------------------------------------

/** A panel with one device in Stofa (floor Efri hæð) and one loose entity in Eldhús. */
function makePillPanel() {
  const el = makePanel();
  el.deviceInfo = {
    dev_shelly: { area_id: 'stofa', connections: [['mac', 'aa:bb']], identifiers: [['shelly', 'x']] },
    dev_cloud: { area_id: null, connections: [], identifiers: [['cloudy', 'y']] },
  };
  el.areaLookup = new Map([
    ['stofa', { areaName: 'Stofa', floorName: 'Efri hæð' }],
    ['eldhus', { areaName: 'Eldhús', floorName: 'Neðri hæð' }],
  ]);
  el.entityAreaMap = new Map([['sensor.loose', 'eldhus']]);
  el.entityDeviceMap = new Map();
  el.entityLabelsMap = new Map([['switch.lamp', ['lbl_critical']]]);
  el.deviceLabelsMap = new Map([['dev_shelly', ['lbl_device']]]);
  el.areaLabelsMap = new Map([['stofa', ['lbl_downstairs']]]);
  el.labelLookup = new Map([
    ['lbl_critical', { name: 'Critical', color: 'red' }],
    ['lbl_device', { name: 'Device', color: null }],
  ]);
  return el;
}

const LAMP = { entity_id: 'switch.lamp', device_id: 'dev_shelly' };
const RSSI = { entity_id: 'sensor.rssi', device_id: 'dev_shelly', entity_category: 'diagnostic' };
const LOOSE = { entity_id: 'sensor.loose', device_id: null };

describe('_intgEntityAreaId(entity, deviceId)', () => {
  it('prefers the entity override, then the device area, else null', () => {
    const el = makePillPanel();
    expect(el._intgEntityAreaId(LAMP, 'dev_shelly')).toBe('stofa');
    expect(el._intgEntityAreaId(LOOSE, 'no_device')).toBe('eldhus');
    expect(el._intgEntityAreaId({ entity_id: 'sensor.nowhere' }, 'dev_cloud')).toBeNull();
  });

  it('lets an entity-level area override the device it belongs to', () => {
    const el = makePillPanel();
    el.entityAreaMap.set('switch.lamp', 'eldhus');
    expect(el._intgEntityAreaId(LAMP, 'dev_shelly')).toBe('eldhus');
  });
});

describe('_intgPillMatches(filter, entity, deviceId)', () => {
  let el;
  beforeEach(() => { el = makePillPanel(); });

  it('matches on category', () => {
    expect(el._intgPillMatches({ kind: 'cat', value: 'diagnostic' }, RSSI, 'dev_shelly')).toBe(true);
    expect(el._intgPillMatches({ kind: 'cat', value: 'diagnostic' }, LAMP, 'dev_shelly')).toBe(false);
    expect(el._intgPillMatches({ kind: 'cat', value: 'controls' }, LAMP, 'dev_shelly')).toBe(true);
  });

  it('matches on hardware type, never for entities with no device', () => {
    expect(el._intgPillMatches({ kind: 'hw', value: 'hardware' }, LAMP, 'dev_shelly')).toBe(true);
    expect(el._intgPillMatches({ kind: 'hw', value: 'cloud' }, LAMP, 'dev_shelly')).toBe(false);
    expect(el._intgPillMatches({ kind: 'hw', value: 'cloud' }, LOOSE, 'no_device')).toBe(false);
  });

  it('matches on area, with __none__ for entities that have none', () => {
    expect(el._intgPillMatches({ kind: 'area', value: 'stofa' }, LAMP, 'dev_shelly')).toBe(true);
    expect(el._intgPillMatches({ kind: 'area', value: 'eldhus' }, LOOSE, 'no_device')).toBe(true);
    expect(el._intgPillMatches({ kind: 'area', value: '__none__' }, LAMP, 'dev_shelly')).toBe(false);
    expect(el._intgPillMatches({ kind: 'area', value: '__none__' },
      { entity_id: 'sensor.nowhere' }, 'dev_cloud')).toBe(true);
  });

  it('matches on floor through the entity effective area', () => {
    expect(el._intgPillMatches({ kind: 'floor', value: 'Efri hæð' }, LAMP, 'dev_shelly')).toBe(true);
    expect(el._intgPillMatches({ kind: 'floor', value: 'Neðri hæð' }, LOOSE, 'no_device')).toBe(true);
    expect(el._intgPillMatches({ kind: 'floor', value: 'Efri hæð' },
      { entity_id: 'sensor.nowhere' }, 'dev_cloud')).toBe(false);
  });

  it('matches labels at entity, device and area scope alike', () => {
    expect(el._intgPillMatches({ kind: 'label', value: 'lbl_critical' }, LAMP, 'dev_shelly')).toBe(true);
    expect(el._intgPillMatches({ kind: 'label', value: 'lbl_device' }, RSSI, 'dev_shelly')).toBe(true);
    expect(el._intgPillMatches({ kind: 'label', value: 'lbl_downstairs' }, LAMP, 'dev_shelly')).toBe(true);
    expect(el._intgPillMatches({ kind: 'label', value: 'lbl_critical' }, RSSI, 'dev_shelly')).toBe(false);
  });

  it('keeps everything for an unknown filter kind', () => {
    expect(el._intgPillMatches({ kind: 'nonsense', value: 'x' }, LAMP, 'dev_shelly')).toBe(true);
  });
});

describe('_headerPill(scopeAttrs, activeFilter, kind, value, text, count, color)', () => {
  let el;
  beforeEach(() => { el = makePillPanel(); });

  it('marks only the matching pill active and carries kind, value and colour', () => {
    const active = [{ kind: 'area', value: 'stofa' }];
    const html = el._headerPill('data-integration="shelly"', active, 'area', 'stofa', 'Stofa', 4, 'var(--em-primary)');
    expect(html).toContain('integration-pill active');
    expect(html).toContain('data-pill-kind="area"');
    expect(html).toContain('data-pill-value="stofa"');
    expect(html).toContain('--pill-c:var(--em-primary)');
    expect(html).toContain('Stofa: 4');
    expect(html).toContain('Click to clear filter');

    const other = el._headerPill('data-integration="shelly"', active, 'area', 'eldhus', 'Eldhús', 2, 'var(--em-primary)');
    expect(other).not.toContain('active');
    expect(other).toContain('Click to filter');
  });

  it('escapes a value that would otherwise break out of the attribute', () => {
    const html = el._headerPill('data-device-id="d"', [], 'label', 'a"><script>x</script>', 'Odd', 1, 'red');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&quot;');
  });
});

describe('label pill colour', () => {
  it('uses the HA label colour, and the primary accent when a label has none', () => {
    const el = makePillPanel();
    expect(el._labelPillColor('lbl_critical')).toBe(el._labelColorCss('red'));
    expect(el._labelPillColor('lbl_device')).toBe('var(--em-primary)');
    expect(el._labelPillColor('lbl_unknown')).toBe('var(--em-primary)');
  });
});

describe('_pillMatchesAll(filters, entity, deviceId)', () => {
  let el;
  beforeEach(() => { el = makePillPanel(); });

  it('keeps everything when nothing is filtering', () => {
    expect(el._pillMatchesAll([], LAMP, 'dev_shelly')).toBe(true);
    expect(el._pillMatchesAll(undefined, LAMP, 'dev_shelly')).toBe(true);
  });

  it('ORs pills of the same kind', () => {
    const areas = [{ kind: 'area', value: 'stofa' }, { kind: 'area', value: 'eldhus' }];
    expect(el._pillMatchesAll(areas, LAMP, 'dev_shelly')).toBe(true);
    expect(el._pillMatchesAll(areas, LOOSE, 'no_device')).toBe(true);
    expect(el._pillMatchesAll(areas, { entity_id: 'sensor.nowhere' }, 'dev_cloud')).toBe(false);
  });

  it('ANDs pills of different kinds', () => {
    const diagnosticInStofa = [{ kind: 'cat', value: 'diagnostic' }, { kind: 'area', value: 'stofa' }];
    expect(el._pillMatchesAll(diagnosticInStofa, RSSI, 'dev_shelly')).toBe(true);
    // Right area, wrong category
    expect(el._pillMatchesAll(diagnosticInStofa, LAMP, 'dev_shelly')).toBe(false);
    // Right category, wrong area
    el.entityAreaMap.set('sensor.rssi', 'eldhus');
    expect(el._pillMatchesAll(diagnosticInStofa, RSSI, 'dev_shelly')).toBe(false);
  });
});

describe('_togglePillFilter(map, scope, kind, value)', () => {
  let el;
  beforeEach(() => { el = makePillPanel(); localStorage.clear(); });

  it('adds, stacks and removes, dropping the scope when the last pill goes', () => {
    const map = {};
    expect(el._togglePillFilter(map, 'shelly', 'area', 'stofa')).toBe(true);
    el._togglePillFilter(map, 'shelly', 'cat', 'diagnostic');
    expect(map.shelly).toEqual([{ kind: 'area', value: 'stofa' }, { kind: 'cat', value: 'diagnostic' }]);

    el._togglePillFilter(map, 'shelly', 'area', 'stofa');
    expect(map.shelly).toEqual([{ kind: 'cat', value: 'diagnostic' }]);

    expect(el._togglePillFilter(map, 'shelly', 'cat', 'diagnostic')).toBe(false);
    expect('shelly' in map).toBe(false);
  });

  it('persists both maps so filters survive a reload', () => {
    el._togglePillFilter(el.integrationHeaderFilter, 'shelly', 'label', 'lbl_critical');
    el._togglePillFilter(el.deviceHeaderFilter, 'dev_shelly', 'cat', 'sensors');

    expect(JSON.parse(localStorage.getItem('em-intg-pill-filters')))
      .toEqual({ shelly: [{ kind: 'label', value: 'lbl_critical' }] });
    expect(el._loadPillFilters('em-device-pill-filters'))
      .toEqual({ dev_shelly: [{ kind: 'cat', value: 'sensors' }] });
  });
});

describe('_loadPillFilters(key)', () => {
  beforeEach(() => localStorage.clear());

  it('survives junk in localStorage and drops malformed entries', () => {
    const el = makePillPanel();
    localStorage.setItem('em-intg-pill-filters', 'not json{');
    expect(el._loadPillFilters('em-intg-pill-filters')).toEqual({});

    localStorage.setItem('em-intg-pill-filters', JSON.stringify({
      good: [{ kind: 'area', value: 'stofa' }, { kind: 'area' }, null, 'nope'],
      empty: [],
      wrong: 'string',
    }));
    expect(el._loadPillFilters('em-intg-pill-filters'))
      .toEqual({ good: [{ kind: 'area', value: 'stofa' }] });
  });
});

describe('_filteredActionsHtml(entityIds)', () => {
  it('is empty with no filter, and names the count when there is one', () => {
    const el = makePillPanel();
    expect(el._filteredActionsHtml([])).toBe('');

    const html = el._filteredActionsHtml(['switch.lamp', 'sensor.rssi']);
    expect(html).toContain('Select 2 entities');
    expect(html).toContain('Enable 2 entities');
    expect(html).toContain('Disable 2 entities');
    expect(html).toContain('data-entity-ids="switch.lamp,sensor.rssi"');

    expect(el._filteredActionsHtml(['switch.lamp'])).toContain('Select 1 entity');
  });
});

describe('integration header pill counts', () => {
  it('counts entities on every pill, with devices only in the Hardware tooltip', () => {
    const el = makePillPanel();
    el.integrationHeaderFilter = {};
    el.expandedIntegrations = new Set();
    el.expandedDevices = new Set();
    el.selectedEntities = new Set();
    const html = el.renderIntegration({
      integration: 'shelly',
      devices: {
        dev_shelly: { entities: [LAMP, RSSI] },
        dev_cloud: { entities: [{ entity_id: 'sensor.cloudy' }] },
      },
    });
    // The hardware pill shows its 2 entities, not its 1 device
    expect(html).toMatch(/data-pill-value="hardware"[^>]*>[^<]*: 2</);
    expect(html).toMatch(/data-pill-value="cloud"[^>]*>[^<]*: 1</);
    // The device count lives in the tooltip
    expect(html).toContain('1 device • 2 entities');
    expect(html).toContain('1 device • 1 entity');
    // Categories count entities too: one switch, one sensor, one diagnostic.
    // Their labels carry an inline icon, so the count is matched loosely.
    expect(html).toMatch(/data-pill-value="controls"[\s\S]{0,400}?: 1</);
    expect(html).toMatch(/data-pill-value="diagnostic"[\s\S]{0,400}?: 1</);
  });
});

describe('integration header pill colours', () => {
  it('gives areas and floors the accent, and labels their own colour', () => {
    const el = makePillPanel();
    el.integrationHeaderFilter = {};
    el.expandedIntegrations = new Set();
    el.expandedDevices = new Set();
    el.selectedEntities = new Set();
    const html = el.renderIntegration({
      integration: 'shelly',
      devices: { dev_shelly: { entities: [LAMP, RSSI] } },
    });
    // Matches .device-area-chip in the Devices view, which is drawn in the accent
    expect(html).toMatch(/data-pill-value="stofa"[^>]*--pill-c:var\(--em-primary\)/);
    expect(html).toMatch(/data-pill-kind="floor"[^>]*--pill-c:var\(--em-primary\)/);
    // A label keeps its HA colour
    const red = el._labelColorCss('red');
    expect(html).toContain(`--pill-c:${red}`);
    // A label with no colour falls back to the accent
    expect(el._labelPillColor('lbl_device')).toBe('var(--em-primary)');
  });
});

describe('active filter summary and banner', () => {
  let el;
  beforeEach(() => {
    el = makePillPanel();
    el.integrationHeaderFilter = {};
    el.deviceHeaderFilter = {};
  });

  it('names each kind of filter in words', () => {
    expect(el._pillFilterLabel({ kind: 'area', value: 'stofa' })).toBe('Stofa');
    expect(el._pillFilterLabel({ kind: 'area', value: '__none__' })).toBe('No area');
    expect(el._pillFilterLabel({ kind: 'floor', value: 'Efri hæð' })).toBe('Efri hæð');
    expect(el._pillFilterLabel({ kind: 'label', value: 'lbl_critical' })).toBe('Critical');
    // The category label carries an inline icon; the chip wants words only
    expect(el._pillFilterLabel({ kind: 'cat', value: 'diagnostic' })).toBe('Diagnostic');
    expect(el._pillFilterLabel({ kind: 'cat', value: 'diagnostic' })).not.toContain('<');
  });

  it('is empty with no filters, and lists removable chips with a count when there are', () => {
    expect(el._filterSummaryHtml('data-integration="shelly"', [], 0, 12)).toBe('');

    const html = el._filterSummaryHtml(
      'data-integration="shelly"',
      [{ kind: 'cat', value: 'diagnostic' }, { kind: 'area', value: 'stofa' }],
      3,
      12,
    );
    expect(html).toContain('Diagnostic');
    expect(html).toContain('Stofa');
    expect(html).toContain('3 of 12 entities');
    expect(html).toContain('pill-clear-one');
    expect(html).toContain('pill-clear-scope');
  });

  it('counts pills and headers in the banner, and says nothing when clear', () => {
    expect(el._activeFiltersBannerHtml()).toBe('');

    el.integrationHeaderFilter = { shelly: [{ kind: 'cat', value: 'diagnostic' }] };
    el.deviceHeaderFilter = {
      dev_shelly: [{ kind: 'area', value: 'stofa' }, { kind: 'label', value: 'lbl_critical' }],
    };
    const banner = el._activeFiltersBannerHtml();
    expect(banner).toContain('3 pill filters active on 2 headers');
    expect(banner).toContain('pill-clear-all');

    el.deviceHeaderFilter = {};
    expect(el._activeFiltersBannerHtml()).toContain('1 pill filter active on 1 header');
  });
});

// ---------------------------------------------------------------------------
// Duplicate-name audit
// ---------------------------------------------------------------------------

/** A panel whose WS calls answer with the given registries. */
function makeAuditPanel(entities, devices) {
  const el = makePanel();
  el._hass.callWS = vi.fn(({ type }) =>
    Promise.resolve(type === 'config/device_registry/list' ? devices : entities));
  return el;
}

const DEVICES = [
  { id: 'dev_dish', name: 'Tafla B Gr.13 Uppþvottavél' },
  { id: 'dev_backup', name: 'Backup' },
  { id: 'dev_screen', name: 'Forstofa skjár app' },
  { id: 'dev_old', name: 'Forstofa skjár' },
];

describe('_nameWords and _startsWithWords', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('folds Icelandic the way the entity IDs are spelled', () => {
    expect(el._nameWords('Tafla B Gr.13 Uppþvottavél'))
      .toEqual(['tafla', 'b', 'gr', '13', 'uppthvottavel']);
    expect(el._nameWords('Baðherbergi Loftljós')).toEqual(['badherbergi', 'loftljos']);
  });

  it('matches whole words only', () => {
    expect(el._startsWithWords(['backup', 'manager', 'state'], ['backup'])).toBe(true);
    expect(el._startsWithWords(['backup', 'manager', 'state'], ['backup', 'manager'])).toBe(true);
    // The prefix must be whole words, not a substring: "back" is not "backup"
    expect(el._startsWithWords(['backup', 'manager'], ['back'])).toBe(false);
    expect(el._startsWithWords(['backup'], ['backup', 'manager'])).toBe(false);
    expect(el._startsWithWords(['anything'], [])).toBe(false);
  });
});

describe('_computeDuplicateNames()', () => {
  it('finds the device name repeated, and what the entity would become', async () => {
    const el = makeAuditPanel([
      {
        entity_id: 'sensor.tafla_b_gr_13_uppthvottavel_power',
        device_id: 'dev_dish',
        has_entity_name: true,
        name: null,
        original_name: 'Tafla B Gr.13 Uppþvottavél power',
      },
      {
        entity_id: 'binary_sensor.tafla_b_gr_13_uppthvottavel_cloud',
        device_id: 'dev_dish',
        has_entity_name: true,
        name: null,
        original_name: 'Cloud',
      },
    ], DEVICES);

    const { doubled, needName, mismatched } = await el._computeDuplicateNames();
    expect(doubled).toHaveLength(1);
    expect(doubled[0].entity_id).toBe('sensor.tafla_b_gr_13_uppthvottavel_power');
    expect(doubled[0].current).toBe('Tafla B Gr.13 Uppþvottavél Tafla B Gr.13 Uppþvottavél power');
    expect(doubled[0].suggested).toBe('power');
    expect(needName).toEqual([]);
    expect(mismatched).toEqual([]);
  });

  it('catches a one-word device name repeated, like HA core Backup', async () => {
    // Verified on live HA: friendly_name really is "Backup Backup Manager state"
    const el = makeAuditPanel([
      {
        entity_id: 'sensor.backup_backup_manager_state',
        device_id: 'dev_backup',
        has_entity_name: true,
        name: null,
        original_name: 'Backup Manager state',
      },
    ], DEVICES);

    const { doubled } = await el._computeDuplicateNames();
    expect(doubled).toHaveLength(1);
    expect(doubled[0].current).toBe('Backup Backup Manager state');
    expect(doubled[0].suggested).toBe('Manager state');
  });

  it('does not flag a device name that is only a partial word', async () => {
    const el = makeAuditPanel([
      {
        entity_id: 'sensor.backpack_weight',
        device_id: 'dev_back',
        has_entity_name: true,
        name: null,
        original_name: 'Backpack weight',
      },
    ], [{ id: 'dev_back', name: 'Back' }]);

    const { doubled } = await el._computeDuplicateNames();
    expect(doubled).toEqual([]);
  });

  it('separates the ones with nothing left after the device name', async () => {
    const el = makeAuditPanel([
      {
        entity_id: 'switch.tafla_b_gr_13_uppthvottavel',
        device_id: 'dev_dish',
        has_entity_name: true,
        name: null,
        original_name: 'Tafla B Gr.13 Uppþvottavél',
      },
    ], DEVICES);

    const { doubled, needName } = await el._computeDuplicateNames();
    expect(doubled).toEqual([]);
    expect(needName).toHaveLength(1);
    expect(needName[0].suggested).toBe('');
  });

  it('reports entities carrying another device name, grouped by device', async () => {
    const el = makeAuditPanel([
      {
        entity_id: 'sensor.forstofa_skjar_battery',
        device_id: 'dev_screen',
        has_entity_name: false,
        name: null,
        original_name: 'Forstofa skjár battery',
      },
      {
        entity_id: 'sensor.forstofa_skjar_wifi',
        device_id: 'dev_screen',
        has_entity_name: false,
        name: null,
        original_name: 'Forstofa skjár wifi',
      },
    ], DEVICES);

    const { mismatched } = await el._computeDuplicateNames();
    expect(mismatched).toHaveLength(1);
    expect(mismatched[0].deviceName).toBe('Forstofa skjár app');
    expect(mismatched[0].groups).toEqual([['Forstofa skjár', 2]]);
  });

  it('ignores entities with no name and entities with no device', async () => {
    const el = makeAuditPanel([
      { entity_id: 'sensor.nameless', device_id: 'dev_dish', has_entity_name: true, name: null, original_name: null },
      { entity_id: 'sensor.loose', device_id: null, has_entity_name: false, name: 'Tafla B Gr.13 Uppþvottavél power', original_name: null },
    ], DEVICES);

    const { doubled, needName, mismatched } = await el._computeDuplicateNames();
    expect(doubled).toEqual([]);
    expect(needName).toEqual([]);
    expect(mismatched).toEqual([]);
  });
});

describe('_suggestEntityName(entity, deviceName)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('uses what is left of the object ID after the device part', () => {
    expect(el._suggestEntityName(
      { entity_id: 'sensor.tafla_h_gr_04_eldhus_power' }, 'Tafla H Gr.04 Eldhús',
    )).toBe('Power');
    expect(el._suggestEntityName(
      { entity_id: 'binary_sensor.tafla_h_gr_04_eldhus_restart_required' }, 'Tafla H Gr.04 Eldhús',
    )).toBe('Restart Required');
  });

  it('falls back to the domain when the entity is the device', () => {
    // A Shelly's main switch: object ID and device name are the same
    expect(el._suggestEntityName(
      { entity_id: 'switch.tafla_h_gr_04_eldhus' }, 'Tafla H Gr.04 Eldhús',
    )).toBe('Switch');
  });

  it('keeps the whole object ID when it does not start with the device name', () => {
    expect(el._suggestEntityName({ entity_id: 'sensor.loose_reading' }, 'Some Device'))
      .toBe('Loose Reading');
  });
});

describe('_entityNameLinesHtml(entity, state)', () => {
  let el;
  beforeEach(() => { el = makePanel(); });

  it('labels each name and shows the friendly one when it differs', () => {
    const html = el._entityNameLinesHtml(
      {
        entity_id: 'sensor.tafla_h_gr_04_eldhus_power',
        original_name: 'power',
        deviceName: 'Tafla H Gr.04 Eldhús',
      },
      { attributes: { friendly_name: 'Tafla H Gr.04 Eldhús power' } },
    );
    expect(html).toContain('>Friendly<');
    expect(html).toContain('Tafla H Gr.04 Eldhús power');
    expect(html).toContain('>Entity<');
    expect(html).not.toContain('>Display<');
  });

  it('shows a set display name alongside the entity name', () => {
    const html = el._entityNameLinesHtml(
      { entity_id: 'switch.lamp', original_name: 'Lamp', name: 'Reading lamp', deviceName: 'Hue' },
      { attributes: { friendly_name: 'Hue Reading lamp' } },
    );
    expect(html).toContain('>Display<');
    expect(html).toContain('Reading lamp');
    expect(html).toContain('>Entity<');
    expect(html).toContain('Lamp');
  });

  it('offers a suggestion when the name only repeats the device', () => {
    const html = el._entityNameLinesHtml(
      {
        entity_id: 'switch.tafla_h_gr_04_eldhus',
        original_name: 'Tafla H Gr.04 Eldhús',
        deviceName: 'Tafla H Gr.04 Eldhús',
      },
      { attributes: { friendly_name: 'Tafla H Gr.04 Eldhús Tafla H Gr.04 Eldhús' } },
    );
    expect(html).toContain('>Suggested<');
    expect(html).toContain('em-name-suggest-btn');
    expect(html).toContain('data-suggestion="Switch"');
  });

  it('offers nothing extra for an ordinary entity', () => {
    const html = el._entityNameLinesHtml(
      { entity_id: 'sensor.rssi', original_name: 'Signal strength', deviceName: 'Hue' },
      { attributes: { friendly_name: 'Hue Signal strength' } },
    );
    expect(html).not.toContain('Suggested');
  });
});
