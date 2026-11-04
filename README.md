# Realys: versão de demonstração

**Pessoas reais. Negócios reais.** Um único app reúne rede social, loja, comida, serviços, gestão de empresa e negócios entre empresas (B2B). Todo mundo usa o mesmo aplicativo, e cada perfil tem acessos diferentes.

> Esta é uma **versão de demonstração** para apresentar a ideia a clientes e parceiros. Empresas, produtos, pessoas e valores são exemplos fictícios, e os dados ficam só no celular enquanto o app está aberto.

---

## O que tem no app

| Perfil | Abas | O que dá para mostrar |
| --- | --- | --- |
| **Cliente** | Início, Stories, Encontros, Loja, Serviços, Pedidos, Perfil | Feed com fotos e vídeos de perfis verificados, loja com destaques e patrocinados no topo, carrinho com pagamento protegido, **qualquer prestador** (eletricista, encanador, mecânico, diarista, pintor, chaveiro, técnico, frete, motoboy, carro) com nota, funções e preço, acompanhar pedidos |
| **Empresa (CNPJ)** | Painel, Estoque, Caixa, Negócios, Perfil | Gráficos de vendas, alertas da IA, estoque ligado à vitrine, venda no balcão, fluxo de caixa com projeção de 30, 60 e 90 dias, compras B2B com propostas de desconto e **propostas recebidas dos fornecedores** (aceitar, recusar ou pedir outro desconto) |
| **Prestador** | Serviços, Feed, Stories, Perfil | **Cadastro profissional** (tipo de serviço, o que faz e quanto cobra: por hora, serviço, diária, m²…), ligar o GPS para ficar disponível, aceitar pedidos, ver ganhos |
| **Fornecedor** | Propostas, Feed, Stories, Perfil | **Destacar produtos** (aparecem primeiro no catálogo das empresas), cadastrar produto, **enviar proposta direto para uma ou várias empresas** (quantidade, desconto, validade e mensagem), acompanhar as enviadas e responder as propostas recebidas |

**Em todas as telas:** o botão redondo do microfone abre o **Assistente Realys**, com pesquisa por voz para qualquer prestador:

- *"Realys, preciso de um eletricista. Tem algum perto de mim?"* → a Realys responde por voz quem está perto, a distância, a nota, o que a pessoa faz e quanto cobra (ex.: "R$ 80,00 por hora"), e pergunta se quer chamar. Diga "sim" e ela agenda.
- *"Realys, preciso de um carro na Rua Augusta, 1200"* → agenda na hora e responde com o tempo de espera, o carro e a placa.
- *"Realys, chama um encanador"* → chama direto o mais próximo.

**Mãos livres:** em **Perfil → Acionar falando "Realys"**, o app fica ouvindo enquanto está aberto. Basta dizer "Realys, preciso de um eletricista" que o assistente abre e responde, sem tocar na tela e sem "Ok Google". Quando a Realys pergunta algo ("quer que eu chame?"), o microfone abre sozinho para a resposta. Com o celular bloqueado ainda não funciona (próxima etapa).

As respostas saem do **cadastro que cada prestador faz** (funções e valores). Teste no perfil Prestador: cadastre-se, fique disponível e pergunte por voz no perfil Cliente.

**Administrador geral:** na tela de entrada, digite `admin` no campo de acesso; o campo de senha aparece.

- Usuário: `admin`
- Senha: `Realys@2026`

Na aba **Sistema**, o administrador vê o **mapa de todo o app**: cada tela, o que ela faz e a situação (funciona na demo, só visual ou precisa de servidor), com o botão **Abrir tela**. Em qualquer tela aparece o **botão dourado de lápis** para anotar o que deve mudar ali; as anotações ficam salvas no celular, podem ser marcadas como feitas e enviadas pelo WhatsApp ou e-mail pelo botão **Enviar**. O botão dourado de baixo volta para o mapa do sistema.

O administrador vê a visão geral da plataforma (usuários, empresas, receita), modera denúncias e alertas da IA (bloquear conta, remover post) e aprova ou recusa cadastros de empresas, prestadores e fornecedores. Ele também pode trocar para os outros perfis.

> A senha acima é só da demonstração e fica visível no código. Na versão real, o login de administrador fica no servidor, com senha criptografada e verificação em duas etapas.

**Entrada:** um campo só, **usuário, CPF ou CNPJ**, e login com a biometria do celular (digital ou rosto). O tipo de acesso vem da conta: com CNPJ entram os perfis Empresa e Fornecedor (e Cliente); com CPF ou usuário, Cliente e Prestador. Se o aparelho não tiver biometria cadastrada, o app entra no modo demonstração.

---

