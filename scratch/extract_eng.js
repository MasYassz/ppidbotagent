const fs = require('fs');
const path = 'C:/Users/ILYAS/.gemini/antigravity/brain/e8631f4b-b8e7-49c4-85b5-e46d5386a5cd/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');
lines.forEach(l => {
  if (l.includes('public information foreigner')) {
    const obj = JSON.parse(l);
    console.log(obj.content);
  }
});
