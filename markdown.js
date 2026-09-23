// Shared by index.html (the sections) and payments.js (the payments page).
// A small Markdown reader for the section files: paragraphs (separated by a
// blank line), headings (# ...), centered names (## ..., with the lines
// right under it centered too), lists (- ... or 1. ...), **bold**,
// *italic*, ***both***, [links](https://... or page.html), pictures (![words](assets/x.jpg)),
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
  let para = [], list = null;
  let centered = false; // under a ## name, until the next blank line
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
    if (para.length) out.push((centered ? '<p class="centered">' : '<p>') + inline(para.join('\n').replace(/ {2,}\n/g, BREAK).replace(/\n/g, ' ')) + '</p>');
    para = [];
  };
  const flushList = () => {
    if (list) {
      const open = list.loose ? `<${list.tag} class="spaced">` : `<${list.tag}>`;
      out.push(open + list.items.map((li) => '<li>' + inline(li) + '</li>').join('') + `</${list.tag}>`);
    }
    list = null;
  };
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    let m;
    if (!line) { flushPara(); centered = false; blanks++; continue; }
    if (/^([-*_])( ?\1){2,}$/.test(line)) { flushPara(); flushList(); spaceOut(); centered = false; continue; }
    if ((m = line.match(/^##\s+(.*?)\s*#*$/))) {
      flushPara(); flushList(); spaceOut();
      out.push('<h3 class="name">' + inline(m[1]) + '</h3>');
      centered = true;
      continue;
    }
    if ((m = line.match(/^#{1,6}\s+(.*?)\s*#*$/))) { flushPara(); flushList(); spaceOut(); centered = false; out.push('<h3>' + inline(m[1]) + '</h3>'); continue; }
    // A picture on a line of its own sits on its own, centered.
    if (/^!\[[^\]]*\]\([^)\s]+\)$/.test(line)) { flushPara(); flushList(); spaceOut(); out.push('<p class="picture">' + inline(line) + '</p>'); continue; }
    // Something built separately, named between exclamation marks on a line
    // of its own (!map!). It stands apart from the words around it whether
    // or not a blank line was left before it. A name nothing is listed
    // under is left as the words it is.
    if (/^![A-Za-z0-9_-]+!$/.test(line)) { flushPara(); flushList(); spaceOut(); out.push('<p>' + esc(line) + '</p>'); continue; }
    if ((m = line.match(/^([-*+]|\d+[.)])\s+(.*)$/))) {
      flushPara();
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
    flushList();
    if (!para.length) spaceOut();
    para.push(raw.replace(/^\s+/, ''));
  }
  flushPara();
  flushList();
  return out.join('\n');
}

// A line of its own written as !name! (in a section or page file) stands for
// something built separately: a drawing, a wheel, a map. The name is looked
// up in the EMBEDS setting, and what comes back is shown in a frame of its
// own, so whatever styling it carries can't reach the rest of the page.
function withEmbeds(html, embeds, height) {
  return html.replace(/<p>!([A-Za-z0-9_-]+)!<\/p>/g, (all, name) => {
    const file = embeds && embeds[name];
    if (!file) return all; // no such name: leave the words as they are
    return '<iframe class="embed" src="' + String(file).replace(/"/g, '&quot;') +
      '" title="' + name + '" loading="lazy" scrolling="no" sandbox="allow-scripts"' +
      ' style="height: ' + Number(height || 420) + 'px"></iframe>';
  });
}