**Menu ⋮ (três pontinhos):** no topo, abre as classes **Restaurantes, Serviços gerais, Lojas, Social e Área empresarial**. Cada classe abre uma sub-aba para escolher o tipo (ex.: Serviços gerais → Eletricista).

**Stories (botão próprio na barra de baixo):** uma página só para os Stories, como no Instagram, com a faixa de bolinhas no topo e os stories em cartões grandes (Novos e Já vistos): o dia a dia, o lazer e as novidades de pessoas e empresas verificadas. Toque para ver em tela cheia (toque à direita avança, à esquerda volta, segure para pausar), responda (a resposta cai em Comunidade › Mensagens) e, nos stories de empresas, toque no botão da oferta. Em **Seu story** você publica o seu (texto sobre uma cor ou foto de exemplo).

**Encontros (relacionamentos):** área opcional para conhecer pessoas. Só participa quem entra, informa um status disponível (solteiro, divorciado ou viúvo) e aceita os **Termos do Encontros** (proposta para revisão, dentro do app). Quem é casado, está em união estável ou namorando **não aparece e não recebe notificações**. Com o **radar (GPS)** ligado, o app avisa quando alguém do Encontros passa perto; a distância é sempre aproximada. Curtir ou passar; se os dois curtirem, é **match** e a conversa é liberada (separada da Comunidade). Tem denunciar e bloquear, modo invisível, dicas de segurança e "Sair e apagar meus dados". Na demonstração o radar e os avisos são simulados.

**Perfil de namoro (Encontros, opcional):** sobre mim, profissão, altura, religião, filhos, escolaridade, bebida, cigarro, atividade física, pets, signo, primeiro encontro ideal e gostos (música, lazer, comida, estilo de vida). Um medidor mostra o % completo: perfis completos aparecem primeiro no radar dos outros; perfil vazio vai para o fim da fila e recebe pouco engajamento. Toque em quem cruzou com você para ver o perfil completo.

**Visual:** tema claro e luminoso, fundo marfim, dourado e azul-céu.

**Início do cliente (abas no topo):** **Shop** (destaques e lojas), **Promoções** (ofertas relâmpago), **Anúncios** (imóveis à venda e para alugar, aluguel de carros, vans, máquinas e equipamentos, hotéis e pousadas, casas noturnas, shows, festas e salões, cursos e faculdades online), **Comunidade** (posts de pessoas reais com anúncios entre eles, mensagens com histórico, contatos e chamada de vídeo) e **Lives** (assistir e abrir a sua: bate-papo, venda ao vivo ou aula ao vivo). Chamadas de vídeo e lives são simuladas na demonstração: a versão real precisa do servidor de vídeo.

**Contratar serviço:** a busca mostra todos os prestadores próximos no mapa, com filtros (mais próximo, melhor avaliado, menor preço). Cada um tem **Contratar**, **Orçamento** e **Ver perfil**; "O mais próximo" é só um atalho. Depois de contratar, a tela de **GPS** mostra o prestador chegando, o tempo de espera e o código de chegada.

---

## Atualização automática do APK

Toda vez que o app abre, ele pergunta ao GitHub se existe uma versão nova em **Releases**. Se existir, aparece o aviso **"Nova versão disponível"** com o botão **Atualizar agora**: o celular baixa o APK novo e, ao tocar na notificação do download, instala por cima, sem perder nada. Também dá para verificar à mão em **Perfil → Verificar atualizações**.

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
8. **Toque no 🎙️** e diga "Realys, preciso de um eletricista". Ela responde quem está perto, o que faz e quanto cobra. Diga "sim" para chamar.
9. **Troque para Prestador:** cadastre o que você faz e quanto cobra, ligue o GPS e mostre que agora a Realys também te indica para os clientes.

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
src/screens/VoiceAssistant.js → assistente de voz "Realys"
src/screens/cliente/       → feed, loja, serviços, pedidos
src/screens/empresa/       → painel, estoque, fluxo de caixa, negócios B2B
src/screens/prestador/     → cadastro profissional (funções e preços) e pedidos recebidos
src/screens/fornecedor/    → propostas recebidas e catálogo atacado
```

Para trocar os exemplos (nomes de lojas, produtos, preços, fotos), edite **`src/data.js`**.

---

## O que falta para a versão real

- **Servidor na nuvem** com banco de dados e login (contas, produtos e pedidos salvos de verdade)
- Verificação de identidade com biometria facial ligada a documento, e consulta de CNPJ na Receita
- Pagamentos reais e a moeda Realys (exige validação jurídica e regras do Banco Central)
- Mapa e GPS em tempo real para motoristas e entregadores
- Palavra-chave "Realys" com a tela bloqueada (motor de palavra-chave no próprio celular)
- IA verificadora de fake news e sistema de denúncias
- Vídeos curtos de verdade (gravar, enviar, hospedar)
- Publicação na Google Play
