const fs = require('fs');
const content = fs.readFileSync('scratch/update_faq.js', 'utf8');

const vm = require('vm');
const sandbox = { module: {}, exports: {}, require: require, console: console, __dirname: __dirname };
vm.createContext(sandbox);
vm.runInContext(content, sandbox);
const list = sandbox.updatedFaqList;
console.log('Total items in update_faq.js:', list.length);

const targets = ['pkpn', 'ekonomi biru', 'kendala sicefi', 'wilayah knmp', 'jadwal knmp'];
targets.forEach(t => {
  const item = list.find(f => f.keywords && f.keywords.includes(t));
  if (item) {
    console.log(`=== ${t} ===`);
    console.log(JSON.stringify(item, null, 2));
  } else {
    console.log(`NOT FOUND: ${t}`);
  }
});
