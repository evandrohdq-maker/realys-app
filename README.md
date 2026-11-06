# Realys: versão de demonstração

**Pessoas reais. Negócios reais.** Um único app reúne rede social, loja, comida, serviços, gestão de empresa e negócios entre empresas (B2B). Todo mundo usa o mesmo aplicativo, e cada perfil tem acessos diferentes.

> Esta é uma **versão de demonstração** para apresentar a ideia a clientes e parceiros. Empresas, produtos, pessoas e valores são exemplos fictícios, e os dados ficam só no celular enquanto o app está aberto.

---

## Visual

Tema claro, com as cores de sempre: fundo marfim, dourado de glória e azul-céu. O layout é **clean**:

- **Cartões sem contorno:** uma sombra leve e quente (`soft`, em `src/theme.js`) no lugar das bordas, com mais respiro entre os blocos.
- **Topo limpo:** só a logo, o REALYS com um check dourado de ID verificado e os ícones soltos (busca, carrinho e menu ⋮), sem caixinhas. A faixa de avisos (comanda do evento, mãos livres) só aparece quando tem algo.
- **Barra de baixo** arredondada e sem linha; a aba ativa fica com o ícone dourado numa pílula clarinha. As abas do topo da Community seguem o mesmo estilo.
- **Textos mais leves** (menos negrito) e chips em marfim, sem contorno.
- **Mesmo visual do Shop em todo lugar:** a Loja, o Food, os Eventos e as páginas das empresas usam as peças do Shop (`src/components/ShopKit.js`): faixa clarinha de título, atalhos redondos com ícone pequeno, cartões de produto com o botão **+ Carrinho** e lojas em linha com o logo num quadradinho.

---

## O que tem no app

| Perfil | Abas | O que dá para mostrar |
| --- | --- | --- |
| **Usuário** | Início, Community, Date, Food, Serviços, Pedidos, Perfil | Feed com fotos e vídeos de perfis verificados, **Food** só com comida e bebida (promoções de restaurantes, bares e happy hour com check-in e "vou hoje", novidades do cardápio, o que a galera está comendo, cardápios e carrinho), loja com destaques e patrocinados no topo (pelo Shop do Início), atalhos redondos do Shop para Tecnologia, Agro, Eletrônicos, Vestuário, Utensílios, Eletrodomésticos, Móveis e **Vários** (presentes, papelaria, pet, brinquedos, ferramentas, festas e o que não se encaixa em outro setor), carrinho com pagamento protegido, **qualquer prestador** (eletricista, encanador, mecânico, diarista, pintor, chaveiro, técnico, frete, motoboy, carro, e **hotelaria**: hotéis e pousadas) com nota, funções e preço, acompanhar pedidos. Pelo menu ⋮: **Tecnologia** e **Agro** (IA, robótica, apps; insumos, máquinas, agrônomos e o que une os dois: agro é tech), **Transporte público** (ônibus e metrô da cidade, linhas entre cidades e entre estados, ônibus acompanhado pelo GPS, passagem com QR), **Socorro e saúde** (botãozinho vermelho **SOS** no Perfil, SAMU 192, Bombeiros 193, Polícia 190 e outros ligando direto do celular, hospitais mais próximos, especialistas médicos com teleconsulta, ambulâncias particulares), **Artistas** (músicas MP3, vídeos e obras, à venda com saldo Realys), **Empregos** (vagas de empresas verificadas perto de você, filtros por área e candidatura com um toque usando o perfil) e a **página de cada empresa** (apresentação, produtos, conteúdos, seguir) |
| **Empresa (CNPJ)** | Painel, Estoque, Caixa, Negócios, RH, Página, Perfil | Gráficos de vendas, alertas da IA, estoque ligado à vitrine, venda no balcão com **NF-e emitida automaticamente**, botão **Lançar no Shop** (o produto aparece em Lançamentos para os clientes), **RH**: anunciar vagas, ver candidatos verificados, marcar entrevista, contratar ou recusar, fluxo de caixa com projeção de 30, 60 e 90 dias, compras B2B com propostas de desconto e **propostas recebidas dos fornecedores** (aceitar, recusar ou pedir outro desconto), **Página**: monta a página empresarial futurista: slogan, **onde atua** (áreas como Alimentação, Mercado, Moda, Tecnologia, Agro…) com os **segmentos** de cada área (ou um segmento próprio), **onde atende** (loja física, entrega, retirada, online, todo o Brasil), **vitrine** com até 6 produtos em destaque, **depoimentos** de quem comprou (a empresa escolhe quais ficam expostos) e **vídeos de propaganda**; música, vídeo e obra ficam como opção, pagando o servidor (por envio ou Plano Artista Pro) |
| **Prestador** | Serviços, Feed, Community, Perfil | **Cadastro profissional** (tipo de serviço, o que faz e quanto cobra: por hora, serviço, diária, m²…), ligar o GPS para ficar disponível, aceitar pedidos, ver ganhos |
| **Fornecedor** | Propostas, Feed, Community, Perfil | **Destacar produtos** (aparecem primeiro no catálogo das empresas), cadastrar produto, **enviar proposta direto para uma ou várias empresas** (quantidade, desconto, validade e mensagem), acompanhar as enviadas e responder as propostas recebidas |

**Serviços por visita (aba Serviços):** eletricista, encanador, diarista, técnico, agrônomo e os outros prestadores que vão até o cliente funcionam por **taxa de visita** (transporte continua como corrida). As regras ficam em `src/serviceVisits.js`.

