# IA própria do Realyz (gratuita)

O atendente IA das empresas e o copiloto de vendas usam um **modelo de linguagem aberto**, rodando no
próprio servidor. Não tem custo por mensagem e nenhuma conversa sai do servidor do Realyz.

## Instalar na VPS

```bash
bash /opt/realys/server/deploy/ia.sh
```

O script instala o Ollama, baixa o modelo **qwen2.5:3b** (licença livre, bom em português, ~2 GB) e
liga o serviço só para o próprio servidor (127.0.0.1). Depois coloque no `.env`:

```
IA_URL=http://127.0.0.1:11434
IA_MODEL=qwen2.5:3b
```

e reinicie: `systemctl restart realys`.

## Quanto de máquina precisa

- `qwen2.5:3b`: uns 3 GB de memória livres. Em 4 núcleos de CPU responde uma mensagem curta em
  alguns segundos. Bom para o piloto.
- Com mais memória (8 GB livres ou mais), dá para trocar por `qwen2.5:7b` (respostas melhores).
- Sem o modelo instalado, o Realyz usa a **IA leve**: responde pela ficha da empresa e pelo catálogo,
  com regras. Funciona sempre, só é menos conversadora.

## O que a IA sabe

Só o que está no Realyz: a ficha que a empresa preenche (horário, entrega, pagamento, trocas,
perguntas frequentes, jeito de falar) e o catálogo com os preços oficiais. Ela não inventa preço,
não fecha venda nem cobra, não passa contato por fora e chama uma pessoa da equipe quando o cliente
pede, reclama ou quer negociar.
