// Página de abertura do site realyz.com.br, para quem chega sem conta.
// Só no navegador (o Metro usa este arquivo na versão web). Botões: criar conta, entrar e baixar o app.
import React, { useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';

const uri = (m) => Asset.fromModule(m).uri;
const BLOOM = [
  require('../../assets/lotus/padrao_bloom_00.webp'), require('../../assets/lotus/padrao_bloom_01.webp'),
  require('../../assets/lotus/padrao_bloom_02.webp'), require('../../assets/lotus/padrao_bloom_03.webp'),
  require('../../assets/lotus/padrao_bloom_04.webp'), require('../../assets/lotus/padrao_bloom_05.webp'),
  require('../../assets/lotus/padrao_bloom_06.webp'), require('../../assets/lotus/padrao_bloom_07.webp'),
].map(uri);
const IDLE = [
  require('../../assets/lotus/padrao_idle_00.webp'), require('../../assets/lotus/padrao_idle_01.webp'),
  require('../../assets/lotus/padrao_idle_02.webp'), require('../../assets/lotus/padrao_idle_03.webp'),
  require('../../assets/lotus/padrao_idle_04.webp'), require('../../assets/lotus/padrao_idle_05.webp'),
].map(uri);
const HALO = uri(require('../../assets/lotus/light_halo.webp'));
const RAYS = uri(require('../../assets/lotus/light_rays.webp'));
const MARCA_CLARA = uri(require('../../assets/wordmark-claro.png'));
const MARCA_ESCURA = uri(require('../../assets/wordmark-escuro.png'));
const APK = 'https://github.com/evandrohdq-maker/realys-app/releases/latest/download/realys-demo.apk';

// A flor da Lotus abrindo: o único movimento da página. Depois fica respirando devagar.
function Lotus() {
  const [frame, setFrame] = useState(BLOOM[0]);
  useEffect(() => {
    const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    [...BLOOM, ...IDLE].forEach((s) => { const i = new window.Image(); i.src = s; });
    if (calm) return setFrame(BLOOM[BLOOM.length - 1]);
    let i = 0;
    let t = setInterval(() => {
      i += 1;
      if (i < BLOOM.length) return setFrame(BLOOM[i]);
      clearInterval(t);
      let j = 0, dir = 1;
      t = setInterval(() => {
        j += dir;
        if (j === IDLE.length - 1 || j === 0) dir = -dir;
        setFrame(IDLE[j]);
      }, 160);
    }, 110);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rz-lotus" aria-hidden="true">
      <img className="rz-rays" src={RAYS} alt="" />
      <img className="rz-halo" src={HALO} alt="" />
      <img className="rz-flor" src={frame} alt="" />
    </div>
  );
}

const AREAS = [
  ['Shop', 'Lojas de verdade, lançamentos e promoções. Pagou, o dinheiro fica protegido até chegar.'],
  ['Food', 'Delivery e reservas de restaurantes, bares e mercados da sua cidade.'],
  ['Serviços', 'Eletricista, diarista, motorista, aulas e atendimento online, com avaliação de quem já contratou.'],
  ['Negócios', 'Imóveis, veículos e máquinas para comprar ou alugar, direto com quem anuncia.'],
  ['Community', 'Stories, depoimentos, mensagens e chamadas com pessoas confirmadas.'],
  ['Stream', 'Rádios, TV online e lives, com presentes para quem cria.'],
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=Manrope:wght@400;500;700&display=swap');
.rz{--ouro:#E0A81A;--ouro-claro:#F2C14E;--marfim:#FBF8F1;--tinta:#14120E;--cinza:#5B564B;
  font-family:Manrope,system-ui,sans-serif;color:var(--tinta);background:var(--marfim);height:100%;overflow-y:auto;overflow-x:hidden;-webkit-font-smoothing:antialiased}
.rz *{box-sizing:border-box}
.rz a{color:inherit}
.rz-wrap{max-width:1180px;margin:0 auto;padding:0 28px}
.rz-top{position:absolute;left:0;right:0;top:0;z-index:2}
.rz-top .rz-wrap{display:flex;align-items:center;justify-content:space-between;height:84px}
.rz-top img{height:34px}
.rz-top nav{display:flex;gap:10px}
.rz-btn{font:700 16px/1 Manrope,sans-serif;border-radius:999px;padding:16px 26px;cursor:pointer;border:2px solid transparent;transition:background .15s,color .15s,border-color .15s;text-decoration:none;display:inline-block}
.rz-btn:focus-visible{outline:3px solid var(--ouro-claro);outline-offset:3px}
.rz-btn.ouro{background:var(--ouro);color:#000}
.rz-btn.ouro:hover{background:var(--ouro-claro)}
.rz-btn.linha{border-color:rgba(251,248,241,.5);color:var(--marfim);background:transparent}
.rz-btn.linha:hover{border-color:var(--marfim)}
.rz-btn.pequeno{padding:11px 18px;font-size:14px}
.rz-hero{background:#000;color:var(--marfim);position:relative;overflow:hidden;min-height:100vh;display:flex;align-items:center;padding:120px 0 80px}
.rz-hero .rz-wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;width:100%}
.rz-hero h1{font:800 clamp(44px,6.4vw,92px)/.98 Unbounded,sans-serif;letter-spacing:-.02em;margin:0 0 26px}
.rz-hero h1 span{display:block;color:var(--ouro-claro)}
.rz-hero p{font-size:20px;line-height:1.55;color:rgba(251,248,241,.78);max-width:31em;margin:0 0 34px}
.rz-acoes{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.rz-apk{margin-left:8px;font-weight:700;color:var(--ouro-claro)!important;text-underline-offset:4px}
.rz-lotus{position:relative;aspect-ratio:1;width:100%;max-width:520px;justify-self:center}
.rz-lotus img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.rz-rays{opacity:.55;animation:rz-gira 60s linear infinite}
.rz-halo{opacity:.9;transform:scale(1.15)}
@keyframes rz-gira{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.rz-rays{animation:none}}
.rz-sec{padding:110px 0}
.rz-sec h2{font:700 clamp(32px,4vw,54px)/1.05 Unbounded,sans-serif;letter-spacing:-.015em;margin:0 0 18px;max-width:16em}
.rz-sec .intro{font-size:19px;line-height:1.6;color:var(--cinza);max-width:36em;margin:0 0 56px}
.rz-areas{display:grid;grid-template-columns:1fr 1fr;column-gap:64px}
.rz-area{border-top:2px solid var(--tinta);padding:24px 0 34px}
.rz-area h3{font:700 28px/1.1 Unbounded,sans-serif;margin:0 0 10px}
.rz-area p{margin:0;font-size:17px;line-height:1.55;color:var(--cinza);max-width:30em}
.rz-escuro{background:#000;color:var(--marfim)}
.rz-escuro .intro{color:rgba(251,248,241,.7)}
.rz-passos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:28px;counter-reset:p}
.rz-passos li{counter-increment:p;border-left:2px solid var(--ouro);padding:4px 0 4px 24px}
.rz-passos li::before{content:counter(p);display:block;font:800 64px/1 Unbounded,sans-serif;color:var(--ouro);margin-bottom:18px}
.rz-passos h3{font:700 22px/1.2 Unbounded,sans-serif;margin:0 0 10px}
.rz-passos p{margin:0;font-size:17px;line-height:1.6;color:rgba(251,248,241,.75)}
.rz-lotus-sec .rz-wrap{display:grid;grid-template-columns:.9fr 1.1fr;gap:64px;align-items:center}
.rz-chat{background:#fff;border-radius:28px;padding:28px;box-shadow:0 30px 60px -30px rgba(20,18,14,.35);display:flex;flex-direction:column;gap:14px;max-width:520px}
.rz-fala{padding:14px 18px;border-radius:20px;font-size:17px;line-height:1.5;max-width:85%}
.rz-fala.eu{align-self:flex-end;background:var(--tinta);color:var(--marfim);border-bottom-right-radius:6px}
.rz-fala.lotus{align-self:flex-start;background:#F6EDD6;border-bottom-left-radius:6px}
.rz-fala b{display:block;font-size:13px;margin-bottom:4px;color:#8A6208}
.rz-final{background:var(--ouro);padding:90px 0}
.rz-final .rz-wrap{display:flex;justify-content:space-between;align-items:center;gap:32px;flex-wrap:wrap}
.rz-final h2{font:800 clamp(30px,3.6vw,48px)/1.08 Unbounded,sans-serif;margin:0;max-width:15em;color:#000}
.rz-final .rz-btn{background:#000;color:var(--marfim)}
.rz-final .rz-btn:hover{background:var(--tinta)}
.rz-rodape{background:#000;color:rgba(251,248,241,.65);padding:48px 0;font-size:15px}
.rz-rodape .rz-wrap{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.rz-rodape img{height:28px}
.rz-rodape button{background:none;border:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:4px;padding:0;margin-left:20px}
@media (max-width:860px){
  .rz-hero{padding-top:100px;min-height:auto}
  .rz-hero .rz-wrap,.rz-lotus-sec .rz-wrap{grid-template-columns:1fr}
  .rz-lotus{max-width:340px;order:-1}
  .rz-areas{grid-template-columns:1fr}
  .rz-passos{grid-template-columns:1fr}
  .rz-sec{padding:72px 0}
  .rz-top nav .rz-btn.linha{display:none}
}
`;

export default function Landing({ onEnter }) {
  const ref = useRef(null);
  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Realyz: pessoas reais, negócios reais';
  }, []);
  return (
    <div className="rz" ref={ref}>
      <style>{CSS}</style>
      <header className="rz-top">
        <div className="rz-wrap">
          <img src={MARCA_CLARA} alt="Realyz" />
          <nav>
            <button className="rz-btn linha pequeno" onClick={() => onEnter('entrar')}>Entrar</button>
            <button className="rz-btn ouro pequeno" onClick={() => onEnter('cadastro')}>Criar conta</button>
          </nav>
        </div>
      </header>

      <section className="rz-hero">
        <div className="rz-wrap">
          <div>
            <h1>Pessoas reais.<span>Negócios reais.</span></h1>
            <p>Compre, contrate, venda e converse num app só. Todo mundo aqui confirmou o rosto no cadastro, e o seu dinheiro só chega a quem vendeu depois que você recebe.</p>
            <div className="rz-acoes">
              <button className="rz-btn ouro" onClick={() => onEnter('cadastro')}>Criar minha conta</button>
              <button className="rz-btn linha" onClick={() => onEnter('entrar')}>Entrar</button>
              <a className="rz-apk" href={APK}>Baixar o app para Android</a>
            </div>
          </div>
          <Lotus />
        </div>
      </section>

      <section className="rz-sec">
        <div className="rz-wrap">
          <h2>O seu dia inteiro, sem trocar de app.</h2>
          <p className="intro">Do almoço ao eletricista, da roupa nova ao apartamento para alugar. Cada área com lojas e profissionais confirmados.</p>
          <div className="rz-areas">
            {AREAS.map(([t, d]) => (
              <div className="rz-area" key={t}>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rz-sec rz-escuro">
        <div className="rz-wrap">
          <h2>Aqui não entra perfil falso.</h2>
          <p className="intro">A segurança vem antes de tudo. É assim que cada compra e cada contratação fica protegida.</p>
          <ol className="rz-passos">
            <li>
              <h3>Cadastro com documento</h3>
              <p>CPF para pessoas e CNPJ para empresas. Só maiores de 18 anos.</p>
            </li>
            <li>
              <h3>Rosto confirmado</h3>
              <p>A biometria confere que você é você. Quem tenta criar outra conta é barrado.</p>
            </li>
            <li>
              <h3>Pagamento protegido</h3>
              <p>O valor fica retido pelo Realyz e só é liberado quando você confirma a entrega. Deu problema, o dinheiro volta.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="rz-sec rz-lotus-sec">
        <div className="rz-wrap">
          <div>
            <h2>Diga Lotus.</h2>
            <p className="intro">A assistente do Realyz entende o que você precisa, mostra as opções e só confirma quando você mandar.</p>
          </div>
          <div className="rz-chat" aria-label="Exemplo de conversa com a Lotus">
            <div className="rz-fala eu">Lotus, preciso de um eletricista ainda hoje.</div>
            <div className="rz-fala lotus"><b>Lotus</b>Achei três perto de você. O primeiro chega em uns 35 minutos e cobra R$ 150 pela visita. Quer ver os outros ou agendo esse?</div>
            <div className="rz-fala eu">Pode agendar.</div>
            <div className="rz-fala lotus"><b>Lotus</b>Quer que eu confirme a visita para hoje?</div>
          </div>
        </div>
      </section>

      <section className="rz-final">
        <div className="rz-wrap">
          <h2>Começando por Passo Fundo, para o Brasil inteiro.</h2>
          <button className="rz-btn" onClick={() => onEnter('cadastro')}>Criar minha conta</button>
        </div>
      </section>

      <footer className="rz-rodape">
        <div className="rz-wrap">
          <img src={MARCA_CLARA} alt="Realyz" />
          <div>
            realyz.com.br
            <button onClick={() => onEnter('entrar')}>Entrar</button>
            <a href={APK} style={{ marginLeft: 20 }}>App Android</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