- **Pedir visita:** o cliente conta o problema, o endereço e quando, e paga a taxa de visita pelo saldo Realys. O valor **fica retido**.
- **O prestador aceita ou recusa.** Recusou: a taxa volta na hora e o pedido não recebe avaliação. Aceitou: o telefone é liberado (antes disso, só o chat do Realys).
- **O cliente confirma a visita.** Só então a taxa é dividida: **15% para o Realys** (`REALYS_FEE_PCT`) e o resto para o prestador. Se o prestador não veio, a taxa volta para o cliente e ele perde posição no ranking.
- **O valor do serviço** é combinado direto entre os dois, sem taxa do Realys. O prestador pode marcar que **desconta a taxa de visita** se for contratado.
- **Avaliação nos dois sentidos:** serviço concluído, o cliente avalia o prestador e o prestador avalia o cliente.
- **Ranking (Recomendados):** soma nota, serviços finalizados nos últimos 90 dias, taxa e tempo de resposta e proximidade, separado por categoria e região. Nota pesa mais que quantidade. Recusar não tira pontos; faltar tira. Prestador novo tem **impulso nos primeiros 30 dias**.
- **Plano de destaque** (R$ 49,90/mês, no painel do Prestador): aparece no topo como **Patrocinado**, separado do ranking por mérito.
- Na demonstração, as respostas do outro lado (prestador aceitou, cliente confirmou) são simuladas por botões no próprio cartão.

**Perfil em dois sistemas (aba Perfil):**

- **Editar perfil:** foto, @usuário, profissão, cidade, "sobre você" e link. O nome vem do documento e da biometria e não muda.
- **Quem vê meu perfil:** chave **Exposto / Invisível** (modo invisível esconde o perfil de todo mundo) e, separadamente, para a **vida social** (fotos, vídeos, destaques, depoimentos) e para o **portfólio**: **Todos**, **Só amigos** ou **Só eu**. Quem visita um perfil fechado vê o aviso "Perfil reservado" (na demo: Beatriz Costa mostra a vida social só para amigos, André Oliveira só o trabalho e Carlos Mendes está invisível).
- **Estúdio Realys:** produção de conteúdo do próprio usuário: **Música, Vídeo, Arte, Foto e Projeto** (portfólio de trabalhos). Cada criação escolhe onde aparece: **Social** (aba Criações do perfil), **Portfólio** (vitrine profissional do perfil) e, para quem tem CNPJ, **Empresarial** (entra na página da empresa, em Vídeos e músicas). Dá para ligar e desligar cada lugar depois, direto na lista.
- Tudo fica salvo no celular, por conta. Ícones com anel em órbita e brilho dourado e azul, no mesmo estilo futurista da Lotus.

**Em todas as telas:** o botão redondo do microfone abre a **Lotus**, assistente de voz do Realys (responde com voz feminina suave, em português do Brasil), com pesquisa por voz para qualquer prestador:

- **A Lotus nunca chama, agenda ou compra sozinha:** ela mostra as opções e pergunta antes.
- *"Preciso de um eletricista"*, *"chama um encanador"*, *"preciso de um carro na Rua Augusta, 1200"* → mostra a lista de quem está perto (distância, nota, o que faz e quanto cobra) e pergunta: **chamar agora**, **agendar para depois** ou **outro da lista**. Dá para responder "a Juliana", "o segundo", "sim", "agenda para amanhã às 9h" ou "não". Se for "mais tarde", ela pergunta para quando.
- *"Quero uma pizza"*, *"preço do café"* → mostra as opções e pergunta se **adiciona ao carrinho** (qual delas, ou "não"); depois pergunta se **finaliza a compra** ou se você continua comprando. Os produtos da lista também têm o botão **Adicionar**.
- *"tem hotel em Campos do Jordão?"*, *"quero alugar um apartamento"*, *"tem curso online?"* → a Lotus **pesquisa em todo o conteúdo do app** (anúncios, hotéis e pousadas, imóveis, aluguel de carros e máquinas, eventos, cursos, lojas, produtos, promoções, prestadores, lives, pessoas e posts), fala os primeiros resultados e mostra a lista; tocar num resultado abre a tela certa.

**Navegar falando:** peça para a Lotus abrir qualquer página e ela fecha a caixa e leva você direto para lá: *"me leva pro Agro"*, *"abre o Food"*, *"abre o Community"*, *"abre as mensagens"*, *"mostra os hotéis"*, *"abre minha carteira"*, *"abre o estoque"* ou só *"voltar"*. Também funciona dizendo só o nome (*"Agro"*, *"Date"*, *"Lives"*). Com o mãos livres ligado, *"abrir Lotus, me leva pro Agro"* vai direto, sem nem abrir a caixa. A lista de páginas e dos jeitos de falar fica em `src/voiceNav.js` (inclui os jeitos que o celular escreve "Stories": "histories", "estórias", "istóris"...).

**Entende pelo sentido (modelo de linguagem dentro do APK):** a Lotus tem um modelo de linguagem em português que roda no próprio celular, sem servidor e sem internet (`src/lm/`). Cada palavra tem um "vetor de sentido" (cerca de 190 mil palavras), então frases sem palavra-chave também funcionam: *"tô a fim de dançar hoje"* → festas abertas perto; *"tô sem trabalho"* → Empregos; *"estou com febre"* → hospitais e médicos; *"acabou o arroz"* → Mercado; *"quero conhecer gente nova"* → Date. Quando ela entende assim, aparece o selo "Entendi pelo sentido". Se não tiver certeza, ela não chuta: segue para a busca normal. As intenções e frases de exemplo ficam em `INTENTS`, em `src/lm/lotusLM.js` (para ensinar algo novo, é só acrescentar exemplos). O modelo vem dos vetores do spaCy `pt_core_news_md` (licença MIT), compactados por `tools/build-lm.py` (~6 MB).

