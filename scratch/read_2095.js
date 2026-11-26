const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/ILYAS/.gemini/antigravity/brain/e8631f4b-b8e7-49c4-85b5-e46d5386a5cd/.system_generated/logs/transcript.jsonl', 'utf8');
const lines = transcript.split('\n');
for (const line of lines) {
  if (line.includes('step_index":2095')) {
    const data = JSON.parse(line);
    console.log(data.content);
    break;
  }
}
