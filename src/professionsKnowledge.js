// Conhecimento das profissões do Realyz (interno: o cliente não vê lista de classes, ele DIGITA o
// que faz e o app usa isto para entender, sugerir 3–4 exemplos e montar o cadastro certo).
// Também vai para o banco de dados do servidor (tabela profissoes) e para a Lotus, que responde
// "como funciona um eletricista no Realyz?", "o que um piscineiro faz?", "precisa de registro?".
//
// Cada profissão: [como trabalha, o que faz (sugestões), como cobra (1ª = padrão), onde atende, exige, mei]
//  - onde atende: 'visita' (vai até o cliente, com taxa de visita) · 'local' (o cliente vai até ele)
//    · 'online' (chamada de vídeo) · 'chamado' (na hora, com GPS) · 'evento' (no local do evento)
//    · 'domicilio' (vai até o cliente com hora marcada, sem taxa de visita)
//  - exige: registro, curso ou documento obrigatório (o Realyz confere antes de liberar quando a lei pede).
//  - mei: { cnae, ocupacao } quando a ocupação existe na lista oficial do MEI; false quando a profissão
//    é regulamentada por conselho de classe e NÃO pode ser MEI; null = conferir no Portal do Empreendedor.
// Fonte da lista do MEI: Portal do Empreendedor (gov.br) e tabelas de ocupações MEI 2026.

const m = (cnae, ocupacao) => ({ cnae, ocupacao });
const NAO_MEI = false;

