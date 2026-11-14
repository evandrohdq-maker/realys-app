// Testa as respostas da Lotus no computador, sem celular.
// Uso: node tools/lotus-test/build.cjs && node tools/lotus-test/out.cjs "tênis" "agrônomo"
const esbuild = require(process.env.ESBUILD || 'esbuild');
const stub = { name: 'stub', setup(b) {
  b.onResolve({ filter: /^(react-native|expo-.*|@expo\/.*|@react-native.*|react-native-.*)$/ }, a => ({ path: a.path, namespace: 'stub' }));
  b.onResolve({ filter: /\.(png|jpg|webp|ttf|onnx|bin|mp4|mp3)$/ }, a => ({ path: a.path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `
    const N = ${JSON.stringify(require(__dirname + '/names.json'))};
    const f = function(){ return P; };
    const P = new Proxy(f, { get: (t,k) => k==='OS'?'android': k==='select'?(o=>o.android||o.default): k===Symbol.toPrimitive?(()=>''):P, apply: () => P, construct: () => ({}) });
    const M = { default: P, __esModule: true }; for (const n of N) M[n] = P; M.Platform = { OS: 'android', select: o => o.android || o.default };
    module.exports = M;`, loader: 'js' }));
}};
esbuild.build({ entryPoints: [__dirname + '/entry.js'], bundle: true, platform: 'node', format: 'cjs', outfile: __dirname + '/out.cjs', nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean), plugins: [stub], loader: { '.js': 'jsx' }, jsx: 'transform', logLevel: 'error' }).catch(e => { process.exit(1); });
