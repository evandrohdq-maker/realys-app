// Páginas fixas do site (realyz.com.br), geradas a cada envio do site (build-web.yml):
//   /pioneiro.html     Seja Pioneiro (empresas)        → tools/site/paginas/pioneiro.html
//   /entregador.html   Entregador Pioneiro              → tools/site/paginas/entregador.html
//   /termos.html       Termo de Adesão e Termo da Empresa (o mesmo texto do app: server/src/termos.js)
//   /privacidade.html  Política de Privacidade          (texto abaixo)
// Uso: node tools/site/gerar-paginas.mjs dist
import { readFileSync, writeFileSync, copyFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TERMO_ADESAO, TERMO_EMPRESA } from '../../server/src/termos.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = process.argv[2] || 'dist';
mkdirSync(destino, { recursive: true });

// ── Quem é o responsável pelos dados (preencher antes do lançamento) ──
// Nome empresarial e CNPJ da empresa que opera o Realyz, e o e-mail para assuntos de dados pessoais.
// Enquanto estiverem vazios, a página mostra só o canal de suporte do app.
const CONTROLADOR = {
  nome: 'Realyz',
  cnpj: '', // ex.: '00.000.000/0001-00'
  email: '', // ex.: 'privacidade@realyz.com.br'
  cidade: 'Passo Fundo (RS)',
};
const ATUALIZADA = '25 de novembro de 2026';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pagina = (titulo, corpo) => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Realyz</title><link rel="icon" href="/assets/assets/icon.png"><link rel="stylesheet" href="/pioneiro.css">
<style>main section{margin:0}h2{font-size:17px;margin:22px 0 6px}p,li{color:#3A362E}.doc{background:#fff;border-radius:18px;padding:20px 18px;box-shadow:0 2px 14px rgba(122,88,6,.08)}.indice a{color:#7A5806}</style>
</head><body>
<header class="topo"><a href="/" class="marca">REALYZ</a><span><a href="/termos.html" class="lnk">Termos</a> · <a href="/privacidade.html" class="lnk">Privacidade</a></span></header>
<main><div class="doc">${corpo}</div></main>
<footer>Realyz · Pessoas reais. Negócios reais.</footer></body></html>`;

// ── Termos (mesmo texto que a pessoa aceita no app) ──
const termo = (t) => `<h1>${esc(t.titulo)}</h1><p class="nota">Versão ${esc(t.versao)} · atualizado em ${esc(t.atualizado || ATUALIZADA)}</p>` +
  t.itens.map((i) => `<h2>${esc(i.titulo)}</h2><p>${esc(i.texto)}</p>`).join('');
writeFileSync(join(destino, 'termos.html'), pagina('Termos de uso', termo(TERMO_ADESAO) + '<hr style="margin:30px 0;border:0;border-top:1px solid #F0E9DA">' + termo(TERMO_EMPRESA)));

// ── Política de Privacidade ──
const contato = CONTROLADOR.email
  ? `pelo e-mail <a href="mailto:${esc(CONTROLADOR.email)}">${esc(CONTROLADOR.email)}</a> ou pelo Suporte dentro do app`
  : 'pelo Suporte dentro do app (Perfil › Suporte)';
const P = [
  ['1. Quem cuida dos seus dados', `O Realyz${CONTROLADOR.cnpj ? `, ${esc(CONTROLADOR.nome)}, CNPJ ${esc(CONTROLADOR.cnpj)},` : ''} com sede em ${esc(CONTROLADOR.cidade)}, é o controlador dos dados pessoais tratados no aplicativo e no site realyz.com.br, nos termos da Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Esta política explica quais dados usamos, para quê, com quem compartilhamos e como você exerce os seus direitos. Ela complementa o Termo de Adesão (realyz.com.br/termos.html).`],
  ['2. Dados que coletamos', 'Cadastro: nome, CPF ou CNPJ, data de nascimento, e-mail, nome de usuário e senha (guardada só como código, nunca o texto da senha). Identidade: foto do documento e do rosto no cadastro biométrico; o rosto vira um código matemático criptografado e as fotos são apagadas logo após a análise. Voz do dono (opcional): fica só no seu celular. Localização: quando você permite, para mostrar o que está perto, acompanhar entregas e corridas e enviar sua posição no SOS. Conteúdo: o que você publica, suas mensagens, avaliações e depoimentos. Pagamentos: pedidos, valores, carteira e dados necessários para o Pix e as notas fiscais (não guardamos senha de banco nem número de cartão). Aparelho e uso: código do aparelho, código de notificações, versão do app e registros de acesso (data, hora e endereço IP). No site, os formulários de Pioneiro recebem o nome da empresa ou o seu nome, CNPJ, WhatsApp, e-mail e a área de atuação.'],
  ['3. Para que usamos', 'Criar e proteger a sua conta e impedir perfis falsos; confirmar que é você nas compras, contratações, saques e no trabalho de entregadores e motoristas; fazer os pedidos, serviços, corridas, entregas e pagamentos funcionarem; guardar o pagamento até a confirmação (Garantia Realyz); mostrar lojas, prestadores e conteúdos perto de você; enviar notificações; atender o suporte e analisar denúncias; prevenir golpes e fraudes; emitir notas e cumprir obrigações legais; e entrar em contato com quem pediu uma vaga de Pioneiro. Não vendemos os seus dados. O conteúdo das suas conversas privadas não é usado para anúncios nem para treinar a Lotus.'],
  ['4. Bases legais', 'Usamos os dados para executar o contrato com você (o Termo de Adesão), para cumprir obrigações legais e regulatórias (por exemplo, notas fiscais e a guarda dos registros de acesso exigida pelo Marco Civil da Internet), para proteger o crédito e prevenir fraudes, por legítimo interesse (segurança da plataforma e melhoria do app, sempre respeitando os seus direitos) e com o seu consentimento quando a lei exige. Os dados biométricos (rosto e voz) são dados sensíveis e só são tratados com o seu consentimento específico, dado no cadastro, e para a prevenção à fraude e a segurança do titular.'],
  ['5. Com quem compartilhamos', 'Com a outra parte de cada negócio, só o necessário (por exemplo, o endereço de entrega com a loja e o entregador, o primeiro nome e a posição com o motorista); com os parceiros que fazem o app funcionar: a empresa que hospeda os servidores do Realyz, o serviço de notificações do Google (Firebase Cloud Messaging), o banco ou a instituição de pagamento que processa o Pix e o serviço de envio de e-mails; com autoridades, quando a lei ou uma ordem judicial exigir; e, no SOS, com os serviços de emergência que você chamar. Cada parceiro só recebe o que precisa para o serviço dele.'],
  ['6. Dados fora do Brasil', 'Alguns parceiros (hospedagem dos servidores e notificações) podem guardar ou processar dados fora do Brasil. Nesses casos, usamos parceiros que oferecem proteção compatível com a LGPD e cláusulas contratuais de proteção de dados, como prevê o artigo 33 da lei.'],
  ['7. Por quanto tempo guardamos', 'Enquanto a sua conta existir e pelo tempo necessário para cada finalidade. Fotos da verificação: apagadas logo após a análise (revisões paradas por mais de 30 dias são recusadas e as fotos apagadas). Registros de acesso: 6 meses (Marco Civil da Internet). Registros de auditoria das verificações, sem imagens: até 5 anos. Dados fiscais e de pagamentos: pelo prazo da legislação fiscal. Conversas de grupos e salas: limpas periodicamente, com aviso antes. Pedidos de vaga de Pioneiro que não fecharem: apagados até 12 meses depois do lançamento. Ao excluir a conta, apagamos ou tornamos anônimo o que não precisa ser guardado por lei.'],
  ['8. Segurança', 'Usamos criptografia, controle de acesso, verificação em duas etapas para a equipe, cópias de segurança e a conferência do rosto em ações importantes. Nenhum sistema é totalmente livre de riscos; se houver um incidente que possa causar dano relevante, avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD), como manda a lei.'],
  ['9. Seus direitos', `Você pode pedir a confirmação de que tratamos seus dados, o acesso a eles, a correção, a anonimização, o bloqueio ou a eliminação do que for desnecessário, a portabilidade, informações sobre com quem compartilhamos, e revogar o consentimento (por exemplo, apagar a biometria em Perfil › Gerenciar biometria facial). Também pode pedir a revisão de decisões tomadas só de forma automática. Faça o pedido ${contato}. Respondemos no prazo da LGPD. Você também pode reclamar à ANPD.`],
  ['10. Permissões do celular', 'Câmera, microfone, localização, notificações, ligações e outras permissões só são pedidas quando a função precisa delas, e você pode desligá-las nas configurações do aparelho. A função que depende delas deixa de funcionar e o resto continua. A lista completa está no item 11-A do Termo de Adesão.'],
  ['11. Site e armazenamento no navegador', 'O site guarda no seu navegador o login e uma cópia do app para abrir mais rápido. Não usamos cookies de propaganda de terceiros.'],
  ['12. Menores de idade', 'O Realyz é só para maiores de 18 anos. Se encontrarmos uma conta de menor, ela é encerrada e os dados apagados, salvo o que a lei mandar guardar.'],
  ['13. Encarregado e contato', `Para qualquer assunto sobre dados pessoais, fale com o encarregado do Realyz ${contato}.`],
  ['14. Mudanças nesta política', 'Quando esta política mudar, a data abaixo do título é atualizada e, se a mudança for importante, avisamos no app antes de ela valer.'],
];
writeFileSync(join(destino, 'privacidade.html'), pagina('Política de Privacidade', `<h1>Política de Privacidade</h1><p class="nota">Atualizada em ${ATUALIZADA}</p>` + P.map(([t, x]) => `<h2>${esc(t)}</h2><p>${x.includes('<a ') ? x : esc(x)}</p>`).join('')));

// ── Páginas de Pioneiro e os arquivos delas ──
const pasta = join(aqui, 'paginas');
for (const f of readdirSync(pasta)) copyFileSync(join(pasta, f), join(destino, f));
console.log('páginas do site geradas em', destino, ':', ['termos.html', 'privacidade.html', ...readdirSync(pasta)].join(', '));