**Fica no assunto:** quando o pedido tem um assunto (hotel, imóvel, aluguel de carro ou máquina, curso, saúde, transporte, vagas, artistas, lives), a Lotus procura **só dentro dele**, e as outras palavras filtram e ordenam: *"preciso de um hotel"* traz só hotéis e pousadas, do mais perto para o mais longe; *"hotel barato"* ordena pelo preço; *"hotel em Santos"*, *"pousada na praia"*, *"hotel que aceita pet"* filtram. Palavras que o celular escreve errado ("otel", "rotel", "hotéu", "pousda", "ospital") são corrigidas antes da busca, e se a primeira opção ouvida não der em nada, ela tenta as outras opções que o celular ouviu. Os assuntos ficam em `CATEGORIES`, em `src/search.js`.

**Rápida:** a caixa abre em menos de meio segundo e já começa a ouvir, com o microfone dentro do próprio app (sem a janela do Google). O orbe dourado pulsa conforme o volume da sua voz e o texto aparece enquanto você fala.

**Mãos livres:** em **Perfil → Acionar falando "abrir Lotus"**, o app fica ouvindo enquanto está aberto. Basta dizer **"abrir Lotus, preciso de um eletricista"** (ou só "abrir Lotus" e depois o pedido) que a assistente abre e responde, sem tocar na tela e sem "Ok Google". Quando a Lotus pergunta algo ("quer que eu chame?"), o microfone abre sozinho para a resposta. Com o celular bloqueado ainda não funciona (próxima etapa).

**A Lotus aprende sozinha:** tudo o que empresas e clientes publicam (produtos e preços, lançamentos, promoções, serviços dos prestadores, anúncios, vagas, depoimentos expostos e posts públicos) entra no conhecimento dela na mesma hora (`src/lm/knowledge.js`). Com isso ela responde: *"quanto custa um eletricista?"*, *"onde o café está mais barato?"*, *"achei café por 30 reais, tá caro?"* (compara com a média), *"o que falam da Pizzaria da Praça?"* (nota e depoimentos de quem comprou). Ela **nunca usa esse conhecimento para uso próprio**: não compra, não vende, não negocia nem age sozinha, não lê dados privados (custo, caixa, carteira, mensagens, Date) e patrocínio não muda as análises.

**Nada de fake news:** todo post e depoimento passa pela IA verificadora (`src/lm/factCheck.js`). Fake news não é publicada e sai do conhecimento da Lotus; fica só marcada como **informação falsa**, e se alguém perguntar (*"é verdade que o Pix vai ser taxado?"*) ela avisa que é falso. Post suspeito aparece com o aviso "em verificação", a Lotus não aprende com ele e vai para a Moderação: **Remover post** confirma como falso; **Arquivar** libera.

**Administrador › Mercado:** levantamento que a Lotus monta sozinha: preço médio e faixa por setor, maiores diferenças de preço do mesmo produto entre lojas, quanto os serviços cobram, reputação das empresas, o que os clientes mais comentam, o que ela acabou de aprender, as informações falsas descartadas e as regras de uso do conhecimento.

**Pausar a Lotus:** enquanto ela fala, é só chamar **"Lotus"** de novo. Ela **pausa** na hora (guarda a frase em que estava e o assunto) e ouve o novo pedido, que é entendido **junto com o que já foi pedido**. Exemplo: *"Lotus, preciso de um motorista"* → ela começa a apresentar o mais próximo → *"Lotus… tem mais barato?"*, *"e o mais perto?"*, *"quanto ele cobra?"*, *"quanto tempo demora?"*, *"tem outro?"*, *"o segundo"* ou *"sim, pode chamar"*, tudo sobre os mesmos motoristas. *"Continua"* retoma da frase em que parou, *"repete"* fala tudo de novo, *"espera"* deixa em pausa (com o botão **Continuar** na tela), e um pedido de outro assunto (*"preciso de um eletricista"*) começa do zero. Também dá para emendar: *"Lotus, me leva pro Agro"*. Tocar no orbe enquanto ela fala também pausa. O microfone fica ouvindo o tempo todo enquanto ela fala e religa sozinho na hora em Androids mais antigos, que desligavam o microfone depois de cada frase (era isso que fazia o "Lotus" falhar). Ver `findCall` em `src/wakeMatch.js` e `speakParts` em `src/voice.js`.

**Como o app reconhece "abrir Lotus":** o app compara pelo **som**, não pela grafia, e confere as várias opções que o celular ouviu: aceita "Lótus", "lotos", "lots", "abre", "abra", "a brir"... Só dispara com o "abrir" antes do "Lotus", para não abrir sozinho quando alguém fala de flor de lótus ou de "lote". Ver `src/wakeMatch.js`. A voz suave fica em `src/voice.js`: escolhe a melhor voz feminina pt-BR instalada no celular e fala um pouco mais devagar.

As respostas saem do **cadastro que cada prestador faz** (funções e valores). Teste no perfil Prestador: cadastre-se, fique disponível e pergunte por voz no perfil Cliente.

**Administrador geral:** na tela de entrada, digite `admin` no campo de acesso; o campo de senha aparece.

- Usuário: `admin`
- Senha: `Realys@2026`

Na aba **Sistema**, o administrador vê o **mapa de todo o app**: cada tela, o que ela faz e a situação (funciona na demo, só visual ou precisa de servidor), com o botão **Abrir tela**. Em qualquer tela aparece o **botão dourado de lápis** para anotar o que deve mudar ali; as anotações ficam salvas no celular, podem ser marcadas como feitas e enviadas pelo WhatsApp ou e-mail pelo botão **Enviar**. O botão dourado de baixo volta para o mapa do sistema.

