# WALS

WALS e um MVP web em Python para analise de reposicao, giro, cobertura de estoque, malha disponivel e prioridade de producao para confeccao.

## Stack

- Python 3.11+
- FastAPI
- Pandas
- OpenPyXL
- Pydantic
- RapidFuzz
- Pytest ou unittest

## Instalar

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Executar

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Ou:

```powershell
python run.py
```

Acesse `http://127.0.0.1:8000`.

## Subir no GitHub

1. Crie um repositorio no GitHub.
2. Envie todos os arquivos deste projeto, exceto a pasta `.venv`.
3. Confirme que a Action `tests` rodou com sucesso na aba Actions do GitHub.

Arquivos importantes para deploy:

- `requirements.txt`: dependencias Python.
- `Procfile`: comando web para plataformas que usam Procfile.
- `Dockerfile`: imagem de container pronta para deploy.
- `runtime.txt`: versao Python para hosts que leem runtime.
- `.github/workflows/tests.yml`: testes automaticos no GitHub.

## Publicar como app web

GitHub Pages hospeda apenas sites estaticos e nao executa FastAPI. Para rodar o WALS como plataforma web Python, conecte o repositorio GitHub a um host de aplicacao, como Render, Railway, Fly.io, Heroku ou VPS com Docker.

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
3. Informacao de cobertura desejada por produto.
4. Conferencia de divergencias e correcoes temporarias.
5. Processamento da analise.
6. Download do Excel final.

## Regras implementadas

- Analise no nivel produto/cor/tamanho.
- Somente itens presentes no estoque atual entram na reposicao.
- Periodo vem da coluna Data da Aprovacao.
- Cobertura e informada por produto.
- Produto sem cobertura e ignorado.
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
