// Shared by index.html (the sections) and payments.js (the payments page).
// A small Markdown reader for the section files: paragraphs (separated by a
// blank line), headings (# ...), centered names (## ..., with the lines
// right under it centered too), lists (- ... or 1. ...), **bold**,
// *italic*, ***both***, [links](https://... or page.html), pictures (![words](assets/x.jpg)),
// words pushed into the middle of the page (-> on its own line to start,
// <- to end, or -> one line <- on its own),
// two columns either side of a gutter (Role — Name, for a cast list),
// and \ before a character to show it as it is. Everything else is shown
// as plain text (no HTML). An empty line starts a new paragraph, and each
// further empty line adds a blank line's worth of space.
function markdownToHtml(md) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const BREAK = '\u0001';
  function inline(text) {
    const kept = [];
    let t = text.replace(/\\([!-\/:-@\[-`{-~])/g, (_, c) => '\u0000' + (kept.push(c) - 1) + '\u0000');
    t = esc(t);
    // Pictures: a file on this site (assets/...) or an https:// address.
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (all, alt, src) => {
      if (/^[a-z][\w+.-]*:/i.test(src) && !/^https:/i.test(src)) return alt;
      return '<img class="md-image" src="' + src + '" alt="' + alt + '" loading="lazy">';
    });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, label, url) => {
      // Web addresses, email, phone, or a page on this site (payments.html).
      // Anything else with a scheme (javascript: and so on) is dropped.
      if (/^[a-z][\w+.-]*:/i.test(url) && !/^(https?:|mailto:|tel:)/i.test(url)) return label;
      const newTab = /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${url}"${newTab}>${label}</a>`;
    });
    t = t.replace(/\*\*\*(?!\s)(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    t = t.replace(/\*\*(?!\s)(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>');
    t = t.replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => esc(kept[i])).split(BREAK).join('<br>');
  }
  const out = [];
  let para = [], list = null, pairs = null;
  let centered = false; // under a ## name, until the next blank line
  let centering = false; // between -> and <-, however many paragraphs that is
  const middle = (extra) => {
    const names = [extra, (centered || centering) ? 'centered' : ''].filter(Boolean).join(' ');
    return names ? ' class="' + names + '"' : '';
  };
  // Empty lines. One ends a paragraph, as usual; each further one adds a
  // blank line's worth of space, so pressing Enter a few times spaces
  // things out the way it looks in the file. They're only added once
  // something follows, so empty lines at the end change nothing.
  let blanks = 0;
  const spaceOut = () => {
    for (let i = 1; i < blanks; i++) out.push('<p class="md-space"></p>');
    blanks = 0;
  };
  const flushPara = () => {
    if (para.length) out.push('<p' + middle() + '>' + inline(para.join('\n').replace(/ {2,}\n/g, BREAK).replace(/\n/g, ' ')) + '</p>');
    para = [];
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.tag}` + middle(list.loose ? 'spaced' : '') + '>' +
        list.items.map((li) => '<li>' + inline(li) + '</li>').join('') + `</${list.tag}>`);
    }
    list = null;
  };
  // Lines set in two columns either side of a gutter, for a cast list.
  const flushPairs = () => {
    if (pairs && pairs.length > 1) {
      // The separator stands in the gutter between the two. It's left empty
      // here and filled in by the stylesheet from TWO_COLUMN_DASH, so the
      // mark is whatever the settings say — or nothing at all. It's kept
      // from being read aloud either way: it's a mark between two columns,
      // not a word in the list.
      out.push('<div' + middle('pairs') + '>' + pairs.map((two) =>
        '<p class="pair-left">' + inline(two[0]) + '</p>' +
        '<p class="pair-dash" aria-hidden="true"></p>' +
        '<p class="pair-right">' + inline(two[1]) + '</p>').join('') + '</div>');
    } else if (pairs) {
      // A single one is a line of words that happens to hold a dash.
      out.push('<p' + middle() + '>' + inline(pairs[0][0] + ' \u2014 ' + pairs[0][1]) + '</p>');
    }
    pairs = null;
  };
  // Whatever block is open, closed, so another can start.
  const flushAll = () => { flushPara(); flushList(); flushPairs(); };
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    let m;
    if (!line) { flushPara(); centered = false; blanks++; continue; }
    // Words pushed into the middle of the page: -> on its own line starts,
    // <- ends it, and anything between them is centered, however many
    // paragraphs, headings or lists that is. One line on its own can be
    // written -> like this <- instead.
    if ((m = line.match(/^->\s+(.*?)\s+<-$/))) {
      flushAll(); spaceOut(); centered = false;
      out.push('<p class="centered">' + inline(m[1]) + '</p>');
      continue;
    }
    if (line === '->' || line === '<-') {
      flushAll(); centered = false;
      centering = line === '->';
      continue;
    }
    if (/^([-*_])( ?\1){2,}$/.test(line)) { flushAll(); spaceOut(); centered = false; continue; }
    if ((m = line.match(/^##\s+(.*?)\s*#*$/))) {
      flushAll(); spaceOut();
      out.push('<h3 class="name">' + inline(m[1]) + '</h3>');
      centered = true;
      continue;
    }
    if ((m = line.match(/^#{1,6}\s+(.*?)\s*#*$/))) { flushAll(); spaceOut(); centered = false; out.push('<h3' + middle() + '>' + inline(m[1]) + '</h3>'); continue; }
    // A picture on a line of its own sits on its own, centered.
    if (/^!\[[^\]]*\]\([^)\s]+\)$/.test(line)) { flushAll(); spaceOut(); out.push('<p class="picture">' + inline(line) + '</p>'); continue; }
    // Something built separately, named between exclamation marks on a line
    // of its own (!map!). It stands apart from the words around it whether
    // or not a blank line was left before it. A name nothing is listed
    // under is left as the words it is.
    if (/^![A-Za-z0-9_-]+!$/.test(line)) { flushAll(); spaceOut(); out.push('<p>' + esc(line) + '</p>'); continue; }
    if ((m = line.match(/^([-*+]|\d+[.)])\s+(.*)$/))) {
      flushPara(); flushPairs();
      const tag = /\d/.test(m[1]) ? 'ol' : 'ul';
      if (list && list.tag !== tag) flushList();
      if (list && blanks) list.loose = true; // empty line between items
      if (!list) spaceOut();
      blanks = 0;
      if (!list) list = { tag, items: [] };
      list.items.push(m[2]);
      continue;
    }
    if (list && !blanks && /^\s/.test(raw)) { list.items[list.items.length - 1] += ' ' + line; continue; }
    // Two columns with a gutter down the middle, for a cast list: what comes
    // before the em dash is set against the gutter, what comes after runs on
    // from it. The dash marks the split and isn't shown.
    //
    // It takes two such lines to make a list, with or without empty lines
    // between them, and they have to start one: a dash in the middle of a
    // sentence, or partway through a paragraph, is only ever a dash.
    if (!para.length && (m = line.match(/^(\S.*?) +\u2014 +(\S.*)$/))) {
      if (!pairs) { flushList(); spaceOut(); pairs = []; }
      blanks = 0;
      pairs.push([m[1], m[2]]);
      continue;
    }
    flushList(); flushPairs();
    if (!para.length) spaceOut();
    para.push(raw.replace(/^\s+/, ''));
  }
  flushAll();
  return out.join('\n');
}

// A line of its own written as !name! (in a section or page file) stands for
// something built separately: a drawing, a wheel, a map. The name is looked
// up in the EMBEDS setting, and what comes back is shown in a frame of its
// own, so whatever styling it carries can't reach the rest of the page.
function withEmbeds(html, embeds, height, canTouch, wakeLabel) {
  const touchable = new Set((canTouch || []).map((name) => String(name)));
  const label = String(wakeLabel == null ? 'Click to use' : wakeLabel);
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return html.replace(/<p>!([A-Za-z0-9_-]+)!<\/p>/g, (all, name) => {
    const file = embeds && embeds[name];
    if (!file) return all; // no such name: leave the words as they are
    const touch = touchable.has(name);
    // Something you can use may need to open a map or a page of its own;
    // something only to look at is given no way out of its frame.
    const sandbox = touch ? 'allow-scripts allow-popups allow-popups-to-escape-sandbox' : 'allow-scripts';
    const frame = '<iframe class="embed" src="' + esc(file) +
      '" title="' + esc(name) + '" loading="lazy" scrolling="no" sandbox="' + sandbox + '"' +
      ' style="height: ' + Number(height || 420) + 'px"></iframe>';
    if (!touch) return frame;
    return '<span class="embed-holder">' + frame +
      '<button type="button" class="embed-wake"><span>' + esc(label) + '</span></button></span>';
  });
}

// An embed you can use stays out of the way until it's clicked, and steps
// back out of the way once the pointer leaves it. That way the page scrolls
// past it as it would past anything else, and a stray roll of the wheel is
// never taken by the thing in the frame instead.
document.addEventListener('click', (event) => {
  const wake = event.target.closest && event.target.closest('.embed-wake');
  if (wake) wake.parentElement.classList.add('awake');
});
document.addEventListener('pointerout', (event) => {
  const holder = event.target.closest && event.target.closest('.embed-holder.awake');
  if (holder && !holder.contains(event.relatedTarget)) holder.classList.remove('awake');
});
// On a phone the pointer never leaves anything, so moving the page along is
// taken as being done with it.
window.addEventListener('scroll', () => {
  for (const holder of document.querySelectorAll('.embed-holder.awake')) holder.classList.remove('awake');
}, { passive: true });