O administrador vê a visão geral da plataforma (usuários, empresas, receita), modera denúncias e alertas da IA (bloquear conta, remover post) e aprova ou recusa cadastros de empresas, prestadores e fornecedores. Ele também pode trocar para os outros perfis.

> A senha acima é só da demonstração e fica visível no código. Na versão real, o login de administrador fica no servidor, com senha criptografada e verificação em duas etapas.

**Perfil social (classe e subclasse):** no **Cadastre-se** (Pessoa), um questionário rápido define o perfil: *"Como você se descreve?"*, *"O que você mais gosta de fazer?"* (Jogar, Gravar vídeos, Bombar nas redes, Cantar, Treinar, Estudar, Ensinar...) e *"Trabalha ou estuda com o quê?"*. Enquanto a pessoa escreve, o Realys mostra o resultado ao vivo, por exemplo *"Jogo Free Fire e faço live na Twitch"* → **Gamer · Streamer**. Se não for isso, dá para escolher à mão. Classes: **Gamer**, **Criador de conteúdo**, **Influenciador**, Artista, Música, Atleta, Esportista, Estudante, Professor, Empreendedor, Tecnologia, Saúde, Prestador de serviços, Gastronomia, Fé e louvor e Viajante, cada uma com suas subclasses (ex.: Gamer → Mobile, PC gamer, Console, Pro de e-sports, Streamer, Retrô). Classes fortes extras viram selos menores (ex.: Gamer que também é Criador de conteúdo). O selo aparece no Meu perfil (com botão para refazer), no perfil das pessoas e na busca; na busca de pessoas tem **Explorar por perfil** e dá para buscar por "gamer" ou "influenciador". Exemplos na demo: Lucas Ferreira (Gamer · Streamer), Rafaela Nunes (Gamer · Pro de e-sports), Camila Duarte (Influenciador · Moda e beleza), Thiago Ramos (Criador de conteúdo · Humor). As classes e palavras ficam em `src/socialClasses.js`.

**Entrada e cadastro:** a tela inicial tem duas abas, **Entrar** e **Cadastre-se**.

- **Cadastre-se:** escolha **Pessoa** (CPF: cliente e prestador) ou **Empresa** (CNPJ: loja, fornecedor e cliente) e preencha nome, CPF ou CNPJ (o app confere os dígitos, não aceita número inventado), usuário (@), e-mail, celular e senha (mínimo 8 caracteres, com letras e números). A conta só é criada depois de confirmar a biometria. Na demonstração, as contas ficam guardadas no próprio celular, e a senha é gravada só como hash (SHA-256 com sal), nunca a senha em si.
- **Entrar:** um campo só, **usuário, CPF ou CNPJ**, mais a **senha**, e depois a biometria do celular (digital ou rosto). O tipo de acesso vem da conta. Um acesso que não foi cadastrado neste celular entra como conta de demonstração (CNPJ: Empresa e Fornecedor; CPF ou usuário: Cliente e Prestador).
- **Salvar usuário neste aparelho** (marcado por padrão): da próxima vez, a entrada mostra **"Quem vai usar o Realys?"** com as contas salvas. Basta tocar no nome e confirmar a biometria, sem digitar usuário e senha. O X ao lado tira a conta do aparelho. Se o celular não tiver biometria cadastrada, o app pede a senha. A lista fica no cofre seguro do Android (SecureStore) e não guarda senhas. O administrador nunca fica salvo: sempre digita a senha.
- **Trocar usuário:** em **Perfil → Trocar usuário**, a pessoa sai da conta e o celular volta para a lista de contas salvas, para outra pessoa entrar com a dela (ex.: aparelho da empresa usado por vários funcionários). Ao trocar, nada da conta anterior fica aberto. Em **Sair**, o app pergunta se a conta continua salva no aparelho ou se deve ser removida.

---

**Tecnologia e Agro (as duas se conversam):** atalhos no Início › Shop e no menu ⋮.

- **Tecnologia:** inteligência artificial (atendente com IA, IA que lê notas e lança no caixa), robótica (kits educacionais, braço robótico para indústria), apps e sistemas (gestão, criar o app da sua empresa com um desenvolvedor), cursos e eventos (IA para negócios, Arduino, hackathon). Assinar, comprar e se inscrever com saldo Realys (vira pedido com NF-e) ou pedir orçamento.
- **Agro:** sementes e insumos, máquinas (venda e aluguel de trator e colheitadeira), agrônomos e drone agrícola (aparecem em Serviços com preço e nota, e a Lotus acha por voz: *"abrir Lotus, preciso de um agrônomo"*), direto do produtor (café, hortifrúti e laticínios para empresas), clima do dia, cotações (exemplo) e o **Doutor da lavoura**: fotografa a folha e a IA aponta a praga provável, com botão para chamar o agrônomo.
- **Subgrupos do Agro:** no topo da aba, **Grãos, Café, Pecuária, Hortifrúti e Leite**. Cada um mostra as cotações e os produtos, máquinas e serviços daquela cadeia: silo e soja em lote (Grãos), derriçadeira e prova de café (Café), ração, brinco eletrônico, leilão virtual, bezerros e **veterinário rural** (Pecuária), estufa e mudas (Hortifrúti), ordenhadeira, tanque resfriador e coleta de leite (Leite). Também abrem pelo menu ⋮ › Agro.
- **Agro é tech:** drones, sensores de solo, piloto automático GPS, robô de capina, app da fazenda e IA de pragas aparecem nas duas abas, com a faixa verde que leva de uma para a outra.

**Eletrônicos, Vestuário e Utensílios domésticos (subgrupos como no Agro):** botões no Início › Shop, logo abaixo de Tecnologia e Agro, e no menu ⋮.