export const PROF_INFO = {
  // ── Casa e reparos ──
  eletricista: ['Vai até a casa ou o comércio, avalia o problema elétrico e passa o orçamento do serviço.', ['Tomadas e interruptores', 'Chuveiro', 'Disjuntor e quadro', 'Fiação nova', 'Iluminação', 'Padrão de energia'], ['visita', 'serviço', 'hora'], 'visita', 'Curso de NR-10 recomendado para instalações maiores', m('4321-5/00', 'Eletricista em residências e estabelecimentos comerciais')],
  encanador: ['Atende vazamentos e instalações de água e esgoto na casa do cliente.', ['Vazamentos', 'Torneiras e registros', 'Desentupimento', 'Caixa d’água', 'Descarga', 'Instalação hidráulica'], ['visita', 'serviço', 'hora'], 'visita', null, m('4322-3/01', 'Encanador')],
  diarista: ['Faz a limpeza da casa por diária ou por serviço, com dia e hora marcados.', ['Faxina completa', 'Limpeza pós-obra', 'Limpeza de vidros', 'Organização', 'Passar roupa'], ['diária', 'serviço', 'hora'], 'domicilio', null, m('9700-5/00', 'Diarista')],
  pintor: ['Visita o local, mede as paredes e passa o orçamento por m² ou por serviço.', ['Pintura interna', 'Pintura externa', 'Textura e grafiato', 'Massa corrida', 'Portões e grades'], ['m²', 'serviço', 'diária'], 'visita', null, m('4330-4/04', 'Pintor(a) de parede')],
  chaveiro: ['Atende na hora para abrir portas e carros, ou faz cópias e trocas de fechadura.', ['Abertura de portas', 'Cópia de chaves', 'Troca de fechaduras', 'Chave de carro', 'Cofres'], ['serviço', 'visita'], 'chamado', null, m('9529-1/02', 'Chaveiro(a)')],
  montador: ['Monta e desmonta móveis na casa do cliente, cobrando por peça ou por serviço.', ['Guarda-roupa', 'Cozinha planejada', 'Cama e berço', 'Desmontagem para mudança', 'Painel de TV'], ['serviço', 'peça', 'hora'], 'domicilio', null, m('3329-5/01', 'Montador(a) de móveis')],
  marido: ['Faz pequenos reparos de casa num único chamado: elétrica simples, hidráulica, furos e instalações.', ['Pequenos reparos', 'Instalar suporte e prateleira', 'Trocar resistência', 'Ajustar portas', 'Instalar varal'], ['hora', 'serviço', 'visita'], 'visita', null, null],
  arcond: ['Instala, limpa e conserta ar-condicionado; avalia o local antes de instalar.', ['Instalação de split', 'Limpeza e higienização', 'Carga de gás', 'Conserto', 'Manutenção preventiva'], ['serviço', 'visita'], 'visita', null, null],
  eletrodom: ['Vai até a casa diagnosticar o eletrodoméstico e passa o orçamento do conserto.', ['Geladeira', 'Máquina de lavar', 'Fogão e forno', 'Micro-ondas', 'Secadora'], ['visita', 'serviço'], 'visita', null, null],
  jardineiro: ['Cuida de jardins por serviço ou por mês: corte de grama, poda e limpeza.', ['Corte de grama', 'Poda', 'Paisagismo', 'Limpeza de terreno', 'Plantio'], ['serviço', 'mês', 'diária'], 'domicilio', null, m('8130-3/00', 'Jardineiro(a)')],
  piscineiro: ['Faz limpeza e tratamento da água da piscina, por visita ou plano mensal.', ['Limpeza de piscina', 'Tratamento da água', 'Aspiração', 'Troca de areia do filtro'], ['mês', 'serviço', 'visita'], 'domicilio', null, m('8129-0/00', 'Piscineiro(a)')],
  dedetizador: ['Faz controle de pragas com produtos registrados; avalia o local antes.', ['Baratas', 'Cupim', 'Ratos', 'Formigas', 'Escorpião'], ['serviço', 'visita', 'm²'], 'visita', 'Empresa com licença sanitária e responsável técnico', null],
  estofados: ['Lava e higieniza sofás, colchões e tapetes no local.', ['Sofá', 'Colchão', 'Tapete', 'Cadeiras', 'Banco de carro'], ['peça', 'serviço'], 'domicilio', null, m('9609-2/99', 'Lavador(a) de estofado e sofá')],
  passadeira: ['Passa roupas em casa do cliente ou busca e entrega, por peça ou diária.', ['Passar roupas', 'Roupas sociais', 'Roupa de cama', 'Busca e entrega'], ['peça', 'diária', 'hora'], 'domicilio', null, null],
  cozinheira: ['Cozinha na casa do cliente ou prepara marmitas sob encomenda.', ['Refeições do dia a dia', 'Marmitas da semana', 'Jantar especial', 'Comida fitness'], ['diária', 'serviço', 'refeição'], 'domicilio', null, null],
  caseiro: ['Cuida de chácara, sítio ou casa de veraneio por mês.', ['Manutenção da casa', 'Cuidar do jardim', 'Cuidar de animais', 'Vigiar a propriedade'], ['mês', 'diária'], 'domicilio', null, null],
  tapeceiro: ['Reforma e troca o tecido de sofás e cadeiras, com orçamento depois de ver a peça.', ['Reforma de sofá', 'Troca de tecido', 'Cadeiras', 'Cabeceiras'], ['peça', 'serviço'], 'visita', null, m('1352-9/00', 'Tapeceiro(a)')],
  antenista: ['Instala antenas e TVs na parede, por serviço.', ['Instalar antena', 'Suporte de TV', 'Instalar parabólica', 'Ajuste de sinal'], ['serviço', 'visita'], 'visita', 'Curso de NR-35 para trabalho em altura', m('4321-5/00', 'Instalador(a) de antenas de TV')],

  // ── Construção e reforma ──
  pedreiro: ['Faz obras e reformas; visita, mede e cobra por diária, m² ou empreitada.', ['Reboco', 'Contrapiso', 'Alvenaria', 'Pequenas reformas', 'Muros'], ['diária', 'm²', 'serviço'], 'visita', null, m('4399-1/03', 'Pedreiro')],
  mestreobras: ['Coordena a obra e a equipe, por empreitada ou mês.', ['Gestão da obra', 'Contratação da equipe', 'Compra de material', 'Cronograma'], ['serviço', 'mês', 'diária'], 'visita', null, null],
  azulejista: ['Assenta pisos e azulejos, cobrando por m².', ['Piso', 'Azulejo', 'Porcelanato', 'Rejunte'], ['m²', 'diária', 'serviço'], 'visita', null, m('4330-4/05', 'Azulejista')],
  gesseiro: ['Faz forros, sancas e paredes de gesso/drywall por m².', ['Forro de gesso', 'Drywall', 'Sanca', 'Molduras'], ['m²', 'serviço'], 'visita', null, m('4330-4/03', 'Gesseiro(a)')],
  serralheiro: ['Faz e conserta portões, grades e estruturas de metal sob medida.', ['Portões', 'Grades', 'Corrimão', 'Estruturas metálicas', 'Solda'], ['serviço', 'm²', 'visita'], 'visita', null, m('2542-0/00', 'Serralheiro(a)')],
  marceneiro: ['Faz móveis sob medida; mede no local e entrega projeto e orçamento.', ['Móveis planejados', 'Armários', 'Portas', 'Reformas de móveis'], ['serviço', 'projeto'], 'visita', null, null],
  vidraceiro: ['Instala vidros, boxes e espelhos sob medida.', ['Box de banheiro', 'Janelas', 'Espelhos', 'Vidro temperado'], ['serviço', 'm²'], 'visita', null, m('4330-4/99', 'Vidraceiro de edificações')],
  telhadista: ['Conserta e troca telhados e calhas.', ['Troca de telhas', 'Goteiras', 'Calhas', 'Impermeabilização'], ['serviço', 'm²', 'diária'], 'visita', 'Curso de NR-35 (trabalho em altura)', m('4399-1/99', 'Telhador(a)')],
  marmorista: ['Corta e instala mármore e granito sob medida.', ['Pia e bancada', 'Soleiras', 'Escadas', 'Lavatórios'], ['serviço', 'm²'], 'visita', null, m('2391-5/03', 'Artesão(ã) em mármore, granito e outras pedras')],
  engcivil: ['Projeta, calcula e assina obras (ART), com visita técnica.', ['Projeto estrutural', 'Laudos', 'Acompanhamento de obra', 'Regularização'], ['projeto', 'visita', 'hora'], 'visita', 'Registro no CREA', NAO_MEI],
  arquiteto: ['Faz projetos de construção e reforma e acompanha a obra (RRT).', ['Projeto de casa', 'Reforma', 'Interiores', 'Regularização'], ['projeto', 'm²', 'hora'], 'visita', 'Registro no CAU', NAO_MEI],
  designinteriores: ['Planeja ambientes, móveis e decoração, presencial ou online.', ['Projeto de ambiente', 'Consultoria de decoração', 'Projeto 3D'], ['projeto', 'm²', 'hora'], 'visita', null, null],
  energiasolar: ['Dimensiona e instala sistemas de energia solar, com projeto e homologação.', ['Projeto fotovoltaico', 'Instalação de placas', 'Homologação na concessionária', 'Manutenção'], ['projeto', 'serviço'], 'visita', 'Responsável técnico com registro (CREA/CFT) para o projeto', null],

  // ── Veículos ──
  mecanico: ['Faz o diagnóstico na oficina ou no socorro e passa o orçamento antes de consertar.', ['Revisão', 'Freios', 'Suspensão', 'Troca de óleo', 'Socorro na rua'], ['serviço', 'hora'], 'local', null, m('4520-0/01', 'Mecânico(a) de veículos')],
  autoeletrico: ['Conserta a parte elétrica do carro: bateria, alternador, som e iluminação.', ['Bateria', 'Alternador e motor de partida', 'Faróis', 'Som e alarme'], ['serviço', 'hora'], 'local', null, m('4520-0/03', 'Eletricista de automóveis')],
  funileiro: ['Desamassa e pinta a lataria, com orçamento depois de ver o carro.', ['Funilaria', 'Pintura', 'Martelinho de ouro', 'Polimento'], ['serviço', 'peça'], 'local', null, m('4520-0/02', 'Funileiro / lanterneiro')],
  borracheiro: ['Conserta e troca pneus, também com socorro no local.', ['Conserto de pneu', 'Troca de pneu', 'Balanceamento', 'Socorro'], ['serviço'], 'chamado', null, m('4520-0/06', 'Borracheiro(a)')],
  guincho: ['Reboca o veículo de onde está até o destino; cobra saída mais km.', ['Reboque', 'Socorro mecânico', 'Transporte de moto', 'Carro sem chave'], ['serviço', 'km'], 'chamado', 'CNH categoria compatível e veículo próprio para reboque', m('5229-0/02', 'Guincheiro independente (reboque de veículos)')],
  lavajato: ['Lava e higieniza o carro no lava-rápido ou em domicílio.', ['Lavagem simples', 'Lavagem completa', 'Higienização interna', 'Polimento', 'Cera'], ['serviço'], 'local', null, m('4520-0/05', 'Lavador(a) e polidor de carro')],
  mecmoto: ['Faz revisão e conserto de motos.', ['Revisão', 'Relação e corrente', 'Freios', 'Elétrica'], ['serviço', 'hora'], 'local', null, null],
  vidroauto: ['Troca e conserta para-brisas e vidros do carro.', ['Para-brisa', 'Vidro lateral', 'Reparo de trinca', 'Película'], ['serviço', 'peça'], 'local', null, null],
  despachante: ['Cuida da documentação do veículo junto ao Detran.', ['Licenciamento', 'Transferência', 'Segunda via', 'Regularização'], ['serviço'], 'local', 'Credenciamento no Detran do estado', null],

  // ── Transporte ──
  motorista: ['Corrida chamada na hora pelo app, com GPS e tarifa Realyz.', ['Corridas na cidade', 'Aeroporto e rodoviária', 'Viagens', 'Levar crianças'], ['corrida', 'km', 'hora'], 'chamado', 'CNH com observação EAR (atividade remunerada)', null],
  motoboy: ['Faz entregas rápidas chamadas pelo app, com GPS.', ['Entregas rápidas', 'Documentos', 'Delivery de restaurante', 'Farmácia', 'Compras'], ['corrida', 'km', 'hora'], 'chamado', 'CNH A e curso de motofretista', m('5320-2/02', 'Motoboy')],
  frete: ['Faz carretos e mudanças com veículo de carga; cobra por serviço ou km.', ['Mudanças', 'Pequenos fretes', 'Móveis e eletros', 'Entulho', 'Ajudante incluso'], ['serviço', 'km', 'hora'], 'chamado', 'CNH compatível com o veículo', m('4930-2/01', 'Transportador(a) municipal de cargas não perigosas (carreto)')],
  executivo: ['Motorista particular com hora marcada para eventos, empresas e viagens.', ['Motorista executivo', 'Eventos', 'Aeroporto', 'Diária com motorista'], ['hora', 'diária', 'corrida'], 'chamado', 'CNH com EAR', null],
  escolar: ['Leva e busca alunos com rota fixa e mensalidade.', ['Rota escolar', 'Ida e volta', 'Monitor(a) no veículo'], ['mês'], 'domicilio', 'Autorização da prefeitura e curso de transporte escolar', m('4924-8/00', 'Transportador(a) escolar')],
  viagem: ['Faz viagens intermunicipais com hora marcada.', ['Viagens para outras cidades', 'Aeroporto', 'Ida e volta'], ['km', 'serviço', 'diária'], 'chamado', 'CNH com EAR', null],
  transpet: ['Leva pets ao veterinário, pet shop ou viagem, com caixa de transporte.', ['Veterinário', 'Banho e tosa', 'Viagem com pet'], ['corrida', 'km'], 'chamado', null, null],
  bikeentrega: ['Faz entregas de bicicleta em distâncias curtas.', ['Entregas no bairro', 'Documentos', 'Delivery'], ['corrida', 'km'], 'chamado', null, null],
  acessivel: ['Transporte adaptado para pessoas com deficiência ou mobilidade reduzida.', ['Cadeira de rodas', 'Consultas e exames', 'Acompanhante'], ['corrida', 'km', 'hora'], 'chamado', 'Veículo adaptado e CNH com EAR', null],

  // ── Saúde e bem-estar ──
  psicologo: ['Atende por sessões, presencial ou online, com sigilo.', ['Ansiedade', 'Depressão', 'Terapia de casal', 'Adolescentes', 'Atendimento online'], ['sessão'], 'online', 'Registro no CRP', NAO_MEI],
  nutricionista: ['Faz consulta com avaliação e plano alimentar, presencial ou online.', ['Emagrecimento', 'Nutrição esportiva', 'Gestantes', 'Reeducação alimentar'], ['consulta'], 'online', 'Registro no CRN', NAO_MEI],
  medico: ['Atende em consulta presencial, domiciliar ou por telemedicina.', ['Clínico geral', 'Consulta domiciliar', 'Telemedicina', 'Atestados e receitas'], ['consulta'], 'online', 'Registro no CRM', NAO_MEI],
  enfermeiro: ['Faz curativos, aplicações e cuidados em domicílio.', ['Curativos', 'Aplicação de injeção', 'Sonda', 'Cuidados pós-cirúrgicos'], ['visita', 'plantão', 'hora'], 'domicilio', 'Registro no COREN', NAO_MEI],
  fisioterapeuta: ['Atende por sessões, em clínica ou em domicílio.', ['Reabilitação', 'Ortopedia', 'Respiratória', 'Pilates', 'Atendimento domiciliar'], ['sessão'], 'domicilio', 'Registro no CREFITO', NAO_MEI],
  fono: ['Atende fala, voz e audição por sessões.', ['Fala infantil', 'Voz', 'Deglutição', 'Audição'], ['sessão'], 'local', 'Registro no CRFa', NAO_MEI],
  dentista: ['Atende em consultório com avaliação e orçamento do tratamento.', ['Avaliação', 'Limpeza', 'Restauração', 'Clareamento', 'Urgência'], ['consulta', 'serviço'], 'local', 'Registro no CRO', NAO_MEI],
  terapeutaocup: ['Atende por sessões para autonomia no dia a dia.', ['Desenvolvimento infantil', 'Reabilitação', 'Idosos'], ['sessão'], 'domicilio', 'Registro no CREFITO', NAO_MEI],
  massoterapeuta: ['Faz massagens por sessão, no espaço dele ou em domicílio.', ['Relaxante', 'Drenagem linfática', 'Desportiva', 'Quick massage'], ['sessão', 'hora'], 'domicilio', null, null],
  doula: ['Acompanha a gestante antes, durante e depois do parto.', ['Acompanhamento de parto', 'Pré-natal', 'Pós-parto'], ['pacote', 'hora'], 'domicilio', null, null],
  acompanhante: ['Acompanha pacientes em hospital, consultas ou em casa.', ['Acompanhamento hospitalar', 'Consultas', 'Pernoite'], ['plantão', 'hora', 'diária'], 'domicilio', null, null],
  psicopedagogo: ['Atende dificuldades de aprendizagem por sessões.', ['Avaliação', 'Dislexia', 'TDAH', 'Reforço com método'], ['sessão'], 'local', null, null],

  // ── Beleza e estética ──
  cabeleireiro: ['Atende no salão ou em domicílio, com horário marcado.', ['Corte', 'Escova', 'Coloração', 'Progressiva', 'Penteados'], ['serviço'], 'local', null, m('9602-5/01', 'Cabeleireiro(a)')],
  barbeiro: ['Atende na barbearia com horário marcado.', ['Corte masculino', 'Barba', 'Pigmentação', 'Sobrancelha'], ['serviço'], 'local', null, m('9602-5/01', 'Barbeiro')],
  manicure: ['Faz unhas no salão ou em domicílio.', ['Mão e pé', 'Alongamento em gel', 'Esmaltação em gel', 'Spa dos pés'], ['serviço'], 'local', null, m('9602-5/01', 'Manicure/pedicure')],
  maquiador: ['Faz maquiagem para eventos, no local ou em domicílio.', ['Noivas', 'Formaturas', 'Festas', 'Ensaios'], ['serviço'], 'domicilio', null, m('9602-5/02', 'Maquiador(a)')],
  esteticista: ['Faz tratamentos de pele e corpo por sessão ou pacote.', ['Limpeza de pele', 'Drenagem', 'Peeling', 'Massagem modeladora'], ['sessão', 'pacote'], 'local', null, m('9602-5/02', 'Esteticista')],
  sobrancelha: ['Faz design e coloração de sobrancelhas.', ['Design', 'Henna', 'Micropigmentação', 'Laminação'], ['serviço'], 'local', null, null],
  cilios: ['Aplica extensão e lifting de cílios.', ['Fio a fio', 'Volume russo', 'Lifting', 'Manutenção'], ['serviço'], 'local', null, null],
  depilacao: ['Faz depilação com cera ou linha.', ['Cera', 'Linha', 'Virilha', 'Pernas'], ['serviço'], 'local', null, m('9602-5/02', 'Depilador(a)')],
  trancista: ['Faz tranças e penteados afro.', ['Box braids', 'Nagô', 'Twist', 'Manutenção'], ['serviço'], 'local', null, null],
  tatuador: ['Faz tatuagens com orçamento pelo tamanho e arte, em estúdio.', ['Tatuagem', 'Fine line', 'Cobertura', 'Piercing'], ['serviço', 'hora'], 'local', 'Estúdio com licença sanitária', m('9609-2/06', 'Tatuador(a)')],

  // ── Cuidados e família ──
  baba: ['Cuida de crianças por hora, diária ou mês.', ['Por hora', 'Noturna', 'Folguista', 'Ajuda com tarefas'], ['hora', 'diária', 'mês'], 'domicilio', null, null],
  cuidadoridoso: ['Cuida de idosos em casa, por plantão ou mês.', ['Plantão diurno', 'Plantão noturno', 'Medicação nos horários', 'Acompanhamento'], ['plantão', 'hora', 'mês'], 'domicilio', 'Curso de cuidador recomendado', m('8712-3/00', 'Cuidador(a) de idosos e enfermos')],
  domestica: ['Trabalha na casa do cliente com carteira assinada ou diária.', ['Limpeza', 'Cozinha', 'Roupas'], ['mês', 'diária'], 'domicilio', null, null],
  libras: ['Interpreta Libras em consultas, eventos e reuniões.', ['Consultas', 'Eventos', 'Aulas', 'Online'], ['hora', 'evento'], 'online', null, null],
  acompanhantepcd: ['Acompanha pessoas com deficiência no dia a dia.', ['Consultas', 'Passeios', 'Escola', 'Rotina em casa'], ['hora', 'diária'], 'domicilio', null, null],
  recreador: ['Anima festas e eventos infantis com brincadeiras.', ['Festas infantis', 'Pintura facial', 'Gincanas', 'Eventos'], ['evento', 'hora'], 'evento', null, m('9329-8/99', 'Animador(a) de festas')],

  // ── Pets ──
  vetpet: ['Atende pets em clínica ou em domicílio.', ['Consulta', 'Vacinas', 'Castração', 'Atendimento domiciliar'], ['consulta', 'serviço'], 'domicilio', 'Registro no CRMV', NAO_MEI],
  banhotosa: ['Dá banho e tosa no pet shop ou com leva e traz.', ['Banho', 'Tosa', 'Hidratação', 'Leva e traz'], ['serviço'], 'local', null, m('9609-2/08', 'Banhista de animais domésticos')],
  adestrador: ['Treina cães por aula ou pacote, na casa do cliente.', ['Obediência', 'Comportamento', 'Filhotes', 'Passeio sem puxar'], ['aula', 'pacote'], 'domicilio', null, m('9609-2/07', 'Adestrador(a) de animais')],
  dogwalker: ['Passeia com cães por passeio ou plano mensal.', ['Passeio de 30 min', 'Passeio de 1 h', 'Plano mensal'], ['passeio', 'mês'], 'domicilio', null, null],
  petsitter: ['Cuida do pet na casa do dono ou hospeda.', ['Visita diária', 'Hospedagem', 'Medicação', 'Alimentação'], ['diária', 'visita'], 'domicilio', null, null],

  // ── Festas e eventos ──
  dj: ['Toca em festas e eventos; cobra por evento ou hora, com ou sem som e luz.', ['Casamentos', 'Aniversários', 'Formaturas', 'Som e iluminação'], ['evento', 'hora'], 'evento', null, m('9001-9/06', 'Disc jockey (DJ) ou video jockey (VJ)')],
  fotografo: ['Fotografa eventos e ensaios, com pacote de fotos editadas.', ['Casamentos', 'Ensaios', 'Aniversários', 'Produtos', 'Eventos de empresa'], ['evento', 'hora', 'pacote'], 'evento', null, m('7420-0/01', 'Fotógrafo(a)')],
  buffet: ['Serve comida e bebida em eventos, por pessoa.', ['Festas', 'Casamentos', 'Coffee break', 'Churrasco'], ['pessoa', 'evento'], 'evento', 'Licença sanitária para manipular alimentos', null],
  decoracao: ['Monta a decoração da festa no local.', ['Festas infantis', 'Casamentos', 'Balões', 'Mesa posta'], ['evento', 'serviço'], 'evento', null, null],
  cerimonialista: ['Organiza o evento e coordena no dia.', ['Casamentos', 'Formaturas', 'Assessoria do dia', 'Roteiro'], ['evento'], 'evento', null, null],
  musico: ['Banda ou músico para eventos, por show ou hora.', ['Banda para festa', 'Casamentos', 'Bailes', 'Bares'], ['show', 'hora', 'evento'], 'evento', null, m('9001-9/02', 'Cantor(a)/músico(a)')],
  confeiteiro: ['Faz bolos e doces sob encomenda, com prazo combinado.', ['Bolos de festa', 'Docinhos', 'Bolo de casamento', 'Bolos de pote'], ['peça', 'kg', 'serviço'], 'local', 'Boas práticas de manipulação de alimentos', m('1091-1/02', 'Confeiteiro(a)')],
  videomaker: ['Filma e edita vídeos de eventos e empresas.', ['Casamentos', 'Eventos', 'Vídeo institucional', 'Reels'], ['evento', 'hora', 'projeto'], 'evento', null, m('7420-0/04', 'Filmador(a)')],
  segevento: ['Faz segurança e controle de acesso em festas.', ['Portaria do evento', 'Controle de acesso', 'Segurança de festa'], ['evento', 'hora'], 'evento', 'Curso de vigilante e empresa autorizada pela Polícia Federal para segurança armada', null],
  florista: ['Faz arranjos e decoração floral sob encomenda.', ['Buquê', 'Arranjos de mesa', 'Decoração de igreja', 'Coroas'], ['peça', 'evento'], 'local', null, null],
  palhaco: ['Faz shows de palhaço e mágica em festas.', ['Show de mágica', 'Palhaço', 'Brincadeiras'], ['evento', 'hora'], 'evento', null, m('9329-8/99', 'Animador(a) de festas')],

  // ── Artistas ──
  cantor: ['Faz shows por cachê; monta a vitrine em Perfil › Shows e contratação.', ['Sertanejo', 'Pagode', 'Gospel', 'Acústico (voz e violão)', 'Casamentos', 'Bares'], ['show', 'hora', 'publicidade'], 'evento', null, m('9001-9/02', 'Cantor(a)/músico(a)')],
  instrumentista: ['Toca em cerimônias, eventos e gravações.', ['Violino em casamento', 'Sax', 'Piano', 'Gaita e sanfona', 'Gravações'], ['show', 'hora', 'serviço'], 'evento', null, m('9001-9/02', 'Cantor(a)/músico(a)')],
  humorista: ['Faz shows de humor e stand-up por cachê.', ['Stand-up', 'Eventos de empresa', 'Festas', 'Mestre de cerimônias'], ['show', 'publicidade'], 'evento', null, null],
  dancarino: ['Faz apresentações e coreografias por cachê.', ['Shows de dança', 'Coreografia de casamento', 'Eventos'], ['show', 'hora', 'serviço'], 'evento', null, null],
  ator: ['Atua em eventos, festas, teatro e comerciais.', ['Animação de festa', 'Personagens', 'Teatro', 'Comerciais'], ['show', 'hora', 'publicidade'], 'evento', 'Registro profissional (DRT) para trabalhos de ator', null],
  artistavisual: ['Cria obras sob encomenda e faz arte ao vivo em eventos.', ['Pintura ao vivo', 'Grafite e murais', 'Caricatura em eventos', 'Quadros sob encomenda'], ['serviço', 'm²', 'evento'], 'evento', null, null],

  // ── Gamers e streamers ──
  streamer: ['É contratado para publicidade nas lives, reels e stories.', ['Publi na live', 'Reels patrocinado', 'Stories com a marca', 'Lives de jogo'], ['publicidade', 'hora'], 'online', null, null],
  coachgame: ['Dá aulas de jogo por hora, online.', ['Aulas de Free Fire', 'Aulas de LoL', 'Análise de partidas', 'Treino de mira'], ['hora', 'pacote'], 'online', null, null],
  proplayer: ['Joga em times e campeonatos; contratado por partida ou evento.', ['Jogar no seu time', 'Campeonatos', 'Partidas em dupla', 'Presença em eventos'], ['partida', 'evento', 'publicidade'], 'online', null, null],
  caster: ['Narra e comenta campeonatos ao vivo.', ['Narração', 'Comentarista', 'Apresentação de evento'], ['evento', 'hora'], 'online', null, null],
  gamecreator: ['Produz vídeos de jogos e faz publicidade em vídeo.', ['Vídeos de gameplay', 'Review de jogos', 'Publi em vídeo', 'Edição'], ['publicidade', 'projeto'], 'online', null, null],

  // ── Aulas ──
  professor: ['Dá aulas particulares presenciais ou online, por aula ou pacote.', ['Reforço escolar', 'Matemática', 'Português', 'Preparação para o ENEM'], ['aula', 'hora', 'pacote'], 'online', null, m('8599-6/99', 'Professor(a) particular')],
  personal: ['Treina alunos por aula ou plano mensal.', ['Musculação', 'Emagrecimento', 'Treino em casa', 'Idosos', 'Funcional'], ['aula', 'mês', 'pacote'], 'domicilio', 'Registro no CREF', NAO_MEI],
  idiomas: ['Dá aulas de idioma presenciais ou online.', ['Inglês', 'Espanhol', 'Conversação', 'Para viagem'], ['aula', 'mês'], 'online', null, m('8593-7/00', 'Instrutor(a) de idiomas')],
  musicaaula: ['Dá aulas de instrumento ou canto.', ['Violão', 'Teclado', 'Canto', 'Bateria'], ['aula', 'mês'], 'online', null, m('8592-9/03', 'Instrutor(a) de música')],
  autoescola: ['Dá aulas práticas de direção.', ['Aulas para habilitados', 'Perder o medo de dirigir', 'Baliza'], ['aula', 'pacote'], 'domicilio', 'Credenciamento no Detran como instrutor', null],
  natacao: ['Dá aulas de natação por aula ou mês.', ['Bebês', 'Crianças', 'Adultos', 'Hidroginástica'], ['aula', 'mês'], 'local', 'Registro no CREF', NAO_MEI],
  danca: ['Dá aulas de dança individuais ou em grupo.', ['Dança de salão', 'Coreografia de casamento', 'Zumba', 'Ballet'], ['aula', 'mês'], 'local', null, m('8592-9/99', 'Instrutor(a) de arte e cultura em geral')],
  lutas: ['Dá aulas de artes marciais.', ['Jiu-jitsu', 'Muay thai', 'Boxe', 'Defesa pessoal'], ['aula', 'mês'], 'local', null, null],
  yoga: ['Dá aulas de yoga e meditação.', ['Yoga', 'Meditação', 'Alongamento', 'Online'], ['aula', 'mês'], 'online', null, null],
  informaticaaula: ['Ensina informática básica e programas.', ['Informática básica', 'Excel', 'Celular para idosos', 'Internet'], ['aula', 'pacote'], 'online', null, m('8599-6/03', 'Instrutor(a) de informática')],
  culinaria: ['Dá aulas de culinária presenciais ou online.', ['Confeitaria', 'Cozinha básica', 'Massas', 'Comida saudável'], ['aula', 'pacote'], 'online', null, null],

  // ── Tecnologia ──
  dev: ['Desenvolve sites, apps e sistemas por projeto.', ['Sites', 'Aplicativos', 'Lojas virtuais', 'Sistemas sob medida', 'Manutenção'], ['projeto', 'hora', 'mês'], 'online', null, null],
  tecnico: ['Conserta computadores e notebooks, no local ou em casa.', ['Formatação', 'Conserto de PC e notebook', 'Limpeza', 'Backup'], ['serviço', 'visita', 'hora'], 'visita', null, m('9511-8/00', 'Técnico(a) de manutenção de computador')],
  celularconserto: ['Conserta celulares com orçamento depois do diagnóstico.', ['Troca de tela', 'Bateria', 'Conector de carga', 'Software'], ['serviço'], 'local', null, null],
  redes: ['Instala e configura redes e Wi-Fi.', ['Wi-Fi da casa', 'Cabeamento', 'Rede de empresa', 'Roteadores'], ['serviço', 'visita', 'hora'], 'visita', null, m('6190-6/99', 'Instalador(a) de rede de computadores')],
  cameras: ['Instala câmeras, alarmes e interfones.', ['Câmeras', 'Alarme', 'Interfone', 'Cerca elétrica'], ['serviço', 'visita'], 'visita', null, null],
  suporteti: ['Dá suporte de TI para empresas, por mês ou chamado.', ['Suporte mensal', 'Servidores', 'E-mails', 'Backup'], ['mês', 'hora', 'serviço'], 'online', null, null],
  segdigital: ['Protege contas e dispositivos contra golpes e invasões.', ['Recuperar conta', 'Proteção de dados', 'Antivírus', 'Orientação contra golpes'], ['serviço', 'hora'], 'online', null, null],

  // ── Criativos e marketing ──
  designer: ['Cria identidade visual e artes por projeto.', ['Logo', 'Identidade visual', 'Artes para redes', 'Cardápio'], ['projeto', 'peça'], 'online', null, null],
  socialmedia: ['Cuida das redes sociais da empresa por mês.', ['Posts', 'Stories', 'Anúncios', 'Relatórios'], ['mês', 'pacote'], 'online', null, null],
  editorvideo: ['Edita vídeos por projeto ou minuto.', ['Reels', 'YouTube', 'Casamento', 'Institucional'], ['projeto', 'hora'], 'online', null, m('5921-0/99', 'Editor(a) de vídeo')],
  redator: ['Escreve textos para sites, redes e anúncios.', ['Textos para site', 'Legendas', 'Blog', 'Anúncios'], ['projeto', 'peça'], 'online', null, null],
  tradutor: ['Traduz textos e documentos.', ['Tradução simples', 'Documentos', 'Legendas'], ['peça', 'projeto'], 'online', 'Concurso de tradutor juramentado para traduções oficiais', null],
  ilustrador: ['Cria ilustrações sob encomenda.', ['Ilustração', 'Personagens', 'Livro infantil', 'Retrato'], ['peça', 'projeto'], 'online', null, null],
  locutor: ['Grava locuções para anúncios, rádios e URA.', ['Comercial de rádio', 'Carro de som', 'Vinhetas', 'URA de telefone'], ['peça', 'serviço'], 'online', null, m('9609-2/99', 'Locutor(a) de mensagens fonadas e ao vivo')],
  fotoproduto: ['Fotografa produtos para lojas e cardápios.', ['Fotos de produto', 'Cardápio', 'Catálogo', 'Fundo infinito'], ['peça', 'pacote'], 'local', null, m('7420-0/01', 'Fotógrafo(a)')],

  // ── Jurídico e finanças ──
  advogado: ['Atende por consulta e cobra honorários pela causa.', ['Trabalhista', 'Família e divórcio', 'Previdenciário', 'Consumidor', 'Contratos'], ['consulta', 'serviço'], 'online', 'Inscrição na OAB', NAO_MEI],
  contador: ['Cuida da contabilidade e impostos por mês ou serviço.', ['MEI', 'Imposto de renda', 'Abertura de empresa', 'Folha de pagamento'], ['mês', 'serviço'], 'online', 'Registro no CRC', NAO_MEI],
  consultor: ['Orienta empresas em gestão e vendas.', ['Gestão', 'Vendas', 'Processos', 'Plano de negócios'], ['hora', 'projeto'], 'online', null, null],
  corretorimoveis: ['Intermedeia compra, venda e locação de imóveis, cobrando comissão.', ['Venda', 'Locação', 'Avaliação', 'Documentação'], ['serviço'], 'local', 'Registro no CRECI', NAO_MEI],
  corretorseguros: ['Faz cotação e venda de seguros.', ['Auto', 'Residencial', 'Vida', 'Empresarial'], ['serviço'], 'online', 'Registro na SUSEP', null],
  consultorfin: ['Organiza finanças pessoais e investimentos.', ['Organizar dívidas', 'Orçamento', 'Investimentos', 'Aposentadoria'], ['hora', 'pacote'], 'online', 'Certificação (CEA/CFP) para recomendar investimentos', null],
  sindico: ['Administra condomínios por mês.', ['Gestão do condomínio', 'Assembleias', 'Manutenção', 'Prestação de contas'], ['mês'], 'local', null, null],

  // ── Agro ──
  agronomo: ['Dá assistência técnica e receituário agronômico na propriedade.', ['Análise de solo', 'Receituário', 'Planejamento de safra', 'Laudos'], ['visita', 'hectare', 'hora'], 'visita', 'Registro no CREA', NAO_MEI],
  veterinario: ['Atende animais de produção na propriedade.', ['Gado', 'Vacinação', 'Reprodução', 'Emergência'], ['visita', 'serviço'], 'visita', 'Registro no CRMV', NAO_MEI],
  droneagro: ['Pulveriza e mapeia lavouras com drone, por hectare.', ['Pulverização', 'Mapeamento', 'Contagem de plantas'], ['hectare'], 'visita', 'Registro do drone na ANAC e no MAPA e curso de aplicação aérea', null],
  tratorista: ['Opera trator e máquinas agrícolas por hora ou diária.', ['Preparo de solo', 'Plantio', 'Roçada', 'Transporte na lavoura'], ['hora', 'diária', 'hectare'], 'visita', 'CNH compatível', null],
  inseminador: ['Faz inseminação artificial no rebanho.', ['Inseminação', 'IATF', 'Controle de cio'], ['serviço', 'visita'], 'visita', 'Curso de inseminação artificial', null],
  irrigacao: ['Projeta e instala sistemas de irrigação.', ['Gotejamento', 'Aspersão', 'Manutenção', 'Projeto'], ['projeto', 'serviço', 'hectare'], 'visita', null, null],
  topografo: ['Faz levantamentos e medições de terrenos.', ['Levantamento topográfico', 'Georreferenciamento', 'Demarcação'], ['hectare', 'serviço'], 'visita', 'Registro no CREA ou no CFT', null],
  zootecnista: ['Orienta nutrição e manejo do rebanho.', ['Nutrição animal', 'Manejo', 'Planejamento'], ['visita', 'mês'], 'visita', 'Registro no CRMV', NAO_MEI],
  ferrador: ['Ferra e cuida dos cascos de cavalos.', ['Ferrageamento', 'Casqueamento'], ['serviço'], 'visita', null, null],

  // ── Moda e costura ──
  costureira: ['Faz ajustes e roupas sob medida, por peça.', ['Ajustes e barras', 'Roupas sob medida', 'Consertos', 'Uniformes'], ['peça', 'serviço'], 'local', null, m('1412-6/01', 'Costureiro(a) de roupas')],
  alfaiate: ['Faz ternos e roupas sociais sob medida.', ['Ternos', 'Ajustes', 'Roupa social'], ['peça'], 'local', null, m('1412-6/02', 'Alfaiate')],
  sapateiro: ['Conserta calçados, bolsas e artigos de couro.', ['Sola e salto', 'Costura', 'Tingimento', 'Bolsas'], ['peça', 'serviço'], 'local', null, m('9529-1/01', 'Sapateiro(a)')],
  estilista: ['Cria peças e coleções sob encomenda.', ['Vestido de festa', 'Coleção', 'Modelagem'], ['projeto', 'peça'], 'local', null, null],

  // ── Turismo e passeios ──
  guiaturismo: ['Conduz passeios e roteiros por pessoa ou grupo.', ['City tour', 'Roteiros', 'Passeios históricos'], ['pessoa', 'passeio', 'diária'], 'local', 'Cadastro no Cadastur', m('7912-1/00', 'Guia de turismo')],
  ecoturismo: ['Conduz trilhas e passeios na natureza.', ['Trilhas', 'Cachoeiras', 'Rapel', 'Camping'], ['pessoa', 'passeio'], 'local', 'Cadastro no Cadastur', null],
  passeiobarco: ['Leva grupos para passeios de barco.', ['Passeio de barco', 'Pescaria', 'Pôr do sol'], ['pessoa', 'passeio', 'hora'], 'local', 'Habilitação náutica (Marinha)', null],
  receptivo: ['Recebe turistas com traslados e roteiros.', ['Traslado', 'Recepção no aeroporto', 'Roteiros'], ['pessoa', 'serviço'], 'local', 'Cadastro no Cadastur', null],

  // ── Meio ambiente e reciclagem ──
  reciclaveis: ['Recolhe recicláveis em casas e comércios.', ['Papelão', 'Plástico', 'Metais', 'Coleta programada'], ['coleta', 'kg'], 'domicilio', null, m('3811-4/00', 'Coletor de resíduos não perigosos')],
  cacamba: ['Aluga caçamba para entulho por período.', ['Caçamba de entulho', 'Troca de caçamba', 'Remoção'], ['serviço', 'diária'], 'domicilio', 'Licença ambiental da prefeitura', null],
  eletronicodescarte: ['Recolhe eletrônicos para descarte correto.', ['Computadores', 'Celulares', 'Eletrodomésticos', 'Pilhas e baterias'], ['coleta', 'kg'], 'domicilio', null, null],
  moveisvelhos: ['Retira móveis e entulhos de casa.', ['Retirada de móveis', 'Limpeza de casa', 'Descarte correto'], ['serviço', 'coleta'], 'domicilio', null, null],
  limpezaterreno: ['Roça e limpa terrenos por m² ou serviço.', ['Roçada', 'Capina', 'Retirada de entulho'], ['m²', 'serviço', 'diária'], 'visita', null, null],

  // ── Segurança ──
  vigilante: ['Faz vigilância por plantão, contratado por empresa autorizada.', ['Plantão diurno', 'Plantão noturno', 'Ronda'], ['plantão', 'hora', 'mês'], 'local', 'Curso de vigilante e vínculo com empresa autorizada pela Polícia Federal', null],
  porteiro: ['Faz portaria e controle de acesso.', ['Portaria', 'Controle de acesso', 'Recebimento de encomendas'], ['plantão', 'mês', 'hora'], 'local', null, null],
  escolta: ['Faz escolta e segurança pessoal com veículo.', ['Escolta de carga', 'Segurança pessoal', 'Eventos'], ['hora', 'diária', 'km'], 'chamado', 'Curso de vigilante com extensão em escolta e empresa autorizada pela Polícia Federal', null],
};

