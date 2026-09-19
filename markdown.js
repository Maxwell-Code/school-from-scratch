// Shared by index.html (the sections) and payments.js (the payments page).
// A small Markdown reader for the section files: paragraphs (separated by a
// blank line), headings (# ...), centered names (## ..., with the lines
// right under it centered too), lists (- ... or 1. ...), **bold**,
// *italic*, ***both***, [links](https://... or page.html), pictures (![words](images/x.jpg)),
// and \ before a character to show it as it is. Everything else is shown
// as plain text (no HTML).
function markdownToHtml(md) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const BREAK = '\u0001';
  function inline(text) {
    const kept = [];
    let t = text.replace(/\\([!-\/:-@\[-`{-~])/g, (_, c) => '\u0000' + (kept.push(c) - 1) + '\u0000');
    t = esc(t);
    // Pictures: a file on this site (images/...) or an https:// address.
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
  const flushPara = () => {
    if (para.length) out.push((centered ? '<p class="centered">' : '<p>') + inline(para.join('\n').replace(/ {2,}\n/g, BREAK).replace(/\n/g, ' ')) + '</p>');
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>` + list.items.map((li) => '<li>' + inline(li) + '</li>').join('') + `</${list.tag}>`);
    list = null;
  };
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    let m;
    if (!line || /^([-*_])( ?\1){2,}$/.test(line)) { flushPara(); flushList(); centered = false; continue; }
    if ((m = line.match(/^##\s+(.*?)\s*#*$/))) {
      flushPara(); flushList();
      out.push('<h3 class="name">' + inline(m[1]) + '</h3>');
      centered = true;
      continue;
    }
    if ((m = line.match(/^#{1,6}\s+(.*?)\s*#*$/))) { flushPara(); flushList(); centered = false; out.push('<h3>' + inline(m[1]) + '</h3>'); continue; }
    // A picture on a line of its own sits on its own, centered.
    if (/^!\[[^\]]*\]\([^)\s]+\)$/.test(line)) { flushPara(); flushList(); out.push('<p class="picture">' + inline(line) + '</p>'); continue; }
    if ((m = line.match(/^([-*+]|\d+[.)])\s+(.*)$/))) {
      flushPara();
      const tag = /\d/.test(m[1]) ? 'ol' : 'ul';
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push(m[2]);
      continue;
    }
    if (list && /^\s/.test(raw)) { list.items[list.items.length - 1] += ' ' + line; continue; }
    flushList();
    para.push(raw.replace(/^\s+/, ''));
  }
  flushPara();
  flushList();
  return out.join('\n');
}
