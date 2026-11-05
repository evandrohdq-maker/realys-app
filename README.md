# Realys: versão de demonstração

**Pessoas reais. Negócios reais.** Um único app reúne rede social, loja, comida, serviços, gestão de empresa e negócios entre empresas (B2B). Todo mundo usa o mesmo aplicativo, e cada perfil tem acessos diferentes.

> Esta é uma **versão de demonstração** para apresentar a ideia a clientes e parceiros. Empresas, produtos, pessoas e valores são exemplos fictícios, e os dados ficam só no celular enquanto o app está aberto.

---

## O que tem no app

| Perfil | Abas | O que dá para mostrar |
| --- | --- | --- |
| **Usuário** | Início, Stories, Date, Food, Serviços, Pedidos, Perfil | Feed com fotos e vídeos de perfis verificados, **Food** só com comida e bebida (promoções de restaurantes, bares e happy hour com check-in e "vou hoje", novidades do cardápio, o que a galera está comendo, cardápios e carrinho), loja com destaques e patrocinados no topo (pelo Shop do Início), atalhos redondos do Shop para Tecnologia, Agro, Eletrônicos, Vestuário, Utensílios, Eletrodomésticos, Móveis e **Vários** (presentes, papelaria, pet, brinquedos, ferramentas, festas e o que não se encaixa em outro setor), carrinho com pagamento protegido, **qualquer prestador** (eletricista, encanador, mecânico, diarista, pintor, chaveiro, técnico, frete, motoboy, carro, e **hotelaria**: hotéis e pousadas) com nota, funções e preço, acompanhar pedidos. Pelo menu ⋮: **Tecnologia** e **Agro** (IA, robótica, apps; insumos, máquinas, agrônomos e o que une os dois: agro é tech), **Transporte público** (ônibus e metrô da cidade, linhas entre cidades e entre estados, ônibus acompanhado pelo GPS, passagem com QR), **Socorro e saúde** (botãozinho vermelho **SOS** no Perfil, SAMU 192, Bombeiros 193, Polícia 190 e outros ligando direto do celular, hospitais mais próximos, especialistas médicos com teleconsulta, ambulâncias particulares), **Artistas** (músicas MP3, vídeos e obras, à venda com saldo Realys), **Empregos** (vagas de empresas verificadas perto de você, filtros por área e candidatura com um toque usando o perfil) e a **página de cada empresa** (apresentação, produtos, conteúdos, seguir) |
| **Empresa (CNPJ)** | Painel, Estoque, Caixa, Negócios, RH, Página, Perfil | Gráficos de vendas, alertas da IA, estoque ligado à vitrine, venda no balcão com **NF-e emitida automaticamente**, botão **Lançar no Shop** (o produto aparece em Lançamentos para os clientes), **RH**: anunciar vagas, ver candidatos verificados, marcar entrevista, contratar ou recusar, fluxo de caixa com projeção de 30, 60 e 90 dias, compras B2B com propostas de desconto e **propostas recebidas dos fornecedores** (aceitar, recusar ou pedir outro desconto), **Página**: editar o perfil público e publicar MP3, vídeos e obras pagando o servidor (por envio ou Plano Artista Pro) |
| **Prestador** | Serviços, Feed, Stories, Perfil | **Cadastro profissional** (tipo de serviço, o que faz e quanto cobra: por hora, serviço, diária, m²…), ligar o GPS para ficar disponível, aceitar pedidos, ver ganhos |
| **Fornecedor** | Propostas, Feed, Stories, Perfil | **Destacar produtos** (aparecem primeiro no catálogo das empresas), cadastrar produto, **enviar proposta direto para uma ou várias empresas** (quantidade, desconto, validade e mensagem), acompanhar as enviadas e responder as propostas recebidas |

**Em todas as telas:** o botão redondo do microfone abre a **Lotus**, assistente de voz do Realys (responde com voz feminina suave, em português do Brasil), com pesquisa por voz para qualquer prestador:

- *"Preciso de um eletricista. Tem algum perto de mim?"* → a Lotus responde por voz quem está perto, a distância, a nota, o que a pessoa faz e quanto cobra (ex.: "R$ 80,00 por hora"), e pergunta se quer chamar. Diga "sim" e ela agenda.
- *"preciso de um carro na Rua Augusta, 1200"* → agenda na hora e responde com o tempo de espera, o carro e a placa.
- *"chama um encanador"* → chama direto o mais próximo.
- *"tem hotel em Campos do Jordão?"*, *"quero alugar um apartamento"*, *"tem curso online?"* → a Lotus **pesquisa em todo o conteúdo do app** (anúncios, hotéis e pousadas, imóveis, aluguel de carros e máquinas, eventos, cursos, lojas, produtos, promoções, prestadores, lives, pessoas e posts), fala os primeiros resultados e mostra a lista; tocar num resultado abre a tela certa.

**Mãos livres:** em **Perfil → Acionar falando "abrir Lotus"**, o app fica ouvindo enquanto está aberto. Basta dizer **"abrir Lotus, preciso de um eletricista"** (ou só "abrir Lotus" e depois o pedido) que a assistente abre e responde, sem tocar na tela e sem "Ok Google". Quando a Lotus pergunta algo ("quer que eu chame?"), o microfone abre sozinho para a resposta. Com o celular bloqueado ainda não funciona (próxima etapa).

**Como o app reconhece "abrir Lotus":** o app compara pelo **som**, não pela grafia, e confere as várias opções que o celular ouviu: aceita "Lótus", "lotos", "lots", "abre", "abra", "a brir"... Só dispara com o "abrir" antes do "Lotus", para não abrir sozinho quando alguém fala de flor de lótus ou de "lote". Ver `src/wakeMatch.js`. A voz suave fica em `src/voice.js`: escolhe a melhor voz feminina pt-BR instalada no celular e fala um pouco mais devagar.

As respostas saem do **cadastro que cada prestador faz** (funções e valores). Teste no perfil Prestador: cadastre-se, fique disponível e pergunte por voz no perfil Cliente.

**Administrador geral:** na tela de entrada, digite `admin` no campo de acesso; o campo de senha aparece.

- Usuário: `admin`
- Senha: `Realys@2026`

Na aba **Sistema**, o administrador vê o **mapa de todo o app**: cada tela, o que ela faz e a situação (funciona na demo, só visual ou precisa de servidor), com o botão **Abrir tela**. Em qualquer tela aparece o **botão dourado de lápis** para anotar o que deve mudar ali; as anotações ficam salvas no celular, podem ser marcadas como feitas e enviadas pelo WhatsApp ou e-mail pelo botão **Enviar**. O botão dourado de baixo volta para o mapa do sistema.

O administrador vê a visão geral da plataforma (usuários, empresas, receita), modera denúncias e alertas da IA (bloquear conta, remover post) e aprova ou recusa cadastros de empresas, prestadores e fornecedores. Ele também pode trocar para os outros perfis.

> A senha acima é só da demonstração e fica visível no código. Na versão real, o login de administrador fica no servidor, com senha criptografada e verificação em duas etapas.

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

**Menu ⋮ (três pontinhos):** no cabeçalho, **Acessar como** (Usuário, Empresa, Prestador, Fornecedor); abaixo, as classes **Restaurantes, Serviços gerais, Lojas, Social e Área empresarial**. Cada classe abre uma sub-aba para escolher o tipo (ex.: Serviços gerais → Eletricista).

**Stories e Comunidade (botão Stories na barra de baixo):** a faixa de bolinhas dos stories fica no topo, como no Instagram. Toque para ver em tela cheia (toque à direita avança, à esquerda volta, segure para pausar), responda (a resposta cai em Mensagens) e, nos stories de empresas, toque no botão da oferta. Logo abaixo fica a **Comunidade**, que saiu do Início: **Feed** (um feed único com os posts das pessoas e os depoimentos aprovados, com anúncios entre eles; tudo dá para curtir, comentar e compartilhar), **Mensagens**, **Contatos** e o botão **Live**.

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