- **Eletrônicos:** Celulares, Informática, TV e áudio, Games, Casa inteligente e Acessórios.
- **Vestuário:** Feminino, Masculino, Infantil, Calçados, Fitness e Acessórios.
- **Utensílios domésticos:** Cozinha, Eletroportáteis, Mesa, Cama e banho, Limpeza e Organização.
- Cada subgrupo mostra os **lançamentos** numa faixa no topo, depois as ofertas com os **patrocinados primeiro**, e tem o filtro **Envia para o Brasil**. Comprar usa o saldo Realys (pedido com NF-e). Alguns itens levam a prestadores (técnico de casa inteligente, costureira, diarista). Tudo aparece também na pesquisa por voz (*"abrir Lotus, quero uma air fryer"*).

**Página da empresa (o que o cliente vê):** é um **perfil empresarial**, aberto para todos os usuários, mas **não é um perfil social**: nada de foto pessoal ou capa de alguém se exibindo, só a empresa. O topo usa a foto da estrutura da empresa, com a **ficha da empresa** (razão social, CNPJ verificado, equipe, endereço e atendimento), botões **Seguir empresa** e **Atendimento**, e a guia **Galeria** com fotos da **equipe**, dos **produtos** e da **estrutura** (a empresa monta em Página › Galeria da empresa). Topo noturno com brilho dourado e azul, logo com anel em órbita, slogan, selos, números (seguidores, nota, depoimentos, desde quando), **Onde atua** (cartões de cada área com os segmentos), **Onde atende** e as guias **Vitrine**, **Produtos**, **Depoimentos** (nota média, barras por estrela, selo "Compra verificada"; quem comprou na loja pelo Realys pode escrever o seu), **Propagandas** (vídeos da empresa), **Galeria** e **Novidades**. A guia **Músicas** só aparece se a empresa publicou. Dados de exemplo em `src/companyBusiness.js`.

**Carrinho:** janela compacta que abre por cima de qualquer tela, sem mexer no visual. Abre pelo **ícone da sacola no topo** (só aparece quando há itens, com o número de itens), pela barra "Ver carrinho" da Loja e do Food, ou pedindo à Lotus: *"abre meu carrinho"*. Dentro dá para mudar a quantidade (+ e −), tirar itens, ver quanto sai dos créditos de presente e do saldo, e pagar.

**Avaliação depois da entrega:** quando o pedido é entregue (comida ou produtos) ou o serviço é concluído (motorista, eletricista, diarista…), a avaliação abre sozinha: estrelas, etiquetas rápidas ("Chegou quentinha", "Pontual", "Atrasou"…) e comentário. Num pedido avalia a loja ou restaurante e o motoboy; num serviço, o prestador. A nota entra na nota do prestador, e o comentário da loja vira depoimento com "Compra verificada" na página da empresa. Dá para avaliar depois pelo botão **Avaliar** em Pedidos e Serviços. Com nota boa, ela oferece dar gorjeta.

**Pontos Realys:** cada avaliação dá **10 pontos** (+5 com comentário). Em **Carteira › Pontos Realys** os pontos viram **créditos promocionais com os parceiros** (restaurantes, lojas, fornecedores e prestadores). Crédito de loja desconta sozinho na próxima compra lá; não pode ser sacado. Regras e catálogo em `src/rewards.js`.

**Clube Realys (fidelidade):** política calibrada com o Clube iFood (cupons de 25% até R$ 10), cartões fidelidade de restaurante ("compre 10, ganhe 1") e cashback de mercado (média de 5%), em `src/loyalty.js`:
- **Selo por loja:** cada pedido entregue vale 1 selo; com **10 selos**, **10% de volta** do que gastou nesses pedidos (até R$ 30) para usar na mesma loja. Pago pela loja.
- **A cada 20 pedidos** em qualquer empresa: **15% no próximo pedido** (até R$ 25, mínimo R$ 30) em qualquer parceiro. Pago pelo Realys.
- **Pontos por compra:** 1 ponto a cada R$ 10, mais os pontos de avaliação; níveis **Bronze, Prata, Ouro e Diamante** dão até 50% a mais de pontos.
- **Teto:** os benefícios somados ficam perto de 3% do gasto do cliente, para não comer a margem das empresas.
- Tudo desconta sozinho no carrinho. Em **Carteira** aparece o nível, quanto falta para o bônus e os selos de cada loja; a política completa fica em **Administrador › Mercado**.

**Comanda no evento e no bar:** ao comprar o ingresso de um evento, dá para escolher **Só ingresso** ou **Ingresso + mesa** (a mesa já fica reservada). No local, o botão do evento vira **Estou no local · pedir**; no bar, o **Check-in** abre a mesma comanda (e **Reservar** guarda uma mesa). O cliente escolhe bebidas, comidas e combos, confirma e **paga pelo Realys** (créditos de presente primeiro). Quem reservou já está na mesa; quem não reservou digita o número da mesa ou retira no balcão. O **caixa recebe na hora** "Mesa 12 · Fulano pediu 2 cervejas, 1 porção" e muda o status (preparando, a caminho da mesa, entregue), que o cliente acompanha em "Meus pedidos". No topo aparece um marcador discreto "📍 Club Neon · Mesa 12 · Pedir", e a Lotus abre a comanda com *"quero pedir uma cerveja"*. Na demonstração, a guia **Caixa (demo)** mostra o que o atendente vê. Cardápios em `src/venueData.js`.

