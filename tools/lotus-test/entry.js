import { _interpret } from '../../src/screens/VoiceAssistant.js';
import { _initialState } from '../../src/store.js';
const state = { ..._initialState };
const qs = process.argv.slice(2);
for (const q of qs) {
  let r; try { r = _interpret(q, state, () => {}, null, () => true); } catch (e) { r = { err: String(e) }; }
  console.log('\n>>', q);
  console.log('  reply:', r && r.reply);
  if (r && r.go) console.log('  go:', JSON.stringify(r.go));
  if (r && r.nav) console.log('  nav:', JSON.stringify(r.nav));
  if (r && r.list) console.log('  list:', r.list.slice(0,4).map(p=>p.name).join(' | '));
  if (r && r.results) console.log('  results:', r.results.slice(0,5).map(x=>`${x.section}: ${x.title} ${x.go?JSON.stringify(x.go):''}`).join('\n           '));
  console.log('  keys:', Object.keys(r||{}).join(','));
}
