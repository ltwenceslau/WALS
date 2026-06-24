# WALS

WALS e uma plataforma web para analise de reposicao, giro, cobertura de estoque, malha disponivel e prioridade de producao para confeccao.

## Versao principal para GitHub Pages

O arquivo `index.html` e a versao pronta para abrir direto no navegador pelo GitHub Pages.

Ela roda 100% no navegador:

- importa os 4 arquivos obrigatorios;
- mostra barra de carregamento e porcentagem ao selecionar cada arquivo;
- identifica produtos/modelos;
- permite selecionar quais modelos entram na reposicao;
- recebe cobertura por modelo selecionado;
- permite informar a malha usada por modelo;
- mostra divergencias;
- calcula giro, cobertura, meta e sugestao de corte;
- gera Excel final para download.
- le PDF no arquivo de estoque de malha.

Formatos aceitos:

- Estoque atual do site: `.xlsx`, `.xls` ou `.csv`
- Relatorio de vendas: `.xlsx`, `.xls` ou `.csv`
- Entradas e reposicoes: `.xlsx`, `.xls` ou `.csv`
- Estoque de malha: `.pdf`, `.xlsx`, `.xls` ou `.csv`

Arquivos principais da versao GitHub Pages:

- `index.html`
- `README.md`

O `index.html` ja contem o CSS e o JavaScript do WALS embutidos. Isso evita erro de pagina sem estilo quando o GitHub Pages nao encontra arquivos externos. O arquivo `.nojekyll` e opcional.

## Como publicar no GitHub Pages

1. Suba a pasta inteira para um repositorio no GitHub.
2. No GitHub, entre em `Settings`.
3. Abra `Pages`.
4. Em `Build and deployment`, escolha `Deploy from a branch`.
5. Em `Branch`, escolha `main` e pasta `/root`.
6. Clique em `Save`.
7. Abra o link gerado pelo GitHub Pages.

Quando abrir o link, o WALS deve aparecer como sistema, nao como README.

Depois de substituir o `index.html`, pressione `Ctrl + F5` no navegador para limpar o cache e carregar a versao nova.

## Versao Python opcional

Tambem existe uma versao FastAPI em `app/`, preparada para hospedagens Python como Render, Railway, Fly.io ou VPS com Docker.

Stack da versao Python:

- Python 3.11+
- FastAPI
- Pandas
- OpenPyXL
- Pydantic
- RapidFuzz
- Pytest ou unittest

Instalar localmente:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Executar localmente:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Acesse `http://127.0.0.1:8000`.

## Arquivos para subir no GitHub

Para publicar somente o site no GitHub Pages, envie os arquivos da pasta `SUBIR NO GIT`:

- `index.html`
- `README.md`

O `index.html` ja tem CSS e JavaScript embutidos. Se voce subir apenas `index.html` e `README.md` na raiz do repositorio, o site funciona.

Para publicar tambem o codigo Python opcional, envie a pasta completa do projeto, incluindo:

- `index.html`
- `assets/`
- `app/`
- `tests/`
- `uploads/.gitkeep`
- `outputs/.gitkeep`
- `.github/workflows/tests.yml`
- `.gitignore`
- `.dockerignore`
- `Dockerfile`
- `Procfile`
- `README.md`
- `requirements.txt`
- `run.py`
- `runtime.txt`

Nao envie:

- `.venv/`
- `.git/`
- `.agents/`
- `__pycache__/`
- `.pytest_cache/`

## Publicar como app Python

Se preferir rodar a versao FastAPI em vez da versao estatica, conecte o repositorio a um host Python.

Start command recomendado:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Com Docker, o container ja usa:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Em hosts com disco efemero, os uploads e Excels gerados existem apenas durante a sessao do servidor. Para producao futura, conecte storage persistente quando for adicionar historico.

## Fluxo do MVP

1. Upload dos 4 arquivos obrigatorios.
2. Identificacao automatica de produtos/modelos.
3. Selecao dos modelos que terao reposicao.
4. Informacao de cobertura desejada por modelo selecionado.
5. Informacao opcional da malha usada em cada modelo.
6. Conferencia de divergencias e correcoes temporarias.
7. Processamento da analise.
8. Download do Excel final.

## Regra de modelo e malha

Na tela de cobertura, marque apenas os modelos que deseja analisar para reposicao.

O campo `Malha usada no modelo` e opcional. Quando preenchido, o WALS cruza a cor do produto com essa malha no arquivo/PDF de estoque de malha. Exemplo: se o modelo usa `COTTON`, o sistema procura a cor dentro das linhas do estoque de malha que tambem mencionam `COTTON`.

Se o campo de malha ficar vazio, o WALS considera apenas a disponibilidade da cor.

## Regras implementadas

- Analise no nivel produto/cor/tamanho.
- Somente itens presentes no estoque atual entram na reposicao.
- Periodo vem da coluna Data da Aprovacao.
- Cobertura e informada por produto.
- Modelo nao selecionado ou sem cobertura e ignorado.
- XG e normalizado como G1.
- Estoque negativo entra no calculo e gera alerta.
- Meta inteligente = venda media diaria x cobertura desejada.
- Sugestao de corte = max(meta inteligente - estoque atual, 0), sem arredondamento.
- Malha binaria por cor.
- Prioridade por cor dentro do produto.
- Excel com aba por produto, resumo e tabela detalhada.

## Testes

Sem depender de pytest:

```powershell
python -m unittest discover -s tests
```

Com pytest instalado:

```powershell
pytest
```