**Lives por assunto e por perfil:** a aba Lives tem as partes **Gamers, Artistas, Cursos, Faculdades, Tecnologia, Noticiários, Podcasts**, Compras ao vivo, Noite e eventos e Comunidade. Cada live mostra **quem transmite** (Usuário, Empresa, Artista, Prestador ou Fornecedor) e tocar abre o perfil dele. Em **Abrir minha live** a pessoa escolhe o assunto e **transmite como** qualquer perfil da conta (usuário, empresa, prestador, fornecedor ou artista pelo Estúdio). Quem está ao vivo ganha o selo **AO VIVO agora** no próprio perfil (pessoa, página da empresa, artista, prestador) e os fornecedores ao vivo aparecem em **Negócios** para as empresas. Noticiário só de canal verificado, acompanhado pela IA verificadora. A Lotus abre cada parte: *"abre os podcasts"*, *"lives de games"*, *"noticiários"*. Assuntos em `src/liveData.js`.

**Serviços em Pedidos:** motorista, motoboy, eletricista, diarista ou qualquer serviço contratado (pela tela Serviços ou pela Lotus) aparece em **Pedidos**, em "Serviços contratados": quem vem, nota, carro e placa, se é agora ou agendado, o preço e os botões **Acompanhar**, **Avaliar** (depois de concluído) e **Gorjeta**.

**Presentear (botão 🎁):** cliente presenteia outro cliente (perfil da pessoa), um **prestador de serviço** (perfil do prestador) ou dá **gorjeta ao motoboy** (no pedido); a **empresa presenteia clientes** (Painel › Presentear clientes). Também pela **Carteira › Presentear**. O valor sai do saldo de quem dá, com **taxa de 5% do Realys** (mínimo R$ 0,50), e entra **na hora** para quem recebe, sem precisar aceitar, como **créditos de presente**. Esses créditos **não podem ser sacados**: servem só para comprar produtos no Realys e são usados primeiro nas compras. A taxa entra na receita do administrador. Regras em `src/gifts.js`.

**Presentes nas lives:** quem assiste uma live toca no **🎁** ao lado do coração e escolhe um presente animado: 🌹 Rosa (R$ 1), 💛 Coração (R$ 2), 👏 Aplausos (R$ 5), 🌟 Estrela (R$ 10), 👑 Coroa (R$ 50), 🚀 Foguete (R$ 100), 💎 Diamante (R$ 300) ou 🪷 Flor de Lótus (R$ 500), em x1, x5 ou x10. Paga com o saldo, com a mesma **taxa de 5% do Realys**; o presente aparece em destaque nos comentários e os grandes explodem na tela. Quem transmite (usuário, artista, empresa, prestador ou fornecedor) vê no topo quanto já ganhou na live e junta **créditos de live**. Em **Carteira › Créditos de live › Converter em RLS**, eles viram **moeda Realys** no saldo (1 crédito = 1 RLS, mínimo 10), e daí em diante valem como saldo normal: comprar, presentear e sacar. Pela Lotus: *"quanto ganhei nas lives?"* e ela pergunta se converte. Regras em `src/gifts.js` (`LIVE_GIFTS`).

**Food chama o motoboy:** todo pedido de restaurante, bar ou doceria já sai com um **motoboy cadastrado no Realys** (o mais perto), e o pedido de entrega chega para os motoboys no perfil Prestador. Em **Pedidos** aparece quem vai entregar (moto, placa, nota e quem chamou) e o botão **Gorjeta**.

**Menu ⋮ (três pontinhos):** no cabeçalho, **Acessar como** (Usuário, Empresa, Prestador, Fornecedor); abaixo, as classes **Restaurantes, Serviços gerais, Lojas, Social e Área empresarial**. Cada classe abre uma sub-aba para escolher o tipo (ex.: Serviços gerais → Eletricista).

**Community (botão Community na barra de baixo, antes Stories):** a faixa de bolinhas dos stories fica no topo, como no Instagram. Toque para ver em tela cheia (toque à direita avança, à esquerda volta, segure para pausar), responda (a resposta cai em Mensagens) e, nos stories de empresas, toque no botão da oferta. Logo abaixo fica a **Comunidade**, que saiu do Início: **Feed** (um feed único com os posts das pessoas e os depoimentos aprovados, com anúncios entre eles; tudo dá para curtir, comentar e compartilhar), **Mensagens**, **Contatos** e o botão **Live**.

**Cabeçalho do app:** no canto esquerdo, a bolinha com a sua última publicação de story (a foto, ou o texto sobre a cor); tocar abre seus stories e o **+** pequeno cria o próximo. À direita ficam a **logo do Realys** (o R dourado), a lupa e o menu **⋮**. A troca de perfil (**Usuário, Empresa, Prestador, Fornecedor**) saiu do topo e agora é o cabeçalho do menu ⋮ (**Acessar como**).

**Criar na página de Stories:** uma opção só, o botão **+**, que pergunta o que você quer criar: **Publicação** (texto e foto do celular no Feed), **Story** ou **Depoimento**.

**Depoimentos (como no Orkut):** qualquer amigo pode escrever um depoimento para o perfil de outro (botão **Escrever** no feed ou **Escrever depoimento** no perfil da pessoa). Antes de entregar, a Realys **analisa o texto** (bloqueia ofensas, links, pedidos de dinheiro/golpe, telefone e CPF). O dono do perfil recebe em **Perfil › Depoimentos › Para aprovar** e escolhe **Aceitar e expor** ou **Recusar**. Só os aceitos aparecem no perfil e no Feed da Comunidade, onde todos podem **curtir, comentar e compartilhar**. O dono pode **tirar do perfil** depois, quando quiser. Na demonstração, o amigo aprova o seu depoimento sozinho uns 8 segundos depois de enviado.

**Galerias do perfil:** todo perfil (o seu e o de quem você abre) tem **Destaques** (stories fixados no perfil, em bolinhas com nome, como no Instagram), **Fotos**, **Vídeos** e **Depoimentos**. No seu perfil você adiciona fotos e vídeos **do próprio celular**, cria destaques com seus stories ou fotos, e segura um item para remover. Na demonstração o vídeo mostra a capa; o player entra numa próxima versão.

