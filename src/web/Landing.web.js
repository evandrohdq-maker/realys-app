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
const MARCA_ESCURA = uri(require('../../assets/wordmark-escuro.png'));
const TOUR = uri(require('../../assets/landing/tour.mp4'));
const TOUR_CAPA = uri(require('../../assets/landing/tour-capa.jpg'));
const APK = 'https://github.com/evandrohdq-maker/realys-app/releases/latest/download/realys-demo.apk';

// Vídeo de apresentação: começa parado com a capa; o visitante dá o play (com som e controles).
function Tour() {
  const v = useRef(null);
  const [tocando, setTocando] = useState(false);
  return (
    <div className="rz-video">
      <video ref={v} src={TOUR} poster={TOUR_CAPA} preload="none" playsInline controls={tocando} onEnded={() => setTocando(false)} />
      {!tocando ? (
        <button
          className="rz-play"
          aria-label="Assistir ao vídeo de apresentação do Realyz"
          onClick={() => {
            setTocando(true);
            v.current && v.current.play().catch(() => {});
          }}
        >
          <span>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#B8860B" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      ) : null}
    </div>
  );
}

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
  ['Shop', 'Marketplace com pagamento em custódia: o valor fica retido e só é liberado ao lojista quando você confirma a entrega.'],
  ['Food', 'Delivery e reservas com rastreio em tempo real. Cada pedido já aciona a entrega na própria plataforma.'],
  ['Serviços', 'Profissionais por geolocalização, com reputação auditada, chamada em minutos e pagamento protegido.'],
  ['Negócios', 'Imóveis, veículos e máquinas com anúncio verificado, tour em vídeo e atendimento ao vivo no Hub de Negócios.'],
  ['Community', 'Rede social sem perfil falso: feed, stories, Reels, mensagens e chamadas de vídeo entre pessoas confirmadas.'],
  ['Stream', 'Lives, rádios e TV online, com presentes que viram renda para quem cria conteúdo.'],
];
const NUMEROS = [
  ['1:1', 'uma pessoa, uma conta: biometria facial bloqueia duplicatas'],
  ['100%', 'dos pagamentos em custódia até a entrega'],
  ['IA', 'assistente por voz que entende, compara e executa'],
  ['24/7', 'avisos em tempo real e notificações push'],
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=Manrope:wght@400;500;700&display=swap');
.rz{position:relative;--ouro:#E0A81A;--ouro-claro:#F2C14E;--marfim:#FBF8F1;--tinta:#14120E;--cinza:#5B564B;
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
.rz-btn.linha{border-color:rgba(20,18,14,.25);color:var(--tinta);background:rgba(255,255,255,.6)}
.rz-btn.linha:hover{border-color:var(--ouro)}
.rz-btn.pequeno{padding:11px 18px;font-size:14px}
.rz-hero{background:radial-gradient(ellipse at 72% 40%,#FFFFFF 0%,#FFF8E4 32%,#F8EBC8 62%,var(--marfim) 100%);color:var(--tinta);position:relative;overflow:hidden;min-height:100vh;display:flex;align-items:center;padding:120px 0 80px}
.rz-hero .rz-wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;width:100%}
.rz-hero h1{font:800 clamp(44px,6.4vw,92px)/.98 Unbounded,sans-serif;letter-spacing:-.02em;margin:0 0 26px}
.rz-hero h1 span{display:block;color:#B8860B}
.rz-hero p{font-size:20px;line-height:1.55;color:var(--cinza);max-width:31em;margin:0 0 34px}
.rz-acoes{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.rz-apk{margin-left:8px;font-weight:700;color:#8A6208!important;text-underline-offset:4px}
.rz-lotus{position:relative;aspect-ratio:1;width:100%;max-width:520px;justify-self:center}
.rz-lotus img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.rz-rays{opacity:.8;filter:sepia(.6) saturate(2.2) hue-rotate(-8deg);animation:rz-gira 60s linear infinite}
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
.rz-escuro{background:linear-gradient(180deg,#FFFDF7 0%,#F6EDD6 100%);color:var(--tinta)}
.rz-escuro .intro{color:var(--cinza)}
.rz-passos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:28px;counter-reset:p}
.rz-passos li{counter-increment:p;border-left:2px solid var(--ouro);padding:4px 0 4px 24px}
.rz-passos li::before{content:counter(p);display:block;font:800 64px/1 Unbounded,sans-serif;color:var(--ouro);margin-bottom:18px}
.rz-passos h3{font:700 22px/1.2 Unbounded,sans-serif;margin:0 0 10px}
.rz-passos p{margin:0;font-size:17px;line-height:1.6;color:var(--cinza)}
.rz-lotus-sec .rz-wrap{display:grid;grid-template-columns:.9fr 1.1fr;gap:64px;align-items:center}
.rz-chat{background:#fff;border-radius:28px;padding:28px;box-shadow:0 30px 60px -30px rgba(20,18,14,.35);display:flex;flex-direction:column;gap:14px;max-width:520px}
.rz-fala{padding:14px 18px;border-radius:20px;font-size:17px;line-height:1.5;max-width:85%}
.rz-fala.eu{align-self:flex-end;background:var(--ouro-claro);color:var(--tinta);border-bottom-right-radius:6px}
.rz-fala.lotus{align-self:flex-start;background:#F6EDD6;border-bottom-left-radius:6px}
.rz-fala b{display:block;font-size:13px;margin-bottom:4px;color:#8A6208}
.rz-final{background:linear-gradient(120deg,#F2C14E 0%,#F8DB8A 50%,#F2C14E 100%);padding:90px 0}
.rz-final .rz-wrap{display:flex;justify-content:space-between;align-items:center;gap:32px;flex-wrap:wrap}
.rz-final h2{font:800 clamp(30px,3.6vw,48px)/1.08 Unbounded,sans-serif;margin:0;max-width:15em;color:#000}
.rz-final .rz-btn{background:#fff;color:var(--tinta);box-shadow:0 10px 30px -12px rgba(138,98,8,.5)}
.rz-final .rz-btn:hover{background:var(--marfim)}
.rz-rodape{background:var(--marfim);border-top:1px solid #EADFC6;color:var(--cinza);padding:48px 0;font-size:15px}
.rz-rodape .rz-wrap{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.rz-rodape img{height:28px}
.rz-rodape button{background:none;border:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:4px;padding:0;margin-left:20px}
.rz-video-sec{padding:100px 0;background:linear-gradient(180deg,var(--marfim) 0%,#FFF8E4 100%)}
.rz-video{position:relative;border-radius:28px;overflow:hidden;box-shadow:0 40px 80px -40px rgba(20,18,14,.45);border:1px solid #EFE6CC;background:#FFF8E4;aspect-ratio:16/9;max-width:1000px;margin:0 auto}
.rz-video video{width:100%;height:100%;display:block;object-fit:cover}
.rz-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(251,248,241,.18);border:0;cursor:pointer;width:100%}
.rz-play span{width:92px;height:92px;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 20px 40px -18px rgba(138,98,8,.6);display:flex;align-items:center;justify-content:center;transition:transform .2s}
.rz-play:hover span{transform:scale(1.07)}
.rz-play svg{margin-left:6px}
.rz-video-sec h2,.rz-video-sec .intro{text-align:center;margin-left:auto;margin-right:auto}
.rz-chip{display:inline-flex;align-items:center;gap:8px;font:700 13px/1 Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8A6208;background:rgba(255,255,255,.7);border:1px solid #EAD7A4;border-radius:999px;padding:9px 14px;margin-bottom:22px}
.rz-chip i{width:8px;height:8px;border-radius:50%;background:#2FB463;box-shadow:0 0 0 4px rgba(47,180,99,.18)}
.rz-nums{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:64px}
.rz-num{background:#fff;border:1px solid #EFE6CC;border-radius:22px;padding:24px}
.rz-num b{display:block;font:800 40px/1 Unbounded,sans-serif;color:#B8860B;margin-bottom:10px}
.rz-num span{font-size:15px;line-height:1.5;color:var(--cinza)}
@media (max-width:860px){.rz-nums{grid-template-columns:1fr 1fr}.rz-video-sec{padding:64px 0}.rz-play span{width:72px;height:72px}}
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
          <img src={MARCA_ESCURA} alt="Realyz" />
          <nav>
            <button className="rz-btn linha pequeno" onClick={() => onEnter('entrar')}>Entrar</button>
            <button className="rz-btn ouro pequeno" onClick={() => onEnter('cadastro')}>Criar conta</button>
          </nav>
        </div>
      </header>

      <section className="rz-hero">
        <div className="rz-wrap">
          <div>
            <div className="rz-chip"><i />Identidade verificada por biometria facial</div>
            <h1>Pessoas reais.<span>Negócios reais.</span></h1>
            <p>O super app que une rede social, marketplace, delivery, serviços e pagamentos com identidade verificada. Cada conta é uma pessoa real, cada pagamento fica em custódia até a entrega, e a IA Lotus resolve tudo por voz.</p>
            <div className="rz-acoes">
              <button className="rz-btn linha" onClick={() => document.getElementById('rz-tour') && document.getElementById('rz-tour').scrollIntoView({ behavior: 'smooth' })}>▶ Ver em 40 segundos</button>
              <button className="rz-btn ouro" onClick={() => onEnter('cadastro')}>Criar minha conta</button>
              <button className="rz-btn linha" onClick={() => onEnter('entrar')}>Entrar</button>
              <a className="rz-apk" href={APK}>Baixar o app para Android</a>
            </div>
          </div>
          <Lotus />
        </div>
      </section>

      <section className="rz-video-sec" id="rz-tour">
        <div className="rz-wrap">
          <h2>Veja o Realyz em 40 segundos.</h2>
          <p className="intro">Um tour pelas telas reais do app: Community, Shop, Food, Serviços, Negócios e a Lotus.</p>
          <Tour />
          <div className="rz-nums">
            {NUMEROS.map(([n, t]) => (
              <div className="rz-num" key={n}><b>{n}</b><span>{t}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="rz-sec">
        <div className="rz-wrap">
          <h2>Um ecossistema. Zero troca de app.</h2>
          <p className="intro">Cada módulo conversa com o outro: um pedido no Food já gera a entrega, uma compra no Shop já aciona o frete, e tudo passa pela mesma carteira digital.</p>
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
          <h2>Confiança por design.</h2>
          <p className="intro">Segurança não é um recurso extra: é a base da plataforma. Três camadas protegem cada interação.</p>
          <ol className="rz-passos">
            <li>
              <h3>KYC com documento</h3>
              <p>CPF para pessoas e CNPJ para empresas, validados no cadastro. Só maiores de 18 anos.</p>
            </li>
            <li>
              <h3>Biometria facial</h3>
              <p>Prova de vida e reconhecimento facial: uma pessoa, uma conta. Dados biométricos criptografados.</p>
            </li>
            <li>
              <h3>Pagamento em custódia</h3>
              <p>O valor fica retido e só é liberado quando você confirma a entrega. Deu problema, o estorno é automático.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="rz-sec rz-lotus-sec">
        <div className="rz-wrap">
          <div>
            <h2>Diga Lotus.</h2>
            <p className="intro">A assistente de voz com inteligência artificial do Realyz entende linguagem natural, compara as melhores opções perto de você e só executa quando você confirmar.</p>
          </div>
          <div className="rz-chat" aria-label="Exemplo de conversa com a Lotus">
            <div className="rz-fala eu">Lotus, preciso de um eletricista ainda hoje.</div>
            <div className="rz-fala lotus"><b>Lotus</b>Achei três perto de você. O primeiro chega em uns 35 minutos e cobra R$ 150 pela visita. Quer ver os outros ou agendo esse?</div>
            <div className="rz-fala eu">Pode agendar.</div>
            <div className="rz-fala lotus"><b>Lotus</b>Pronto! Visita confirmada para hoje. O pagamento fica em custódia até o serviço terminar.</div>
          </div>
        </div>
      </section>

      <section className="rz-final">
        <div className="rz-wrap">
          <h2>Nasce em Passo Fundo. Feito para escalar no Brasil inteiro.</h2>
          <button className="rz-btn" onClick={() => onEnter('cadastro')}>Criar minha conta</button>
        </div>
      </section>

      <footer className="rz-rodape">
        <div className="rz-wrap">
          <img src={MARCA_ESCURA} alt="Realyz" />
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
