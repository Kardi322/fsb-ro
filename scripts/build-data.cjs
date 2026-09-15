const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const sources = { uk: 'Уголовный кодекс РО.txt', pk: 'Процессуальный кодекс РО.txt', constitution: 'Конституция РО.txt' };

function parse(text, kind) {
  const lines = text.replace(/\r/g, '').split('\n');
  const articles = [], chapters = [];
  let chapter = null, article = null, special = false;
  for (const original of lines) {
    const line = original.replace(/[\u200b\ufeff]/g, '').trim();
    if (/^(ОСОБЕННАЯ|ОБЩАЯ) ЧАСТЬ/i.test(line)) { article = null; continue; }
    if (/^(Глава|РАЗДЕЛ)\s+[IVX\d]+[.\s]/i.test(line)) {
      article = null;
      if (/^Глава/i.test(line)) {
        chapter = { id: `${kind}-chapter-${chapters.length + 1}`, title: line, intro: [] };
        chapters.push(chapter);
      }
      continue;
    }
    const m = line.match(/^Статья\s+(\d+(?:\.\d+)*)(?:\.\s*|\s+|$)(.*)$/);
    if (m) {
      article = { id: `${kind}-${articles.length + 1}`, number: m[1], title: m[2], heading: line, lines: [], chapter: chapter?.id || '', chapterTitle: chapter?.title || '', special: kind === 'uk' && Number(m[1].split('.')[0]) >= 6 };
      articles.push(article);
    } else if (article) article.lines.push(original);
    else if (chapter && line) chapter.intro.push(original);
  }
  for (const a of articles) {
    a.body = a.lines.join('\n').trim(); delete a.lines;
    a.fullText = `${a.heading}\n\n${a.body}`;
    if (kind !== 'uk') continue;
    const department = a.title.match(/^\(([А-ЯA-Z/]+)\)\s*/);
    a.departments = department ? department[1].replace(/C/g, 'С').split('/') : [];
    a.title = a.title.replace(/^\([А-ЯA-Z/]+\)\s*/, '');
    a.priority = Number(a.body.match(/Приоритет розыска\s*[-–]?\s*(\d)/i)?.[1]) || null;
    a.sanction = a.body.match(/^Наказание:\s*(.+)$/m)?.[1] || null;
    a.months = a.sanction ? Number(a.sanction.match(/(\d+)\s+месяц/i)?.[1]) || null : null;
    a.exactTerm = !!a.sanction && /^\d+\s+месяц/i.test(a.sanction);
    a.fine = !!a.sanction && /штраф/i.test(a.sanction);
    a.record = a.sanction ? (/с созданием записи о судимости/i.test(a.sanction) || a.priority >= 4) : null;
    a.additional = [];
    if (/возмещение материального ущерба/i.test(a.sanction || '')) a.additional.push('Полное возмещение материального ущерба');
    if (/изъятие лицензии/i.test(a.sanction || '')) a.additional.push('Изъятие лицензии на рыбную ловлю');
    if (a.number === '11.3') a.additional.push('Взыскание суммы долга в двукратном размере');
    if (a.number === '11.8') a.additional.push('Взыскание суммы штрафа в двукратном размере');
  }
  return { articles, chapters: chapters.filter(c => articles.some(a => a.chapter === c.id)) };
}

const data = { sources, importedAt: '2026-09-15' };
for (const [kind, filename] of Object.entries(sources)) data[kind] = parse(fs.readFileSync(path.join(root, filename), 'utf8'), kind);
fs.writeFileSync(path.join(root, 'data.js'), '/* Generated from the supplied source documents. */\nwindow.RO_DATA = ' + JSON.stringify(data) + ';\n', 'utf8');
for (const kind of Object.keys(sources)) console.log(`${kind}: ${data[kind].articles.length} articles, ${data[kind].chapters.length} chapters`);
const special = data.uk.articles.filter(a => a.special);
console.log(`Special part: ${special.length}; sanctions: ${special.filter(a => a.sanction).length}; fines: ${special.filter(a => a.fine).map(a => a.number).join(', ')}`);
if (special.some(a => !a.sanction || !a.months)) throw new Error('Unparsed special-part sanction');
module.exports = { parse };