const ATENDE_TEXTO = { visita: 'vai até você (com taxa de visita)', local: 'você vai até o local dele', online: 'atende online, por chamada de vídeo', chamado: 'chamado na hora, pelo GPS', evento: 'vai até o local do evento', domicilio: 'vai até você com hora marcada' };

// Informação de uma profissão, já no formato de uso.
export function profInfo(key) {
  const x = PROF_INFO[key];
  if (!x) return null;
  const [como, funcoes, cobra, atende, exige, mei] = x;
  return { key, como, funcoes, cobra, atende, atendeTexto: ATENDE_TEXTO[atende] || '', exige: exige || null, mei: mei === undefined ? null : mei, visita: atende === 'visita' };
}

// Texto para a Lotus responder "como funciona um X?" / "o que um X faz?".
export function profExplica(key, label) {
  const i = profInfo(key);
  if (!i) return null;
  const meiTxt = i.mei === false ? ' Por ser profissão regulamentada, não pode ser MEI.' : i.mei ? ` No MEI, a ocupação é "${i.mei.ocupacao}" (CNAE ${i.mei.cnae}).` : '';
  return `${label}: ${i.como} No Realyz, ${i.atendeTexto}, e cobra por ${i.cobra.join(' ou por ')}. Faz, por exemplo: ${i.funcoes.slice(0, 4).join(', ')}.${i.exige ? ` Exige: ${i.exige}.` : ''}${meiTxt}`;
}

