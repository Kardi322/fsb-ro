(function (root) {
  'use strict';
  const normalize = value => String(value).toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  function searchTerms(query) {
    const forms = { 'взятка': 'взятк', 'оружие': 'оруж', 'наркотики': 'наркот', 'удостоверение': 'удостоверени' };
    return normalize(query).replace(/^(?:статья|ст\.)\s*/, '').split(' ').filter(Boolean).map(t => forms[t] || t);
  }
  function matches(article, query) {
    let q = normalize(query).replace(/^(?:статья|ст\.)\s*/, '');
    if (!q) return true;
    const number = q.match(/^(\d+(?:\.\d+)*)(?:\s|$)/);
    if (number) {
      if (article.number !== number[1] && !article.number.startsWith(number[1] + '.')) return false;
      q = q.slice(number[0].length).trim();
    }
    const text = normalize(article.fullText);
    return searchTerms(q).every(word => text.includes(word));
  }
  function calculate(items, mode, insultException) {
    const prison = items.filter(i => i.type === 'prison');
    const fineItems = items.filter(i => i.type === 'fine');
    const sum = prison.reduce((n, i) => n + i.article.months, 0);
    const maximum = Math.max(0, ...prison.map(i => i.article.months));
    const ordinary = prison.filter(i => !(insultException && i.article.number === '17.3'));
    const insult = prison.filter(i => insultException && i.article.number === '17.3').reduce((n, i) => n + i.article.months, 0);
    const simplified = Math.min(60, Math.max(0, ...ordinary.map(i => i.article.months))) + insult;
    return { sum, maximum, months: mode === 'sum' ? sum : mode === 'simplified' ? simplified : maximum,
      fineSum: fineItems.reduce((n, i) => n + (i.amount == null ? 0 : i.amount), 0),
      unknownFines: fineItems.filter(i => i.amount == null).length,
      fineCount: fineItems.length, record: prison.some(i => i.article.record),
      invalidFine: mode === 'simplified' && fineItems.length > 0,
      hasUpperBound: prison.some(i => !i.article.exactTerm) };
  }
  const api = { normalize, matches, calculate, searchTerms };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RO_LOGIC = api;
})(typeof window !== 'undefined' ? window : globalThis);
