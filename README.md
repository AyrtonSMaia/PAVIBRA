# PAVIBRA — Suprimentos

Portal independente com duas áreas: pedidos de compra (`/`) e gestão de materiais (`/materiais`). Login por e-mail e senha, sem dependência de conta ChatGPT.

## Publicação no Render

O `render.yaml` provisiona um serviço Node.js 24 e um disco persistente de 1 GB. Os dois módulos usam a mesma sessão. O plano utiliza 0,5 CPU / 512 MB; revise o custo apresentado no Render antes de aplicar.

- Build: `npm ci --include=dev && npm run build`
- Start: `npm start` (ouve em `0.0.0.0` e usa `PORT` do Render)
- Health: `/healthz`
- Persistência: `DATA_DIR` no disco, incluindo SQLite, sessões, anexos e documentos.
- `ADMIN_SETUP_KEY` é gerada pelo Render, nunca incluída no código.

## Primeiro acesso

1. No painel Render do serviço, abra Environment e consulte a chave `ADMIN_SETUP_KEY` de modo privado.
2. Abra `/setup` no novo endereço, informe a chave e crie a senha do administrador (mínimo 12 caracteres).
3. Entre em Usuários e acessos, cadastre os colaboradores e gere os links de ativação. Compartilhe cada link diretamente com a pessoa correta.
4. Links de ativação expiram em 48 horas e só podem ser usados uma vez. O administrador pode gerar outro link de ativação para recuperação de senha.

Perfis: Administrador (usuários e todos os pedidos), Gestor (aprova pedidos), Compras (emite após aprovação), Visitante (somente consulta). O bloqueio de um cadastro invalida o acesso nas próximas requisições. Sessões expiram em 8 horas e são revogadas no logout.

## Migração

Os sites antigos permanecem disponíveis. Este repositório não contém dados da obra, PDFs de projetos nem credenciais.

- Gestão de materiais: exporte o backup JSON no site atual. No novo módulo Materiais, use Importar backup e revise a prévia de importação antes de salvar.
- Projetos: os PDFs já fornecidos devem ser transferidos autenticadamente via `POST /api/migration`, em multipart com `key=project-pdfs/<caminho>.pdf` e `file`. O manifesto usa o tipo JSON `projects` e URLs `/api/project-file/<caminho>.pdf`. Nada é publicado em assets estáticos.
- Anexos de qualidade e pedidos: exportação e transferência precisam ser conferidas antes da troca definitiva do endereço. A migração dos anexos não acontece com o simples envio deste código ao GitHub.
- JSON de backup administrativo: `GET /api/backup`. Este arquivo contém registros e referências de anexos; os arquivos binários devem ser exportados separadamente.

Não desative os sites anteriores antes de conferir materiais, quantidades, pedidos, usuários e documentos no novo ambiente.

## Desenvolvimento e verificação

```bash
npm ci
npm run build
npm test
```

Configure um `DATA_DIR` local e uma `ADMIN_SETUP_KEY` aleatória com pelo menos 24 caracteres. Para testes, o script usa diretório temporário e remove apenas seus próprios dados de teste.

As migrações SQL versionadas são aplicadas no início do serviço, em transação e com conferência de hash. Não altere migrações já aplicadas: adicione outra migração.

## Operação

O disco persistente pertence a uma instância; atualizações podem provocar uma breve interrupção. Não aumente o número de instâncias com este armazenamento local. Para escala horizontal, migre o banco para um serviço gerenciado e os anexos para object storage.

Guarde cópias externas dos dados e documentos. Snapshots de disco não substituem backup consistente do banco e dos anexos. Nunca grave senhas, chaves, arquivos `.env`, banco ou PDFs operacionais neste repositório.
