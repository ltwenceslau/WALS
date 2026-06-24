(function () {
    const fileKinds = {
        currentStock: "Estoque atual do site",
        sales: "Relatorio de vendas",
        entries: "Entradas e reposicoes",
        fabric: "Estoque de malha"
    };

    const requiredColumns = {
        currentStock: ["nome_estoque", "cor", "tamanho", "estoque_atual"],
        sales: ["nome_estoque", "data_aprovacao", "cor", "tamanho", "quantidade_vendida"],
        entries: ["nome_estoque", "cor", "tamanho", "quantidade_entrada"],
        fabric: ["cor"]
    };

    const aliases = {
        codigo_estoque: ["cod_estoque", "codigo_estoque", "codigo_do_estoque", "cod_estoq", "sku", "referencia", "codigo"],
        nome_estoque: ["nome_estoque", "nome_do_estoque", "descricao", "produto_descricao", "nome", "item"],
        produto: ["produto", "modelo", "produto_modelo", "modelo_produto", "nome_produto"],
        cor: ["cor", "cores", "color", "nome_cor"],
        tamanho: ["tamanho", "tam", "grade", "variacao"],
        estoque_atual: ["estoque_atual", "estoque", "saldo", "saldo_atual", "quantidade", "qtd", "qtde", "disponivel"],
        data_aprovacao: ["data_da_aprovacao", "data_aprovacao", "aprovacao", "data_venda", "data_do_pedido", "data"],
        data_entrada: ["data_entrada", "data_da_entrada", "data_movimentacao", "data_da_movimentacao", "data_reposicao", "data"],
        quantidade_vendida: ["qtd", "qtde", "quantidade", "quantidade_vendida", "qtd_vendida", "vendido", "vendas"],
        quantidade_entrada: ["qtd", "qtde", "quantidade", "quantidade_entrada", "qtd_entrada", "entrada", "reposicao", "movimentacao"],
        valor: ["valor", "valor_total", "preco", "receita", "faturamento"],
        status_disponibilidade: ["status", "disponibilidade", "status_disponibilidade"]
    };

    const kindColumns = {
        currentStock: ["codigo_estoque", "nome_estoque", "produto", "cor", "tamanho", "estoque_atual"],
        sales: ["codigo_estoque", "nome_estoque", "produto", "cor", "tamanho", "data_aprovacao", "quantidade_vendida", "valor"],
        entries: ["codigo_estoque", "nome_estoque", "produto", "cor", "tamanho", "data_entrada", "quantidade_entrada"],
        fabric: ["cor", "status_disponibilidade"]
    };

    const outputColumns = [
        ["codigo_estoque", "Codigo Estoque"],
        ["nome_estoque", "Nome Estoque"],
        ["produto", "Produto"],
        ["cor", "Cor"],
        ["tamanho", "Tamanho"],
        ["estoque_atual", "Estoque Atual"],
        ["vendido_periodo", "Vendido no Periodo"],
        ["entrada_periodo", "Entrada no Periodo"],
        ["dias_periodo", "Dias do Periodo"],
        ["venda_media_diaria", "Venda Media Diaria"],
        ["cobertura_atual", "Cobertura Atual"],
        ["cobertura_desejada", "Cobertura Desejada"],
        ["meta_inteligente", "Meta Inteligente"],
        ["sugestao_corte", "Sugestao de Corte"],
        ["total_sugerido_cor", "Total Sugerido da Cor"],
        ["classificacao_giro", "Classificacao de Giro"],
        ["prioridade_cor", "Prioridade da Cor"],
        ["status_reposicao", "Status de Reposicao"],
        ["status_malha", "Status Malha"],
        ["status_compra_malha", "Status de Compra de Malha"],
        ["alertas", "Alertas"],
        ["motivo", "Motivo"]
    ];

    const knownSizes = new Set(["PP", "P", "M", "G", "G1", "G2", "G3", "G4", "GG", "EG", "EGG", "U", "UNICO"]);
    const sizeAliases = new Map([
        ["XG", "G1"],
        ["G 1", "G1"],
        ["G-1", "G1"],
        ["G_1", "G1"],
        ["G 2", "G2"],
        ["G-2", "G2"],
        ["G_2", "G2"],
        ["UNICA", "UNICO"],
        ["UNICO", "UNICO"],
        ["UNICO", "UNICO"]
    ]);
    const priorityOrder = { Alta: 1, Media: 2, Baixa: 3 };
    const sizeOrder = { PP: 1, P: 2, M: 3, G: 4, G1: 5, G2: 6, G3: 7, G4: 8, GG: 9, EG: 10, EGG: 11, U: 90, UNICO: 91 };

    const state = {
        files: {},
        raw: {},
        data: {},
        products: [],
        coverage: {},
        divergences: [],
        analysis: null,
        workbook: null
    };

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    document.addEventListener("DOMContentLoaded", () => {
        bindUpload();
        bindNavigation();
        bindForms();
        updateUploadStatus();
    });

    function bindUpload() {
        $$("[data-file-input]").forEach((input) => {
            input.addEventListener("change", () => {
                const kind = input.dataset.fileInput;
                const file = input.files && input.files[0];
                state.files[kind] = file || null;
                const label = document.querySelector(`[data-file-name="${kind}"]`);
                const card = document.querySelector(`[data-upload-card="${kind}"]`);
                if (label) label.textContent = file ? file.name : "Nenhum arquivo";
                if (card) card.classList.toggle("is-loaded", Boolean(file));
                updateUploadStatus();
            });
        });

        $("#load-files-btn").addEventListener("click", loadFiles);
        $("#reset-btn").addEventListener("click", () => {
            window.location.reload();
        });
    }

    function bindNavigation() {
        $$("[data-back]").forEach((button) => {
            button.addEventListener("click", () => showView(button.dataset.back));
        });
        $("#new-analysis-btn").addEventListener("click", () => window.location.reload());
        $("#download-btn").addEventListener("click", downloadWorkbook);
    }

    function bindForms() {
        $("#coverage-form").addEventListener("submit", (event) => {
            event.preventDefault();
            saveCoverage();
        });

        $("#divergence-form").addEventListener("submit", (event) => {
            event.preventDefault();
            saveCorrections();
            showView("processing");
            runProcessing();
        });
    }

    async function loadFiles() {
        clearMessages("upload-messages");
        if (typeof XLSX === "undefined") {
            showMessage("upload-messages", "Biblioteca de planilhas nao carregou. Verifique a conexao e atualize a pagina.");
            return;
        }

        const missing = Object.keys(fileKinds).filter((kind) => !state.files[kind]);
        if (missing.length) {
            showMessage("upload-messages", `Arquivos faltando: ${missing.map((kind) => fileKinds[kind]).join(", ")}.`);
            return;
        }

        try {
            for (const kind of Object.keys(fileKinds)) {
                const rows = await readFileRows(state.files[kind]);
                state.raw[kind] = rows;
                state.data[kind] = normalizeRows(mapColumns(rows, kind), kind);
            }

            const validationErrors = validateData(state.data);
            if (validationErrors.length) {
                validationErrors.forEach((message) => showMessage("upload-messages", message));
                return;
            }

            state.products = identifyProducts(state.data.currentStock);
            state.divergences = findDivergences(state.data);
            renderCoverage();
            showMessage("upload-messages", "Arquivos carregados com sucesso.", true);
            showView("coverage");
        } catch (error) {
            showMessage("upload-messages", error.message || String(error));
        }
    }

    function readFileRows(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: "array", cellDates: true });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
                    if (!rows.length) throw new Error(`${file.name} esta vazio.`);
                    resolve(rows);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error(`Nao foi possivel ler ${file.name}.`));
            reader.readAsArrayBuffer(file);
        });
    }

    function mapColumns(rows, kind) {
        const allowed = kindColumns[kind];
        const first = rows[0] || {};
        const originalByNormalized = new Map(Object.keys(first).map((column) => [normalizeColumn(column), column]));
        const mapping = new Map();

        for (const internal of allowed) {
            const candidates = new Set([internal, ...(aliases[internal] || [])]);
            for (const candidate of candidates) {
                const original = originalByNormalized.get(normalizeColumn(candidate));
                if (original && !mapping.has(original)) {
                    mapping.set(original, internal);
                    break;
                }
            }
        }

        const mappedInternals = new Set(mapping.values());
        const missing = requiredColumns[kind].filter((column) => !mappedInternals.has(column));
        if (missing.length) {
            throw new Error(`${fileKinds[kind]} sem colunas obrigatorias: ${missing.join(", ")}.`);
        }

        return rows.map((row) => {
            const mapped = {};
            for (const internal of allowed) mapped[internal] = "";
            for (const [original, internal] of mapping.entries()) mapped[internal] = row[original];
            return mapped;
        });
    }

    function normalizeRows(rows, kind) {
        if (kind === "fabric") {
            const seen = new Set();
            return rows.map((row) => ({
                cor: cleanText(row.cor),
                status_disponibilidade: cleanText(row.status_disponibilidade) || "DISPONIVEL"
            })).filter((row) => {
                if (!row.cor || seen.has(row.cor)) return false;
                seen.add(row.cor);
                return true;
            });
        }

        return rows.map((row) => {
            const product = cleanText(row.produto) || extractProduct(row.nome_estoque);
            const common = {
                codigo_estoque: cleanText(row.codigo_estoque),
                nome_estoque: cleanText(row.nome_estoque),
                produto: product,
                cor: cleanText(row.cor),
                tamanho: normalizeSize(row.tamanho)
            };
            if (kind === "currentStock") {
                return { ...common, estoque_atual: toNumber(row.estoque_atual) };
            }
            if (kind === "sales") {
                return {
                    ...common,
                    data_aprovacao: parseDate(row.data_aprovacao),
                    quantidade_vendida: toNumber(row.quantidade_vendida),
                    valor: toNumber(row.valor)
                };
            }
            return {
                ...common,
                data_entrada: parseDate(row.data_entrada),
                quantidade_entrada: toNumber(row.quantidade_entrada)
            };
        });
    }

    function validateData(data) {
        const errors = [];
        if (!data.currentStock.length) errors.push("Estoque atual nao tem linhas validas.");
        if (!data.sales.length) errors.push("Relatorio de vendas nao tem linhas validas.");
        if (!data.entries.length) errors.push("Entradas nao tem linhas validas.");
        if (!data.fabric.length) errors.push("Estoque de malha nao tem cores validas.");

        const invalidDates = data.sales.filter((row) => !row.data_aprovacao).length;
        if (invalidDates) errors.push(`${invalidDates} venda(s) com Data da Aprovacao invalida.`);
        return errors;
    }

    function identifyProducts(stockRows) {
        return Array.from(new Set(stockRows.map((row) => row.produto).filter(Boolean))).sort();
    }

    function renderCoverage() {
        $("#coverage-body").innerHTML = state.products.map((product, index) => `
            <tr>
                <td>${escapeHtml(product)}</td>
                <td><input class="number-input" min="1" step="0.01" type="number" name="coverage_${index}" data-product="${escapeHtml(product)}" placeholder="Ex.: 20"></td>
            </tr>
        `).join("");
        $("#product-count").textContent = `${state.products.length} produto(s)`;
    }

    function saveCoverage() {
        clearMessages("coverage-messages");
        const coverage = {};
        $$("#coverage-body input").forEach((input) => {
            const raw = String(input.value || "").replace(",", ".");
            const value = Number(raw);
            if (value > 0) coverage[input.dataset.product] = value;
        });

        if (!Object.keys(coverage).length) {
            showMessage("coverage-messages", "Informe cobertura para pelo menos um produto.");
            return;
        }

        state.coverage = coverage;
        renderDivergences();
        showView("divergences");
    }

    function renderDivergences() {
        $("#divergence-count").textContent = `${state.divergences.length} ocorrencia(s)`;
        if (!state.divergences.length) {
            $("#divergence-body").innerHTML = `<tr><td class="empty-row" colspan="5">Nenhuma divergencia encontrada.</td></tr>`;
            return;
        }

        $("#divergence-body").innerHTML = state.divergences.map((item) => `
            <tr>
                <td><span class="tag">${escapeHtml(item.tipo.replaceAll("_", " "))}</span></td>
                <td>${escapeHtml(item.mensagem)}</td>
                <td>${escapeHtml(item.valor || "-")}</td>
                <td>${escapeHtml(item.sugestao || "-")}</td>
                <td><input class="text-input" name="correction_${item.id}" value="${escapeHtml(item.sugestao || "")}" data-divergence-id="${item.id}"></td>
            </tr>
        `).join("");
    }

    function saveCorrections() {
        const corrections = {};
        $$("[data-divergence-id]").forEach((input) => {
            const value = cleanText(input.value);
            if (value) corrections[input.dataset.divergenceId] = value;
        });
        applyCorrections(corrections);
    }

    function applyCorrections(corrections) {
        const divergencesById = new Map(state.divergences.map((item) => [item.id, item]));
        for (const [id, correction] of Object.entries(corrections)) {
            const divergence = divergencesById.get(id);
            if (!divergence || !["produto", "cor", "tamanho"].includes(divergence.campo)) continue;
            const original = cleanText(divergence.valor);
            for (const rows of Object.values(state.data)) {
                rows.forEach((row) => {
                    if (cleanText(row[divergence.campo]) === original) row[divergence.campo] = correction;
                });
            }
        }
    }

    function runProcessing() {
        const steps = $$("#process-list li");
        const bar = $("#progress-bar");
        let current = 0;
        const timer = window.setInterval(() => {
            steps.forEach((step, index) => {
                step.classList.toggle("done", index < current);
                step.classList.toggle("active", index === current);
            });
            bar.style.width = `${Math.min(96, 8 + current * 14)}%`;
            current = Math.min(current + 1, steps.length - 1);
        }, 260);

        window.setTimeout(() => {
            try {
                state.analysis = runAnalysis(state.data, state.coverage);
                state.workbook = buildWorkbook(state.analysis);
                steps.forEach((step) => {
                    step.classList.remove("active");
                    step.classList.add("done");
                });
                bar.style.width = "100%";
                window.clearInterval(timer);
                renderResult();
                window.setTimeout(() => showView("result"), 360);
            } catch (error) {
                window.clearInterval(timer);
                alert(error.message || String(error));
                showView("divergences");
            }
        }, 900);
    }

    function runAnalysis(data, coverage) {
        const covered = new Map(Object.entries(coverage).map(([product, days]) => [cleanText(product), Number(days)]));
        const stock = data.currentStock.filter((row) => covered.has(cleanText(row.produto)));
        if (!stock.length) throw new Error("Nenhum produto com cobertura foi encontrado no estoque atual.");

        const validSales = data.sales.filter((row) => row.data_aprovacao);
        const period = getPeriod(validSales.map((row) => row.data_aprovacao));
        const groupedStock = groupRows(stock, "estoque_atual");
        const groupedSales = groupRows(validSales, "quantidade_vendida", "vendido_periodo");
        const groupedEntries = groupRows(data.entries, "quantidade_entrada", "entrada_periodo");
        const fabricColors = new Set(data.fabric.map((row) => cleanText(row.cor)));

        const rows = groupedStock.map((row) => {
            const key = makeKey(row);
            const salesRow = groupedSales.lookup.get(key) || {};
            const entryRow = groupedEntries.lookup.get(key) || {};
            const desired = covered.get(cleanText(row.produto));
            const sold = Number(salesRow.vendido_periodo || 0);
            const daily = sold / period.days;
            const currentCoverage = daily > 0 ? row.estoque_atual / daily : null;
            const target = daily * desired;
            const suggestion = Math.max(target - row.estoque_atual, 0);
            return {
                ...row,
                vendido_periodo: sold,
                entrada_periodo: Number(entryRow.entrada_periodo || 0),
                dias_periodo: period.days,
                venda_media_diaria: daily,
                cobertura_atual: currentCoverage,
                cobertura_desejada: desired,
                meta_inteligente: target,
                sugestao_corte: suggestion,
                status_malha: fabricColors.has(cleanText(row.cor)) ? "Com malha" : "Sem malha"
            };
        });

        const colorMetrics = buildColorMetrics(rows);
        rows.forEach((row) => {
            const metrics = colorMetrics.get(`${row.produto}|${row.cor}`) || {};
            Object.assign(row, metrics);
            const decision = decisionFields(row);
            Object.assign(row, decision);
        });

        const products = [];
        for (const product of Array.from(new Set(rows.map((row) => row.produto))).sort()) {
            const productRows = sortAnalysisRows(rows.filter((row) => row.produto === product));
            products.push({
                produto: product,
                cobertura_desejada: productRows[0].cobertura_desejada,
                rows: productRows,
                summary: productSummary(product, productRows, period.label)
            });
        }

        return {
            products,
            summary: {
                periodo: period.label,
                dias_periodo: period.days,
                produtos_analisados: products.length,
                linhas_analisadas: rows.length,
                generated_at: new Date()
            }
        };
    }

    function groupRows(rows, sourceField, targetField) {
        const outputField = targetField || sourceField;
        const map = new Map();
        for (const row of rows) {
            const key = makeKey(row);
            if (!map.has(key)) {
                map.set(key, {
                    codigo_estoque: row.codigo_estoque || "",
                    nome_estoque: row.nome_estoque || "",
                    produto: row.produto || "",
                    cor: row.cor || "",
                    tamanho: row.tamanho || "",
                    [outputField]: 0
                });
            }
            map.get(key)[outputField] += Number(row[sourceField] || 0);
        }
        const list = Array.from(map.values());
        list.lookup = map;
        return list;
    }

    function buildColorMetrics(rows) {
        const byProductColor = new Map();
        rows.forEach((row) => {
            const key = `${row.produto}|${row.cor}`;
            if (!byProductColor.has(key)) {
                byProductColor.set(key, {
                    produto: row.produto,
                    cor: row.cor,
                    vendido_cor: 0,
                    estoque_cor: 0,
                    total_sugerido_cor: 0,
                    cobertura_desejada: row.cobertura_desejada,
                    dias_periodo: row.dias_periodo
                });
            }
            const item = byProductColor.get(key);
            item.vendido_cor += row.vendido_periodo;
            item.estoque_cor += row.estoque_atual;
            item.total_sugerido_cor += row.sugestao_corte;
        });

        const byProduct = new Map();
        byProductColor.forEach((item) => {
            if (!byProduct.has(item.produto)) byProduct.set(item.produto, []);
            byProduct.get(item.produto).push(item);
        });

        byProduct.forEach((items) => {
            const classifications = classifyTurnover(items.map((item) => item.vendido_cor));
            items.forEach((item, index) => {
                const daily = item.vendido_cor / item.dias_periodo;
                item.cobertura_cor = daily > 0 ? item.estoque_cor / daily : null;
                item.classificacao_giro = classifications[index];
                item.prioridade_cor = priorityForColor(item, item.classificacao_giro);
            });
        });

        const result = new Map();
        byProductColor.forEach((item, key) => {
            result.set(key, {
                total_sugerido_cor: item.total_sugerido_cor,
                classificacao_giro: item.classificacao_giro,
                prioridade_cor: item.prioridade_cor
            });
        });
        return result;
    }

    function classifyTurnover(values) {
        const max = Math.max(...values);
        if (max <= 0) return values.map(() => "Sem giro");
        const positive = values.filter((value) => value > 0).sort((a, b) => a - b);
        const low = quantile(positive, 0.34);
        const high = quantile(positive, 0.67);
        return values.map((value) => {
            if (value <= 0) return "Sem giro";
            if (value >= high) return "Alto";
            if (value >= low) return "Medio";
            return "Baixo";
        });
    }

    function priorityForColor(item, classification) {
        const giro = { Alto: 3, Medio: 2, Baixo: 1, "Sem giro": 0 }[classification] || 0;
        let coverageScore = 0;
        if (item.cobertura_cor !== null && item.cobertura_cor < item.cobertura_desejada * 0.5) coverageScore = 2;
        else if (item.cobertura_cor !== null && item.cobertura_cor < item.cobertura_desejada) coverageScore = 1;
        else if (item.cobertura_cor === null && item.vendido_cor > 0) coverageScore = 2;
        const score = giro + coverageScore;
        if (score >= 4) return "Alta";
        if (score >= 2) return "Media";
        return "Baixa";
    }

    function decisionFields(row) {
        const sold = row.vendido_periodo;
        const stock = row.estoque_atual;
        const suggestion = row.sugestao_corte;
        const coverageLow = row.cobertura_atual !== null && row.cobertura_atual < row.cobertura_desejada;
        const hasFabric = row.status_malha === "Com malha";
        const alerts = [];
        if (stock < 0) alerts.push("Estoque negativo / possivel furo de estoque");
        if (!hasFabric) alerts.push("Cor sem malha disponivel");
        if (!row.codigo_estoque) alerts.push("Codigo de estoque ausente");

        let statusReposicao = "Atencao manual";
        if (suggestion > 0 && sold > 0 && coverageLow) statusReposicao = "Repor";
        else if (stock < 0) statusReposicao = "Atencao manual";
        else if (sold === 0 && stock > 0) statusReposicao = "Produto parado";
        else if (["Baixo", "Sem giro"].includes(row.classificacao_giro) && suggestion > 0) statusReposicao = "Baixo giro";
        else if (stock > Math.max(row.meta_inteligente * 1.5, 1) && ["Baixo", "Sem giro"].includes(row.classificacao_giro)) statusReposicao = "Excesso / capital parado";
        else if (suggestion <= 0) statusReposicao = "Estoque OK";

        let statusCompra = "Nao comprar agora";
        if (hasFabric && suggestion > 0) statusCompra = "Com malha disponivel";
        else if (hasFabric) statusCompra = "Malha disponivel, mas sem necessidade de corte";
        else if (suggestion > 0 && coverageLow && ["Alto", "Medio"].includes(row.classificacao_giro)) statusCompra = "Avaliar compra de malha";
        else if (suggestion > 0) statusCompra = "Sem malha";

        return {
            status_reposicao: statusReposicao,
            status_compra_malha: statusCompra,
            alertas: alerts.join("; "),
            motivo: reason(row, statusReposicao, statusCompra, alerts)
        };
    }

    function reason(row, statusReposicao, statusCompra, alerts) {
        const parts = [];
        if (statusReposicao === "Repor") parts.push(`${row.classificacao_giro} giro, baixa cobertura e estoque abaixo da meta inteligente.`);
        else if (statusReposicao === "Estoque OK") parts.push("Estoque atual suficiente para a cobertura desejada.");
        else if (statusReposicao === "Baixo giro") parts.push("Baixo giro no periodo analisado. Reposicao nao recomendada automaticamente.");
        else if (statusReposicao === "Produto parado") parts.push("Sem venda no periodo e estoque atual positivo. Possivel produto parado.");
        else if (statusReposicao === "Excesso / capital parado") parts.push("Estoque alto diante do giro observado. Possivel capital parado.");
        else parts.push("Situacao exige conferencia manual antes da decisao de corte.");

        if (statusCompra === "Avaliar compra de malha") parts.push("Cor sem malha disponivel, com giro relevante e baixa cobertura.");
        if (statusCompra === "Nao comprar agora") parts.push("Sem malha, mas sem sinal forte de corte agora.");
        if (statusCompra === "Sem malha") parts.push("Cor sem malha disponivel para eventual corte.");
        if (row.sugestao_corte > 0) parts.push(`Sugestao calculada: ${formatNumber(row.sugestao_corte)} peca(s).`);
        if (row.cobertura_atual !== null) parts.push(`Cobertura atual estimada: ${formatNumber(row.cobertura_atual)} dia(s).`);
        if (alerts.length) parts.push(`${alerts.join("; ")}.`);
        return parts.join(" ");
    }

    function productSummary(product, rows, periodLabel) {
        const uniqueColors = uniqueBy(rows, (row) => row.cor);
        return [
            ["Produto/modelo", product],
            ["Periodo analisado", periodLabel],
            ["Cobertura desejada", rows[0].cobertura_desejada],
            ["Total vendido no periodo", sum(rows, "vendido_periodo")],
            ["Total em estoque atual", sum(rows, "estoque_atual")],
            ["Total de entradas/reposicoes", sum(rows, "entrada_periodo")],
            ["Total sugerido para corte", sum(rows, "sugestao_corte")],
            ["Quantidade de cores analisadas", uniqueColors.length],
            ["Cores com prioridade alta", uniqueColors.filter((row) => row.prioridade_cor === "Alta").length],
            ["Cores com prioridade media", uniqueColors.filter((row) => row.prioridade_cor === "Media").length],
            ["Cores com prioridade baixa", uniqueColors.filter((row) => row.prioridade_cor === "Baixa").length],
            ["Cores sem malha", uniqueColors.filter((row) => row.status_malha === "Sem malha").length],
            ["Cores para avaliar compra de malha", uniqueColors.filter((row) => row.status_compra_malha === "Avaliar compra de malha").length],
            ["Cores paradas", uniqueColors.filter((row) => row.status_reposicao === "Produto parado").length],
            ["Cores com excesso/capital parado", uniqueColors.filter((row) => row.status_reposicao === "Excesso / capital parado").length],
            ["Alertas de estoque negativo", rows.filter((row) => row.estoque_atual < 0).length]
        ];
    }

    function findDivergences(data) {
        const divergences = [];
        let counter = 1;
        const stockKeys = new Set(data.currentStock.map(makeKey));
        uniqueBy(data.sales.filter((row) => !stockKeys.has(makeKey(row))), makeKey).slice(0, 50).forEach((row) => {
            divergences.push({
                id: `D${String(counter++).padStart(4, "0")}`,
                tipo: "venda_sem_estoque_atual",
                campo: "produto",
                valor: row.produto,
                mensagem: `Item vendido nao aparece no estoque atual e sera ignorado: ${row.produto} / ${row.cor} / ${row.tamanho}.`
            });
        });

        const fabricColors = new Set(data.fabric.map((row) => row.cor));
        uniqueBy(data.currentStock, (row) => `${row.produto}|${row.cor}`).forEach((row) => {
            if (row.cor && !fabricColors.has(row.cor)) {
                divergences.push({
                    id: `D${String(counter++).padStart(4, "0")}`,
                    tipo: "cor_sem_malha",
                    campo: "cor",
                    valor: row.cor,
                    mensagem: `Cor sem malha disponivel: ${row.produto} / ${row.cor}.`
                });
            }
        });

        const sizes = new Set([...data.currentStock, ...data.sales, ...data.entries].map((row) => row.tamanho).filter(Boolean));
        Array.from(sizes).filter((size) => !knownSizes.has(size)).sort().forEach((size) => {
            divergences.push({
                id: `D${String(counter++).padStart(4, "0")}`,
                tipo: "tamanho_desconhecido",
                campo: "tamanho",
                valor: size,
                mensagem: `Tamanho desconhecido encontrado: ${size}.`
            });
        });

        [
            ["estoque atual", data.currentStock],
            ["vendas", data.sales],
            ["entradas", data.entries]
        ].forEach(([label, rows]) => {
            const missing = rows.filter((row) => !row.codigo_estoque).length;
            if (missing) {
                divergences.push({
                    id: `D${String(counter++).padStart(4, "0")}`,
                    tipo: "codigo_estoque_ausente",
                    campo: "codigo_estoque",
                    valor: "",
                    mensagem: `${missing} linha(s) em ${label} sem codigo de estoque.`
                });
            }
        });

        return divergences;
    }

    function buildWorkbook(analysis) {
        const workbook = XLSX.utils.book_new();
        const used = new Set();
        analysis.products.forEach((product) => {
            const rows = [];
            rows.push([`WALS - ${product.produto}`]);
            rows.push([]);
            product.summary.forEach((item) => rows.push(item));
            rows.push([]);
            rows.push(outputColumns.map(([, label]) => label));
            product.rows.forEach((row) => {
                rows.push(outputColumns.map(([key]) => normalizeExcelValue(row[key])));
            });

            const sheet = XLSX.utils.aoa_to_sheet(rows);
            const headerRow = product.summary.length + 4;
            sheet["!autofilter"] = { ref: `A${headerRow}:V${rows.length}` };
            sheet["!cols"] = outputColumns.map(([, label]) => ({ wch: Math.min(Math.max(label.length + 4, 12), label === "Motivo" ? 72 : 28) }));
            XLSX.utils.book_append_sheet(workbook, sheet, sheetName(product.produto, used));
        });
        return workbook;
    }

    function downloadWorkbook() {
        if (!state.workbook) return;
        const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
        XLSX.writeFile(state.workbook, `wals_analise_${stamp}.xlsx`);
    }

    function renderResult() {
        const summary = state.analysis.summary;
        $("#metric-products").textContent = summary.produtos_analisados;
        $("#metric-rows").textContent = summary.linhas_analisadas;
        $("#metric-days").textContent = summary.dias_periodo;
        $("#metric-period").textContent = summary.periodo;
        $("#generated-at").textContent = summary.generated_at.toLocaleString("pt-BR");
    }

    function showView(name) {
        $$("[data-view]").forEach((view) => view.classList.toggle("is-visible", view.dataset.view === name));
        $$("[data-step-dot]").forEach((button) => button.classList.toggle("is-active", button.dataset.stepDot === name));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function updateUploadStatus() {
        const loaded = Object.keys(fileKinds).filter((kind) => state.files[kind]).length;
        $("#upload-status").textContent = `${loaded} de 4 carregados`;
    }

    function showMessage(id, text, ok) {
        const area = document.getElementById(id);
        const message = document.createElement("p");
        message.className = ok ? "message ok" : "message";
        message.textContent = text;
        area.appendChild(message);
    }

    function clearMessages(id) {
        document.getElementById(id).innerHTML = "";
    }

    function getPeriod(dates) {
        const valid = dates.filter(Boolean).map((date) => startOfDay(date)).sort((a, b) => a - b);
        if (!valid.length) return { days: 1, label: "Sem vendas validas" };
        const start = valid[0];
        const end = valid[valid.length - 1];
        const days = Math.max(Math.round((end - start) / 86400000) + 1, 1);
        return { days, label: `${toIsoDate(start)} a ${toIsoDate(end)}` };
    }

    function parseDate(value) {
        if (!value && value !== 0) return null;
        if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
        if (typeof value === "number" && typeof XLSX !== "undefined") {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
        }
        const text = String(value).trim();
        if (!text) return null;
        if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text)) {
            const date = new Date(text.replace(" ", "T"));
            return Number.isNaN(date.valueOf()) ? null : date;
        }
        const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (match) {
            let year = Number(match[3]);
            if (year < 100) year += 2000;
            return new Date(year, Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0));
        }
        const date = new Date(text);
        return Number.isNaN(date.valueOf()) ? null : date;
    }

    function normalizeColumn(value) {
        return removeAccents(String(value || "").trim().toLowerCase()).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    }

    function cleanText(value) {
        if (value === null || value === undefined) return "";
        const text = String(value).trim();
        if (["nan", "none", "nat"].includes(text.toLowerCase())) return "";
        return removeAccents(text).replace(/\s+/g, " ").toUpperCase();
    }

    function removeAccents(value) {
        return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function normalizeSize(value) {
        const size = cleanText(value).replace(/\s+/g, " ");
        return sizeAliases.get(size) || size;
    }

    function extractProduct(value) {
        const text = cleanText(value);
        if (!text) return "";
        for (const separator of [" - ", " | ", " / ", "_"]) {
            if (text.includes(separator)) return text.split(separator)[0].trim();
        }
        return text;
    }

    function toNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        const text = String(value ?? "").trim();
        if (!text || ["nan", "none", "nat"].includes(text.toLowerCase())) return 0;
        let cleaned = text.replace(/[^0-9,.-]/g, "");
        if (cleaned.includes(",") && cleaned.includes(".")) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
        else if (cleaned.includes(",")) cleaned = cleaned.replace(",", ".");
        const number = Number(cleaned);
        return Number.isFinite(number) ? number : 0;
    }

    function makeKey(row) {
        return ["codigo_estoque", "nome_estoque", "produto", "cor", "tamanho"].map((field) => cleanText(row[field])).join("|");
    }

    function quantile(values, q) {
        if (!values.length) return 0;
        if (values.length === 1) return values[0];
        const position = (values.length - 1) * q;
        const base = Math.floor(position);
        const rest = position - base;
        return values[base + 1] !== undefined ? values[base] + rest * (values[base + 1] - values[base]) : values[base];
    }

    function sortAnalysisRows(rows) {
        return rows.slice().sort((a, b) => {
            const priority = (priorityOrder[a.prioridade_cor] || 9) - (priorityOrder[b.prioridade_cor] || 9);
            if (priority) return priority;
            const color = a.cor.localeCompare(b.cor);
            if (color) return color;
            const size = (sizeOrder[a.tamanho] || 99) - (sizeOrder[b.tamanho] || 99);
            if (size) return size;
            return a.tamanho.localeCompare(b.tamanho);
        });
    }

    function sum(rows, field) {
        return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
    }

    function uniqueBy(rows, getKey) {
        const seen = new Set();
        return rows.filter((row) => {
            const key = getKey(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    }

    function normalizeExcelValue(value) {
        if (value === null || value === undefined) return "";
        if (typeof value === "number") return Math.round(value * 1000000) / 1000000;
        return value;
    }

    function sheetName(value, used) {
        const base = cleanText(value).replace(/[\[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "PRODUTO";
        let name = base;
        let counter = 2;
        while (used.has(name)) {
            const suffix = ` ${counter}`;
            name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
            counter += 1;
        }
        used.add(name);
        return name;
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function toIsoDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
})();