**Buscar pessoas e perfis:** a lupa no topo do app (e em Comunidade › Contatos) busca qualquer usuário da rede pelo nome ou pelo @usuário, sem ligar para acento ou maiúscula. Tocar no nome ou na foto de quem postou abre o perfil da pessoa: capa, foto, cidade, bio, amigos, amigos em comum, posts e os botões **Adicionar amigo** (vira "Solicitação enviada", que dá para cancelar) e **Mensagem**. Pedidos de amizade recebidos aparecem na busca e nos Contatos para aceitar ou recusar; quem vira amigo entra na lista de Amigos e contatos.

**Encontros (relacionamentos):** área opcional para conhecer pessoas. Só participa quem entra, informa um status disponível (solteiro, divorciado ou viúvo) e aceita os **Termos do Encontros** (proposta para revisão, dentro do app). Quem é casado, está em união estável ou namorando **não aparece e não recebe notificações**. Com o **radar (GPS)** ligado, o app avisa quando alguém do Encontros passa perto; a distância é sempre aproximada. Curtir ou passar; se os dois curtirem, é **match** e a conversa é liberada (separada da Comunidade). Tem denunciar e bloquear, modo invisível, dicas de segurança e "Sair e apagar meus dados". Na demonstração o radar e os avisos são simulados.

**Perfil de namoro (Encontros, opcional):** sobre mim, profissão, altura, religião, filhos, escolaridade, bebida, cigarro, atividade física, pets, signo, primeiro encontro ideal e gostos (música, lazer, comida, estilo de vida). Um medidor mostra o % completo: perfis completos aparecem primeiro no radar dos outros; perfil vazio vai para o fim da fila e recebe pouco engajamento. Toque em quem cruzou com você para ver o perfil completo.

**Perfil:** o **saldo da carteira Realys** aparece só no Perfil (saiu do topo da tela inicial), num cartão dourado com o botão **Gerenciar**, que abre a **Minha carteira**: **Depositar** (Pix, cartão ou boleto), **Sacar** por Pix para conta no seu nome, **balanço** do período (depósitos, recebidos, gastos, saques e o resultado), **limite de gastos do mês** com barra de alerta, **para onde foi o dinheiro** (gastos por categoria) e o **extrato** com filtros. Toda compra, ingresso ou plano pago no app entra sozinho no extrato. Quem também é prestador vê o que **recebeu pelos serviços**: ao aceitar um pedido em Trabalhar, o valor entra na carteira e pode ser sacado. O **SOS** é um botãozinho redondo vermelho, com brilho, ao lado do seu nome: tocar abre a tela de Socorro com SAMU, Bombeiros, Polícia, hospitais e médicos.

**Perfis de acesso:** o antigo perfil "Cliente" agora se chama **Usuário**. Toda conta tem o acesso de Usuário: empresa, prestador e fornecedor também podem consumir dentro do Realys como qualquer pessoa. O perfil de **Empresa** (com a aba **Página** para expor produtos e trabalhos, vista por todos como a página pública da empresa) é só para contas com **CNPJ**.

**Visual:** tema claro e luminoso, fundo marfim, dourado e azul-céu.

**Início do cliente (abas no topo):** **Shop** (**Lançamentos das lojas** no topo, com selo NOVO e vídeo de apresentação, depois destaques e lojas), **Promoções** (ofertas relâmpago), **Anúncios** (imóveis à venda e para alugar, aluguel de carros, vans, máquinas e equipamentos, hotéis e pousadas, casas noturnas, shows, festas e salões, cursos e faculdades online), e **Lives** (assistir e abrir a sua: bate-papo, venda ao vivo ou aula ao vivo). Chamadas de vídeo e lives são simuladas na demonstração: a versão real precisa do servidor de vídeo.

**Contratar serviço:** a busca mostra todos os prestadores próximos no mapa, com filtros (mais próximo, melhor avaliado, menor preço). Cada um tem **Contratar**, **Orçamento** e **Ver perfil**; "O mais próximo" é só um atalho. Depois de contratar, a tela de **GPS** mostra o prestador chegando, o tempo de espera e o código de chegada.

---

## Atualização automática do APK

Toda vez que o app abre, ele pergunta ao GitHub se existe uma versão nova em **Releases**. Se existir, aparece o aviso **"Nova versão disponível"** com o botão **Atualizar agora**: o próprio Realys baixa a versão nova para a pasta interna dele (não abre o navegador e não salva nada em Downloads), abre a tela **"Deseja atualizar este app?"** do Android e, com um toque em **Atualizar**, substitui o app instalado, sem criar um ícone novo e sem perder login e dados. O arquivo baixado é apagado sozinho na próxima abertura. Na primeira vez, o Android pede para **permitir que o Realys instale apps**: é só ativar uma vez. Também dá para verificar à mão em **Perfil → Verificar atualizações**.

Para publicar uma atualização, basta enviar o código para a branch `main`: o GitHub gera o APK, numera a versão e publica em Releases sozinho.

> Quem tem uma versão antiga (sem esse recurso) precisa instalar uma vez o APK novo pela página de Releases. Daí em diante, os avisos chegam sozinhos.

---

## Roteiro para apresentar a um cliente (5 minutos)

