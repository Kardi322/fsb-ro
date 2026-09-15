(function (root) {
  'use strict';
  const topics = [
    { id: 'weapons', label: 'Оружие', pattern: /оруж|боеприпас|взрывчат/i },
    { id: 'drugs', label: 'Наркотики', pattern: /наркот/i },
    { id: 'service', label: 'Госслужба', pattern: /должност|служебн|представител[ья] власти|государственн.*служ|взятк|неподчинение/i },
    { id: 'transport', label: 'ДТП / Транспорт', pattern: /транспорт|дорожн|поезд|колонн|перевозк/i },
    { id: 'assault', label: 'Нападение', pattern: /убийств|нападен|телесн|вреда здоровью|насили|угроз|посягательств|похищен/i }
  ];
  function inTopic(article, id) {
    const topic = topics.find(t => t.id === id);
    return !topic || (article.special && topic.pattern.test(article.title));
  }
  function ranges(text, terms) {
    const plain = text.toLocaleLowerCase('ru').replace(/ё/g, 'е');
    const found = [];
    for (const term of terms.filter(Boolean)) {
      let start = 0, at;
      while ((at = plain.indexOf(term, start)) !== -1) {
        found.push([at, at + term.length]); start = at + term.length;
      }
    }
    found.sort((a,b) => a[0]-b[0] || a[1]-b[1]);
    const merged = [];
    for (const r of found) {
      const last = merged[merged.length-1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([...r]);
    }
    return merged;
  }
  function decode(raw, articles) {
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1) throw new Error('Unsupported saved state');
    const byNumber = new Map(articles.map(a => [a.number, a]));
    const selected = new Map();
    for (const entry of Array.isArray(saved.selected) ? saved.selected : []) {
      const article = byNumber.get(entry?.number);
      if (!article?.months) continue;
      const type = entry.type === 'fine' && article.fine ? 'fine' : 'prison';
      const amount = typeof entry.amount === 'number' && Number.isFinite(entry.amount) && entry.amount >= 0 && entry.amount <= Number.MAX_SAFE_INTEGER ? entry.amount : null;
      selected.set(article.id, { article, type, amount });
    }
    return {
      selected,
      favorites: new Set((Array.isArray(saved.favorites) ? saved.favorites : []).filter(n => byNumber.has(n))),
      mode: ['maximum','sum','simplified'].includes(saved.mode) ? saved.mode : 'maximum',
      exception: saved.exception === true
    };
  }
  function encode(state) {
    return JSON.stringify({ version: 1, mode: state.mode, exception: state.exception,
      selected: [...state.selected.values()].map(i => ({number:i.article.number,type:i.type,amount:i.amount})),
      favorites: [...state.favorites] });
  }
  const api = { topics, inTopic, ranges, decode, encode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RO_FEATURES = api;
})(typeof window !== 'undefined' ? window : globalThis);
