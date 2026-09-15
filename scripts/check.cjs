const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const data = context.window.RO_DATA;
const { matches, calculate } = require('../logic.js');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
for (const kind of ['uk','pk','constitution']) {
  const raw = fs.readFileSync(path.join(root, data.sources[kind]), 'utf8');
  const headers = raw.split(/\r?\n/).map(s => s.replace(/[\u200b\ufeff]/g,'').trim()).filter(s => /^Статья\s+\d/.test(s));
  check(headers.length === data[kind].articles.length, kind + ': all article headers imported');
  check(headers.every((h,i) => h === data[kind].articles[i].heading), kind + ': headings in source order');
  check(new Set(data[kind].articles.map(a=>a.id)).size === headers.length, kind + ': unique IDs');
  check(data[kind].articles.every(a => data[kind].chapters.some(c=>c.id===a.chapter)), kind + ': chapter links valid');
}
const uk = n => data.uk.articles.find(a=>a.number===n);
const item = (n,type='prison',amount=null) => ({article:uk(n),type,amount});
check(data.uk.articles.filter(a=>a.special).length === 141, '141 offences');
check(data.uk.articles.filter(a=>a.special).every(a=>a.months && a.sanction && a.priority), 'every offence has a parsed sanction');
check(data.uk.articles.filter(a=>!a.special).length === 49, '49 general articles');
check(uk('10.11').fine && data.uk.articles.filter(a=>a.fine).length===1, 'only explicit fine alternative');
check(uk('17.12.1').exactTerm && !uk('17.13').exactTerm, 'exact term distinction');
check(uk('11.3').additional.length===1 && !uk('11.3').fine, 'tax debt recovery is not fine alternative');
check(uk('11.12').months===30 && uk('11.12').additional.length===1, 'license sanction retained');
check(matches(uk('6.2'),'ст. 6.2') && !matches(uk('16.2'),'6.2'), 'exact number boundary');
check(matches(uk('10.6.1'),'10.6') && matches(uk('5.8'),'судимость'), 'nested and general article search');
check(matches(uk('6.2'),'УБИЙСТВО тяжелой'), 'case and yo insensitive keyword search');
const pair = [item('6.2'),item('6.3')];
check(calculate(pair,'sum').months===90, 'sum 40+50=90');
check(calculate(pair,'maximum').months===50, 'most severe 50');
check(calculate(pair,'simplified').months===50, 'simplified max 50');
const exception = [item('6.3'),item('17.3')];
check(calculate(exception,'simplified',true).months===50+uk('17.3').months, 'insult exception');
check(calculate([item('10.11','fine')],'sum').unknownFines===1, 'unknown fine is not zero');
check(calculate([item('10.11','fine',25000)],'sum').fineSum===25000, 'manual fine');
check(calculate([item('10.11','fine',25000)],'simplified').invalidFine, 'simplified rejects fine');
check(calculate(pair,'sum').record && !calculate([item('6.1')],'sum').record, 'record flag threshold');
check(calculate([],'maximum').months===0, 'empty calculation');
for(const name of ['index.html','styles.css','app.js','logic.js','data.js','favicon.svg','.nojekyll']) check(fs.existsSync(path.join(root,name)),name+' exists');
for(const file of ['app.js','logic.js','data.js']) { new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}); checks++; }
console.log(checks + ' checks passed. All 406 source articles and calculation cases validated.');