1. **Entrar:** digite um CNPJ (14 números) e toque em "Entrar com biometria". Explique que no Realys não existe perfil falso.
2. **Cliente → Início:** mostre o feed com o selo "verificado" e os posts que levam direto para a compra.
3. **Cliente → Loja:** busque "pizza", mostre os patrocinados primeiro, adicione itens do **Mercadinho Bom Preço** ao carrinho e pague.
4. **Troque para Empresa** (botão no topo ou na aba Perfil): o **estoque baixou** e a venda **entrou no caixa** e no gráfico.
5. **Empresa → Negócios:** abra o Feijão Carioca, peça 60 unidades com 8% de desconto e envie a proposta.
6. **Troque para Fornecedor:** aceite a proposta ou mande uma contraproposta.
7. **Volte para Empresa:** o estoque subiu e a saída apareceu no fluxo de caixa. *A economia toda gira dentro do Realys.*
8. **Toque no 🎙️** e diga "preciso de um eletricista". A Lotus responde quem está perto, o que faz e quanto cobra. Diga "sim" para chamar.
9. **Menu ⋮ → Empregos e vagas:** candidate-se à vaga de Repositor do Mercadinho Bom Preço. Troque para **Empresa → RH**: você aparece na lista de candidatos, com identidade verificada. Marque a entrevista e contrate.
10. **Cliente → Início › Shop:** mostre os **Lançamentos** no topo. Em **Empresa → Estoque**, toque em "Lançar no Shop" num produto e veja ele aparecer para os clientes.
11. **Troque para Prestador:** cadastre o que você faz e quanto cobra, ligue o GPS e mostre que agora a Realys também te indica para os clientes.

---

## Como gerar o APK (sem precisar instalar nada no computador)

O GitHub monta o APK sozinho, de graça, usando o arquivo `.github/workflows/build-apk.yml`.

1. Crie uma conta em [github.com](https://github.com) (se ainda não tiver).
2. Clique em **New repository**, dê o nome `realys` e crie.
3. Envie os arquivos do projeto. Com o computador, o jeito mais fácil é o Git:
   ```bash
   cd realys
   git init
   git add .
   git commit -m "Realys demo"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/realys.git
   git push -u origin main
   ```
   Se você usar **"Add file → Upload files"** pelo site, confira se a pasta `.github` foi enviada junto. Alguns computadores escondem pastas que começam com ponto.
4. Abra a aba **Actions** do repositório. O processo **"Gerar APK do Realys"** começa sozinho e leva cerca de 15 a 25 minutos.
5. Quando ficar verde ✅, abra **Releases** (na lateral direita da página do repositório) e baixe o **`realys-demo.apk`** pelo celular.
6. No Android, permita **"Instalar apps de fontes desconhecidas"** e instale.

Para gerar de novo, use **Actions → Gerar APK do Realys → Run workflow**.

### Testar no computador (opcional, para quem programa)

```bash
npm install --legacy-peer-deps
npx expo install --fix -- --legacy-peer-deps
npx expo start
```

---

## Estrutura do código

```
App.js                     → abas de cada perfil (um app, acessos diferentes)
src/store.js               → estado e regras (venda baixa estoque, B2B entra no caixa…)
src/data.js                → dados de exemplo (lojas, produtos, prestadores, fornecedores)
src/theme.js               → cores e formatação em reais
src/components/ui.js       → botões, cartões, gráficos
src/screens/LoginScreen.js → cadastro com biometria e escolha de perfis
src/screens/WalletScreen.js  → carteira: depositar, sacar, extrato, balanço e limite de gastos
src/screens/VoiceAssistant.js → Lotus, a assistente de voz
src/voice.js               → voz suave da Lotus (voz feminina pt-BR, mais calma)
src/wakeMatch.js           → reconhece "abrir Lotus" pelo som (aceita "Lótus", "abre lotos"…)
src/screens/cliente/       → feed, loja, serviços, pedidos
src/screens/empresa/       → painel, estoque, fluxo de caixa, negócios B2B, RH (vagas e candidatos)
src/jobsData.js            → vagas de emprego e candidatos de exemplo
src/components/Launches.js → vitrine de Lançamentos do Shop
src/components/SocialProfile.js → depoimentos, destaques e galerias de fotos e vídeos do perfil
src/testimonialsData.js    → depoimentos de exemplo e a análise automática do texto
src/screens/prestador/     → cadastro profissional (funções e preços) e pedidos recebidos
src/screens/fornecedor/    → propostas recebidas e catálogo atacado
```

Para trocar os exemplos (nomes de lojas, produtos, preços, fotos), edite **`src/data.js`**.

---

## O que falta para a versão real

- **Servidor na nuvem** com banco de dados e login (contas, produtos e pedidos salvos de verdade)
- Verificação de identidade com biometria facial ligada a documento, e consulta de CNPJ na Receita
- Emissão real de NF-e (integração com a Sefaz) e envio das contratações ao eSocial
- Pagamentos reais e a moeda Realys (exige validação jurídica e regras do Banco Central)
- Mapa e GPS em tempo real para motoristas, entregadores e frotas de ônibus (empresas de transporte enviando a posição)
- Cadastro real de hospitais, médicos (CRM conferido) e ambulâncias, com números verdadeiros
- Envio e reprodução de verdade de MP3 e vídeos dos artistas (servidor de arquivos e cobrança do espaço)
- Comando "abrir Lotus" com a tela bloqueada (motor de palavra-chave no próprio celular)
- IA verificadora de fake news e sistema de denúncias
- Vídeos curtos de verdade (gravar, enviar, hospedar)
- Publicação na Google Play

## Servidor

A pasta **`server/`** tem o servidor do Realys (contas, carteira, presentes, lojas, pedidos, social, chat, prestadores com GPS, lives e administrador), pronto para instalar numa VPS com um comando. Instruções em [`server/README.md`](server/README.md). O app se liga a ele pelo endereço em `app.json` › `extra` › `apiUrl` (vazio = modo demonstração) e pelo cliente `src/api.js`.