// Passo a passo oficial e gratuito para abrir o MEI (Portal do Empreendedor, gov.br).
export const MEI_PASSOS = [
  { t: 'Confira se a sua ocupação pode ser MEI', d: 'Profissões com conselho de classe (médico, advogado, psicólogo, engenheiro, arquiteto, dentista, contador…) não podem ser MEI. O Realyz já diz isso quando você escolhe a profissão.' },
  { t: 'Tenha a conta gov.br prata ou ouro', d: 'Entre no app gov.br. Para subir de nível, use a biometria do banco, a CNH digital ou a validação facial.' },
  { t: 'Entre no Portal do Empreendedor', d: 'Acesse gov.br/mei, toque em "Quero ser MEI" e depois em "Formalize-se". É gratuito: desconfie de qualquer site que cobre para abrir.' },
  { t: 'Preencha seus dados e a atividade', d: 'Escolha a ocupação principal (e até 15 secundárias), o endereço e se vai atender em local fixo ou não. O Realyz mostra a ocupação certa da sua profissão.' },
  { t: 'Baixe o certificado (CCMEI)', d: 'O CNPJ sai na hora. Guarde o Certificado da Condição de MEI e volte aqui para colocar o seu CNPJ.' },
  { t: 'Pague o DAS todo mês', d: 'É a contribuição mensal do MEI (inclui o INSS). Dá para pagar pelo app MEI ou pelo Portal do Simples Nacional, até com débito automático.' },
];
