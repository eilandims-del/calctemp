// Funções para TMA AFET. MANOBRA (diferença em minutos arredondada)
function tmaAfetManobraAntes(a6, a5) {
    if (!a6 || !a5) return 0;
    const diffMs = new Date(a6) - new Date(a5);
    return Math.round(diffMs / 1000 / 60);
}

function tmaAfetManobraDepois(h6, h5) {
    if (!h6 || !h5) return 0;
    const diffMs = new Date(h6) - new Date(h5);
    return Math.round(diffMs / 1000 / 60);
}
// Fórmulas simplificadas para CLI.AFET.MANOBRA do ANTES e DEPOIS
// CLI.AFET.MANOBRA: diferença de tempo entre a linha atual e anterior, multiplicado pelo CLI.AFET. da linha ANTERIOR
function cliAfetManobraAntes(a6, a5, b5, isLast, isFirst) {
    // Remove isLast guard: even the last row should compute using the previous row's time and CLI
    if (isFirst) return 0;
    if (!a6 || !a5) return 0;
    const dateA6 = new Date(a6);
    const dateA5 = new Date(a5);
    if (isNaN(dateA6) || isNaN(dateA5)) return 0;
    // Use hours difference * previous row's CLI (to match expected '80 clients × 0.5h = 40')
    const diffMs = dateA6 - dateA5;
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = diffMs / (1000 * 60 * 60);
    const cli = Number(b5);
    if (isNaN(cli) || cli <= 0 || diffHours <= 0) return 0;
    return Math.round(diffHours * cli);
}

function cliAfetManobraDepois(h6, h5, i5, isLast, isFirst) {
    // Remove isLast guard: even the last row should compute using the previous row's time and CLI
    if (isFirst) return 0;
    if (!h6 || !h5) return 0;
    const dateH6 = new Date(h6);
    const dateH5 = new Date(h5);
    if (isNaN(dateH6) || isNaN(dateH5)) return 0;
    const diffMs = dateH6 - dateH5;
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = diffMs / (1000 * 60 * 60);
    const cli = Number(i5);
    if (isNaN(cli) || cli <= 0 || diffHours <= 0) return 0;
    return Math.round(diffHours * cli);
}
// Funções utilitárias convertidas das fórmulas de Excel para CLI.AFET MANOBRA e TMA AFET. MANOBRA
// --- ANTES ---
document.addEventListener('DOMContentLoaded', () => {
    const antesTableBody = document.getElementById('antesTableBody');
    const depoisTableBody = document.getElementById('depoisTableBody');
    const addRowAntes = document.getElementById('addRowAntes');
    const addRowDepois = document.getElementById('addRowDepois');
    const clearBtn = document.getElementById('clearBtn');
    const generateReport = document.getElementById('generateReport');
    // footerMessage removed from DOM; no footer element is used anymore
    const reportBanner = document.getElementById('reportBanner');
    const saveBtn = document.getElementById('saveBtn');
    const historyBtn = document.getElementById('historyBtn');
    const incidence = document.getElementById('incidence');
    const observation = document.getElementById('observation');
    const historyContent = document.getElementById('historyContent');

    console.log('Elementos capturados:', { antesTableBody, depoisTableBody, addRowAntes, addRowDepois, clearBtn, generateReport, saveBtn, historyBtn, incidence, observation, historyContent });

    if (!antesTableBody || !depoisTableBody || !addRowAntes || !addRowDepois || !clearBtn || !generateReport || !saveBtn || !historyBtn || !incidence || !observation || !historyContent) {
        console.error('Um ou mais elementos não foram encontrados no DOM:', {
            antesTableBody, depoisTableBody, addRowAntes, addRowDepois, clearBtn, generateReport, saveBtn, historyBtn, incidence, observation, historyContent
        });
        return;
    }

    let antesData = [{ dataFim: '', cliAfet: 0, cliAfetManobra: 0, tmaAfetManobra: 0 }];
    let depoisData = [{ dataFim: '', cliAfet: 0, cliAfetManobra: 0, tmaAfetManobra: 0 }];
    let clipboard = null;
    let history = localStorage.getItem('history') ? JSON.parse(localStorage.getItem('history')) : [];

    function formatDateTime(dateTime) {
        if (!dateTime) return '';
        const date = new Date(dateTime);
        return date.toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        }).replace(',', '');
    }

    // Retorna apenas o horário (HH:MM:SS) a partir de um Date ou string
    function formatTime(dateTime) {
        if (!dateTime) return '';
        const d = dateTime instanceof Date ? dateTime : new Date(dateTime);
        if (isNaN(d)) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // Fórmula corrigida: CLI. AFET. MANOBRA = CLI. AFET. × (diferença de tempo em minutos até a próxima linha)
    function calcCliAfetManobra(cliAfet, currentFim, nextFim) {
        if (!cliAfet || !currentFim || cliAfet === '0') return 0; // Retorna 0 se vazio ou 0 clientes
        try {
            const currentDate = new Date(currentFim);
            const nextDate = nextFim ? new Date(nextFim) : new Date(currentFim); // Usa o mesmo horário se for a última linha
            if (isNaN(currentDate) || isNaN(nextDate)) return 0;
            const diffMs = nextDate - currentDate;
            const minutos = Math.max(0, Math.round(diffMs / (1000 * 60))); // Diferença em minutos, não negativa
            const numCliAfet = parseFloat(cliAfet) || 0;
            return numCliAfet * minutos; // Multiplica clientes pelo tempo em minutos
        } catch (e) {
            console.error('Erro em calcCliAfetManobra:', e);
            return 0;
        }
    }

    // Fórmula: TMA AFET. MANOBRA = Diferença de tempo em minutos entre a linha atual e a anterior
    function calcTmaAfetManobra(currentFim, previousFim) {
        if (!currentFim) return 0;
        if (!previousFim) return 0; // Primeira linha usa 0
        try {
            const currentDate = new Date(currentFim);
            const prevDate = new Date(previousFim);
            if (isNaN(currentDate) || isNaN(prevDate)) return 0;
            const diffMs = currentDate - prevDate;
            const minutos = Math.max(0, Math.round(diffMs / (1000 * 60))); // Garante tempo não negativo
            return minutos;
        } catch (e) {
            console.error('Erro em calcTmaAfetManobra:', e);
            return 0;
        }
    }

    // Soma visível de uma coluna
    function calcSubtotalVisible(data, column) {
        return data.reduce((acc, row) => acc + (row[column] || 0), 0);
    }

    // Verifica se a soma é negativa e retorna mensagem ou valor
    function calcConditionalSum(data, column) {
        const sum = data.reduce((acc, row) => acc + (row[column] || 0), 0);
        return sum < 0 ? 'Verificar horário' : sum;
    }

    // Ganho CHI = Total ANTES - Total DEPOIS
    function calcGanhoChi(antesTotal, depoisTotal) {
        return antesTotal - depoisTotal;
    }

    // Ganho TMA = Total ANTES - Total DEPOIS com verificação de erro
    function calcGanhoTma(antesTma, depoisTma) {
        try {
            return antesTma - depoisTma;
        } catch (e) {
            return 'Rever cálculo';
        }
    }

    function updateRow(tableBody, dataArray, rowIndex) {
        const row = tableBody.rows[rowIndex];
        const inputs = row.getElementsByTagName('input');
        const dataFim = inputs[0].value;
        const cliAfet = inputs[1].value;

        let cliAfetManobra = 0;
        let tmaAfetManobra = 0;

        // Identifica se é tabela ANTES ou DEPOIS
        const isAntes = (tableBody === antesTableBody);

        // CLI.AFET.MANOBRA e TMA AFET. MANOBRA
        const isLast = (rowIndex === dataArray.length - 1);
        const isFirst = (rowIndex === 0);
        if (isAntes) {
            if (!isFirst) {
                // Ler valores da linha anterior diretamente do DOM (entradas atuais)
                const prevRow = tableBody.rows[rowIndex - 1];
                const prevInputs = prevRow.getElementsByTagName('input');
                const prevCli = prevInputs[1] ? prevInputs[1].value : '';
                const prevDate = prevInputs[0] ? prevInputs[0].value : '';
                cliAfetManobra = cliAfetManobraAntes(dataFim, prevDate, prevCli, isLast, isFirst);
                tmaAfetManobra = tmaAfetManobraAntes(dataFim, prevDate);
                const debugDiffMs = new Date(dataFim) - new Date(prevDate);
                const debugDiffMin = Math.round(debugDiffMs / (1000 * 60));
                const debugDiffHour = debugDiffMs / (1000 * 60 * 60);
                console.debug(`[ANTES] row ${rowIndex}: prevDate=${prevDate}, currDate=${dataFim}, prevCli='${prevCli}', diffMin=${debugDiffMin}, diffHour=${debugDiffHour}, cliManobra=${cliAfetManobra}`);
            } else {
                cliAfetManobra = 0;
                tmaAfetManobra = 0;
            }
        } else {
            if (!isFirst) {
                const prevRow = tableBody.rows[rowIndex - 1];
                const prevInputs = prevRow.getElementsByTagName('input');
                const prevCli = prevInputs[1] ? prevInputs[1].value : '';
                const prevDate = prevInputs[0] ? prevInputs[0].value : '';
                cliAfetManobra = cliAfetManobraDepois(dataFim, prevDate, prevCli, isLast, isFirst);
                tmaAfetManobra = tmaAfetManobraDepois(dataFim, prevDate);
                const debugDiffMs2 = new Date(dataFim) - new Date(prevDate);
                const debugDiffMin2 = Math.round(debugDiffMs2 / (1000 * 60));
                const debugDiffHour2 = debugDiffMs2 / (1000 * 60 * 60);
                console.debug(`[DEPOIS] row ${rowIndex}: prevDate=${prevDate}, currDate=${dataFim}, prevCli='${prevCli}', diffMin=${debugDiffMin2}, diffHour=${debugDiffHour2}, cliManobra=${cliAfetManobra}`);
            } else {
                cliAfetManobra = 0;
                tmaAfetManobra = 0;
            }
        }

        // Mostra os valores visíveis apenas na primeira linha; nas demais deixamos oculto
        if (isFirst) {
            inputs[2].value = cliAfetManobra;
            inputs[3].value = tmaAfetManobra;
            inputs[2].style.display = '';
            inputs[3].style.display = '';
        } else {
            // mantém o cálculo internamente, mas oculta os campos visíveis
            inputs[2].value = '';
            inputs[3].value = '';
            inputs[2].style.display = 'none';
            inputs[3].style.display = 'none';
        }

        // Armazena valores numéricos no dataArray
        dataArray[rowIndex] = {
            dataFim: dataFim || '',
            cliAfet: Number(cliAfet) || 0,
            cliAfetManobra: Number(cliAfetManobra) || 0,
            tmaAfetManobra: Number(tmaAfetManobra) || 0
        };

        // Atualiza campo da UI (visível apenas para primeira linha)
        if (rowIndex === 0) {
            inputs[2].value = dataArray[rowIndex].cliAfetManobra;
            inputs[3].value = dataArray[rowIndex].tmaAfetManobra;
            inputs[2].style.display = '';
            inputs[3].style.display = '';
        } else {
            inputs[2].value = '';
            inputs[3].value = '';
            // já foram escondidos acima, reforça o estilo
            inputs[2].style.display = 'none';
            inputs[3].style.display = 'none';
        }

        // Recalcula totais
        recalculate();

            // No automatic propagation here; input handler recomputes all rows in order
    }

    function addRow(tableBody, dataArray) {
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td><input type="datetime-local" step="1" class="form-control form-control-sm date-time-input" data-type="dataFim"></td>
            <td><input type="number" class="form-control form-control-sm" data-type="cliAfet" placeholder="Ilimitado"></td>
            <td><input type="number" class="form-control form-control-sm" data-type="cliAfetManobra" readonly></td>
            <td><input type="number" class="form-control form-control-sm" data-type="tmaAfetManobra" readonly></td>
            <td>
                <button type="button" class="btn btn-danger btn-sm remove-row">Remover</button>
                <button type="button" class="btn btn-info btn-sm duplicate-row">Duplicar</button>
            </td>
        `;
        const rowIndex = tableBody.rows.length - 1;
        dataArray.push({ dataFim: '', cliAfet: 0, cliAfetManobra: 0, tmaAfetManobra: 0 });
        updateRow(tableBody, dataArray, rowIndex);

        // Sincroniza a adição na outra tabela
        if (tableBody === antesTableBody) {
            const depoisRow = depoisTableBody.insertRow(rowIndex);
            depoisRow.innerHTML = newRow.innerHTML;
            depoisData.push({ dataFim: '', cliAfet: 0, cliAfetManobra: 0, tmaAfetManobra: 0 });
            updateRow(depoisTableBody, depoisData, rowIndex);
        } else if (tableBody === depoisTableBody) {
            const antesRow = antesTableBody.insertRow(rowIndex);
            antesRow.innerHTML = newRow.innerHTML;
            antesData.push({ dataFim: '', cliAfet: 0, cliAfetManobra: 0, tmaAfetManobra: 0 });
            updateRow(antesTableBody, antesData, rowIndex);
        }
    }

    function duplicateRow(tableBody, dataArray, rowIndex) {
        const newRow = tableBody.insertRow(rowIndex + 1);
        const previousRow = tableBody.rows[rowIndex];
        const previousInputs = previousRow.getElementsByTagName('input');
        newRow.innerHTML = `
            <td><input type="datetime-local" step="1" class="form-control form-control-sm date-time-input" value="${previousInputs[0].value}" data-type="dataFim"></td>
            <td><input type="number" class="form-control form-control-sm" value="${previousInputs[1].value}" data-type="cliAfet" placeholder="Ilimitado"></td>
            <td><input type="number" class="form-control form-control-sm" data-type="cliAfetManobra" readonly></td>
            <td><input type="number" class="form-control form-control-sm" data-type="tmaAfetManobra" readonly></td>
            <td>
                <button type="button" class="btn btn-danger btn-sm remove-row">Remover</button>
                <button type="button" class="btn btn-info btn-sm duplicate-row">Duplicar</button>
            </td>
        `;
        const newRowIndex = rowIndex + 1;
        dataArray.splice(newRowIndex, 0, { ...dataArray[rowIndex] });
        updateRow(tableBody, dataArray, newRowIndex);

        if (tableBody === antesTableBody) {
            const depoisRow = depoisTableBody.insertRow(newRowIndex);
            depoisRow.innerHTML = newRow.innerHTML;
            depoisData.splice(newRowIndex, 0, { ...depoisData[rowIndex] });
            updateRow(depoisTableBody, depoisData, newRowIndex);
        } else if (tableBody === depoisTableBody) {
            const antesRow = antesTableBody.insertRow(newRowIndex);
            antesRow.innerHTML = newRow.innerHTML;
            antesData.splice(newRowIndex, 0, { ...antesData[rowIndex] });
            updateRow(antesTableBody, antesData, newRowIndex);
        }
    }

    function removeRow(tableBody, dataArray, rowIndex) {
        if (tableBody.rows.length > 1) {
            tableBody.deleteRow(rowIndex);
            dataArray.splice(rowIndex, 1);
            for (let i = 0; i < tableBody.rows.length; i++) {
                updateRow(tableBody, dataArray, i);
            }
            recalculate();
        }
    }

    function copyToRight(rowIndex) {
        const antesRow = antesTableBody.rows[rowIndex];
        const depoisRow = depoisTableBody.rows[rowIndex];
        const antesInputs = antesRow.getElementsByTagName('input');
        const depoisInputs = depoisRow.getElementsByTagName('input');

        // Copia todos os valores de ANTES para DEPOIS
        depoisInputs[0].value = antesInputs[0].value;
        depoisInputs[1].value = antesInputs[1].value;

        // Ajusta a última linha de DEPOIS com um horário anterior (ex.: reduz 1 hora)
        if (rowIndex === depoisData.length - 1) {
            const lastAntesDate = new Date(antesInputs[0].value);
            if (!isNaN(lastAntesDate)) {
                lastAntesDate.setHours(lastAntesDate.getHours() - 1); // Reduz 1 hora como exemplo
                depoisInputs[0].value = lastAntesDate.toISOString().slice(0, 16);
            }
        }

        updateRow(depoisTableBody, depoisData, rowIndex);
    }

    function recalculate() {
        // Calcula totais de CLI.AFET. MANOBRA e TMA AFET. MANOBRA para ANTES
        let antesCliAfetManobraTotal = 0;
        let antesTmaAfetManobraTotal = 0;
        for (let i = 0; i < antesData.length; i++) {
            const cli = parseFloat(antesData[i].cliAfetManobra) || 0;
            const tma = parseFloat(antesData[i].tmaAfetManobra) || 0;
            antesCliAfetManobraTotal += cli;
            antesTmaAfetManobraTotal += tma;
        }

        // Calcula totais de CLI.AFET. MANOBRA e TMA AFET. MANOBRA para DEPOIS
        let depoisCliAfetManobraTotal = 0;
        let depoisTmaAfetManobraTotal = 0;
        for (let i = 0; i < depoisData.length; i++) {
            const cli = parseFloat(depoisData[i].cliAfetManobra) || 0;
            const tma = parseFloat(depoisData[i].tmaAfetManobra) || 0;
            depoisCliAfetManobraTotal += cli;
            depoisTmaAfetManobraTotal += tma;
        }

        // Ganhos
        // CLI GANHO = CLI.AFET. MANOBRA (ANTES) - CLI.AFET. MANOBRA (DEPOIS)
        const cliGanho = antesCliAfetManobraTotal - depoisCliAfetManobraTotal;
        const ganhoTma = calcGanhoTma(antesTmaAfetManobraTotal, depoisTmaAfetManobraTotal);
        // Atualiza totais específicos solicitados (CLI/TMA ANTES e DEPOIS)
        const antesCliElem = document.getElementById('antesCliTotal');
        const antesTmaElem = document.getElementById('antesTmaTotal');
        const depoisCliElem = document.getElementById('depoisCliTotal');
        const depoisTmaElem = document.getElementById('depoisTmaTotal');

        function fmtVal(v) {
            if (v === 'Verificar horário') return v;
            if (v == null || v === '') return 0;
            const num = Number(v) || 0;
            // mostra sem casas decimais se inteiro, senão até 4 casas
            return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(4)));
        }

        // (painel verde simplificado: apenas ganhos, os totais ANTES/DEPOIS agora aparecem nos cabeçalhos)

        // Preenche os subtotais visíveis abaixo de cada tabela
        const antesSubtotalCliEl = document.getElementById('antesSubtotalCli');
        const antesSubtotalTmaEl = document.getElementById('antesSubtotalTma');
        const depoisSubtotalCliEl = document.getElementById('depoisSubtotalCli');
        const depoisSubtotalTmaEl = document.getElementById('depoisSubtotalTma');
        if (antesSubtotalCliEl) antesSubtotalCliEl.textContent = fmtVal(antesCliAfetManobraTotal);
        if (antesSubtotalTmaEl) antesSubtotalTmaEl.textContent = (antesTmaAfetManobraTotal < 0) ? 'Verificar horário' : fmtVal(antesTmaAfetManobraTotal);
        if (depoisSubtotalCliEl) depoisSubtotalCliEl.textContent = fmtVal(depoisCliAfetManobraTotal);
        if (depoisSubtotalTmaEl) depoisSubtotalTmaEl.textContent = (depoisTmaAfetManobraTotal < 0) ? 'Verificar horário' : fmtVal(depoisTmaAfetManobraTotal);

        document.getElementById('ganhoChi').textContent = fmtVal(cliGanho) || 0;
        document.getElementById('ganhoTma').textContent = (typeof ganhoTma === 'number') ? fmtVal(ganhoTma) : ganhoTma || 'Rever cálculo';
        // document.getElementById('indice').textContent = '0.0000'; // Removido pois não existe no HTML

    // footer removed, nothing to clear
    }

    function generateReportMessage(historyEntry = null) {
        let latestAntes, latestDepois;
        if (historyEntry) {
            latestAntes = historyEntry.antes.rows.reduce((latest, current) => 
                !latest.dataHora || (current.dataHora && new Date(current.dataHora) > new Date(latest.dataHora)) ? current : latest, {});
            latestDepois = historyEntry.depois.rows.reduce((latest, current) => 
                !latest.dataHora || (current.dataHora && new Date(current.dataHora) > new Date(latest.dataHora)) ? current : latest, {});
        } else {
            latestAntes = antesData.reduce((latest, current) => 
                !latest.dataFim || (current.dataFim && new Date(current.dataFim) > new Date(latest.dataFim)) ? current : latest, {});
            latestDepois = depoisData.reduce((latest, current) => 
                !latest.dataFim || (current.dataFim && new Date(current.dataFim) > new Date(latest.dataFim)) ? current : latest, {});
        }

        // Limpa banner e footer antes de gerar novo relatório
        if (reportBanner) {
            reportBanner.classList.remove('d-block');
            reportBanner.classList.add('d-none');
            reportBanner.textContent = '';
        }
    // footer removed, nothing to clear

        if (latestAntes.dataHora || latestAntes.dataFim) {
            const antesDate = new Date(latestAntes.dataHora || latestAntes.dataFim);
            const depoisDate = new Date(latestDepois.dataHora || latestDepois.dataFim);
            if (antesDate > depoisDate) {
                // Mostrar apenas horários, tudo em MAIÚSCULAS, e acrescentar a frase solicitada
                const antesTime = formatTime(antesDate);
                const depoisTime = formatTime(depoisDate);
                const msg = `Corrigir horário fim ${antesTime} para ${depoisTime} de acordo com anexos no eorder`;
                const upper = msg.toUpperCase();
                // Mostra no banner superior (não usar o footer)
                if (reportBanner) {
                    reportBanner.textContent = upper;
                    reportBanner.classList.remove('d-none');
                    reportBanner.classList.add('d-block');
                }
            }
        }
    }

    function saveHistory() {
        const incidenceValue = incidence.value || 'Sem incidência';
        const observationValue = observation.value || 'Sem observação';

        const antesRows = [];
        for (let i = 0; i < antesTableBody.rows.length; i++) {
            const inputs = antesTableBody.rows[i].getElementsByTagName('input');
            const mem = antesData[i] || {};
            antesRows.push({
                dataHora: (inputs[0].value ? formatDateTime(inputs[0].value) : '') || (mem.dataFim ? formatDateTime(mem.dataFim) : ''),
                cliAfet: inputs[1].value || mem.cliAfet || 0,
                cliAfetManobra: (inputs[2].value !== undefined && inputs[2].value !== '') ? inputs[2].value : (mem.cliAfetManobra || 0),
                tmaAfetManobra: (inputs[3].value !== undefined && inputs[3].value !== '') ? inputs[3].value : (mem.tmaAfetManobra || 0)
            });
        }

        const depoisRows = [];
        for (let i = 0; i < depoisTableBody.rows.length; i++) {
            const inputs = depoisTableBody.rows[i].getElementsByTagName('input');
            const mem = depoisData[i] || {};
            depoisRows.push({
                dataHora: (inputs[0].value ? formatDateTime(inputs[0].value) : '') || (mem.dataFim ? formatDateTime(mem.dataFim) : ''),
                cliAfet: inputs[1].value || mem.cliAfet || 0,
                cliAfetManobra: (inputs[2].value !== undefined && inputs[2].value !== '') ? inputs[2].value : (mem.cliAfetManobra || 0),
                tmaAfetManobra: (inputs[3].value !== undefined && inputs[3].value !== '') ? inputs[3].value : (mem.tmaAfetManobra || 0)
            });
        }

    // Compute totals from in-memory arrays to ensure we save current values
    const antesCliAfetManobraTotal = antesData.reduce((acc, r) => acc + (Number(r.cliAfetManobra) || 0), 0);
    const antesTmaAfetManobraTotal = antesData.reduce((acc, r) => acc + (Number(r.tmaAfetManobra) || 0), 0);
    const depoisCliAfetManobraTotal = depoisData.reduce((acc, r) => acc + (Number(r.cliAfetManobra) || 0), 0);
    const depoisTmaAfetManobraTotal = depoisData.reduce((acc, r) => acc + (Number(r.tmaAfetManobra) || 0), 0);

        const saveTime = new Date().toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        }).replace(',', '');
        history.push({
            time: saveTime,
            incidence: incidenceValue,
            observation: observationValue,
            antes: { rows: antesRows },
            depois: { rows: depoisRows },
            antesCliAfetManobraTotal,
            antesTmaAfetManobraTotal,
            depoisCliAfetManobraTotal,
            depoisTmaAfetManobraTotal
        });

        localStorage.setItem('history', JSON.stringify(history));
        updateHistoryModal();
    }

    function updateHistoryModal() {
        historyContent.innerHTML = '';
        history.forEach((h, index) => {
            const entry = document.createElement('div');
            entry.className = 'history-entry';
            const cliGanho = (Number(h.antesCliAfetManobraTotal) || 0) - (Number(h.depoisCliAfetManobraTotal) || 0);
            const tmaGanho = (Number(h.antesTmaAfetManobraTotal) || 0) - (Number(h.depoisTmaAfetManobraTotal) || 0);
            // Format totals with fallbacks
            const antesCliTotal = (h.antesCliAfetManobraTotal != null) ? Number(h.antesCliAfetManobraTotal) : 0;
            const antesTmaTotal = (h.antesTmaAfetManobraTotal != null) ? Number(h.antesTmaAfetManobraTotal) : 0;
            const depoisCliTotal = (h.depoisCliAfetManobraTotal != null) ? Number(h.depoisCliAfetManobraTotal) : 0;
            const depoisTmaTotal = (h.depoisTmaAfetManobraTotal != null) ? Number(h.depoisTmaAfetManobraTotal) : 0;

            entry.innerHTML = `
                <h4>Salvo em: ${h.time}</h4>
                <p style="background-color: #ffff99; padding: 5px;"><strong> INCIDÊNCIA: </strong> ${h.incidence}</p>
                <p style="background-color: #ffcccc; padding: 5px;"><strong>OBSERVAÇÃO: </strong> ${h.observation}</p>
                <p class="history-gains">CLI GANHO: ${cliGanho} &nbsp; | &nbsp; TMA GANHO: ${tmaGanho}</p>

                <div style="background-color:#007bff;color:#fff;padding:8px 10px;border-radius:6px;margin:6px 0;font-weight:700;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="flex:1;min-width:140px;">CHI ANTES: ${antesCliTotal} | TMA ANTES: ${antesTmaTotal} </span>
                    <span style="flex:1;text-align:right;min-width:140px;">CHI DEPOIS: ${depoisCliTotal} | TMA DEPOIS: ${depoisTmaTotal} </span>
                </div>
                <br>
                <h5 style="margin:6px 0 4px 0;font-weight:700;">Mais informações</h5>

                <h5 style="margin:4px 0 2px 0;">ANTES</h5>
                ${h.antes.rows.map(r => `<div class="history-row">Horário: ${r.dataHora} - Clientes Afetados: ${r.cliAfet} - Clientes Afetados Manobra: ${r.cliAfetManobra} - TMA Afetado Manobra: ${r.tmaAfetManobra} min</div>`).join('')}

                <h5 style="margin:6px 0 2px 0;">DEPOIS</h5>
                ${h.depois.rows.map(r => `<div class="history-row">Horário: ${r.dataHora} - Clientes Afetados: ${r.cliAfet} - Clientes Afetados Manobra: ${r.cliAfetManobra} - TMA Afetado Manobra: ${r.tmaAfetManobra} min</div>`).join('')}

                <button class="btn btn-success btn-sm generate-report" data-index="${index}">Gerar Relatório</button>
                <button class="btn btn-danger btn-sm delete-history" data-index="${index}">DELETAR</button>
                <hr>
            `;
            historyContent.appendChild(entry);
        });
    }

    function deleteHistory(index) {
        history.splice(index, 1);
        localStorage.setItem('history', JSON.stringify(history));
        updateHistoryModal();
    }

    function generateReportFromHistory(index) {
        const historyEntry = history[index];
        generateReportMessage(historyEntry);
        // Close the history modal so the generated report banner is visible
        try {
            const modalEl = document.getElementById('historyModal');
            if (modalEl) {
                const bsModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                bsModal.hide();
            }
        } catch (e) {
            // ignore if bootstrap isn't available or hiding fails
            console.warn('Could not hide history modal after generating report:', e);
        }
    }

    ['antesTableBody', 'depoisTableBody'].forEach(tableId => {
        const tableBody = document.getElementById(tableId);
        tableBody.addEventListener('input', (e) => {
            const dataArray = tableId === 'antesTableBody' ? antesData : depoisData;
            // Recompute all rows in order to ensure previous-row values are up-to-date
            for (let i = 0; i < tableBody.rows.length; i++) {
                updateRow(tableBody, dataArray, i);
            }
        });
    });

    ['antesTableBody', 'depoisTableBody'].forEach(tableId => {
        const tableBody = document.getElementById(tableId);
        tableBody.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const row = e.target.closest('tr');
            if (!row) return;

            const inputs = row.getElementsByTagName('input');
            if (inputs.length < 4) return;

            const contextMenu = document.createElement('div');
            contextMenu.className = 'context-menu';
            contextMenu.style.position = 'absolute';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
            contextMenu.style.background = '#fff';
            contextMenu.style.border = '1px solid #ccc';
            contextMenu.style.padding = '5px';
            contextMenu.style.zIndex = '1000';

            const copyRowOption = document.createElement('div');
            copyRowOption.textContent = 'Copiar Linha';
            copyRowOption.style.padding = '2px 10px';
            copyRowOption.addEventListener('click', () => {
                clipboard = {
                    dataFim: inputs[0].value,
                    cliAfet: inputs[1].value,
                    cliAfetManobra: inputs[2].value,
                    tmaAfetManobra: inputs[3].value
                };
                console.log('Copiado:', clipboard);
                contextMenu.remove();
            });

            const pasteRowOption = document.createElement('div');
            pasteRowOption.textContent = 'Colar Linha';
            pasteRowOption.style.padding = '2px 10px';
            pasteRowOption.addEventListener('click', () => {
                if (clipboard) {
                    inputs[0].value = clipboard.dataFim || '';
                    inputs[1].value = clipboard.cliAfet || '';
                    inputs[2].value = clipboard.cliAfetManobra || '';
                    inputs[3].value = clipboard.tmaAfetManobra || '';
                    const rowIndex = row.rowIndex - 1;
                    const dataArray = tableId === 'antesTableBody' ? antesData : depoisData;
                    updateRow(tableBody, dataArray, rowIndex);
                }
                contextMenu.remove();
            });

            contextMenu.appendChild(copyRowOption);
            contextMenu.appendChild(pasteRowOption);
            document.body.appendChild(contextMenu);

            setTimeout(() => {
                document.addEventListener('click', () => contextMenu.remove(), { once: true });
            }, 0);
        });
    });

    addRowAntes.addEventListener('click', () => addRow(antesTableBody, antesData));
    addRowDepois.addEventListener('click', () => addRow(depoisTableBody, depoisData));

    // --- Test harness / example runner ---
    function ensureRows(tableBody, targetCount) {
        while (tableBody.rows.length > targetCount) {
            tableBody.deleteRow(tableBody.rows.length - 1);
        }
        while (tableBody.rows.length < targetCount) {
            const isAntes = tableBody.id === 'antesTableBody';
            addRow(tableBody, isAntes ? antesData : depoisData);
        }
    }

    function setTableRowsFromData(tableBody, rows) {
        const isAntes = tableBody.id === 'antesTableBody';
        const dataArray = isAntes ? antesData : depoisData;
        ensureRows(tableBody, rows.length);
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const tr = tableBody.rows[i];
            const inputs = tr.getElementsByTagName('input');
            inputs[0].value = r.dataFim || '';
            inputs[1].value = r.cliAfet != null ? String(r.cliAfet) : '';
        }
        // Recompute all rows in order
        for (let i = 0; i < tableBody.rows.length; i++) updateRow(tableBody, dataArray, i);
    }

    // Example: ANTES 20:00(80),21:00(0) ; DEPOIS 20:00(80),20:30(0)
    function runExampleCli40() {
        const antesRows = [
            { dataFim: '2025-10-01T20:00:00', cliAfet: 80 },
            { dataFim: '2025-10-01T21:00:00', cliAfet: 0 }
        ];
        const depoisRows = [
            { dataFim: '2025-10-01T20:00:00', cliAfet: 80 },
            { dataFim: '2025-10-01T20:30:00', cliAfet: 0 }
        ];
        setTableRowsFromData(antesTableBody, antesRows);
        setTableRowsFromData(depoisTableBody, depoisRows);
        // Update global arrays (already handled in updateRow) and recalc
        recalculate();
        console.log('Exemplo carregado: CLI GANHO esperado = 40');
    }

    // Expose to global for console access
    window.runExampleCli40 = runExampleCli40;

    // NOTE: quick example button removed from UI. runExampleCli40() remains exposed on window for console testing.

    ['antesTableBody', 'depoisTableBody'].forEach(tableId => {
        const tableBody = document.getElementById(tableId);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-row')) {
                const row = e.target.parentElement.parentElement;
                const rowIndex = row.rowIndex - 1;
                const dataArray = tableId === 'antesTableBody' ? antesData : depoisData;
                removeRow(tableBody, dataArray, rowIndex);
            } else if (e.target.classList.contains('duplicate-row')) {
                const row = e.target.parentElement.parentElement;
                const rowIndex = row.rowIndex - 1;
                const dataArray = tableId === 'antesTableBody' ? antesData : depoisData;
                duplicateRow(tableBody, dataArray, rowIndex);
            } else if (e.target.classList.contains('copy-to-right')) {
                const row = e.target.parentElement.parentElement;
                const rowIndex = row.rowIndex - 1;
                copyToRight(rowIndex);
            }
        });
    });

    clearBtn.addEventListener('click', () => {
        console.log('Botão Limpar clicado');
        // Também limpar o banner de relatório gerado anteriormente
        if (reportBanner) {
            reportBanner.classList.remove('d-block');
            reportBanner.classList.add('d-none');
            reportBanner.textContent = '';
        }
        antesData = [{ dataFim: '', cliAfet: 0, cliAfetManobra: 0, tmaAfetManobra: 0 }];
        depoisData = [{ dataFim: '', cliAfet: 0, cliAfetManobra: 0, tmaAfetManobra: 0 }];
        antesTableBody.innerHTML = `
            <tr>
                <td><input type="datetime-local" step="1" class="form-control form-control-sm date-time-input" data-type="dataFim"></td>
                <td><input type="number" class="form-control form-control-sm" data-type="cliAfet" placeholder="Ilimitado"></td>
                <td><input type="number" class="form-control form-control-sm" data-type="cliAfetManobra" readonly></td>
                <td><input type="number" class="form-control form-control-sm" data-type="tmaAfetManobra" readonly></td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm remove-row">Remover</button>
                    <button type="button" class="btn btn-info btn-sm duplicate-row">Duplicar</button>
                </td>
            </tr>
        `;
        depoisTableBody.innerHTML = `
            <tr>
                <td><input type="datetime-local" step="1" class="form-control form-control-sm date-time-input" data-type="dataFim"></td>
                <td><input type="number" class="form-control form-control-sm" data-type="cliAfet" placeholder="Ilimitado"></td>
                <td><input type="number" class="form-control form-control-sm" data-type="cliAfetManobra" readonly></td>
                <td><input type="number" class="form-control form-control-sm" data-type="tmaAfetManobra" readonly></td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm remove-row">Remover</button>
                    <button type="button" class="btn btn-info btn-sm duplicate-row">Duplicar</button>
                </td>
            </tr>
        `;
        recalculate();
    });

    generateReport.addEventListener('click', () => {
        console.log('Botão Gerar Relatório clicado');
        generateReportMessage();
    });

    saveBtn.addEventListener('click', () => {
        console.log('Botão SALVAR clicado');
        saveHistory();
    });

    historyBtn.addEventListener('click', () => {
        console.log('Botão HISTÓRICO clicado');
        updateHistoryModal();
    });

    historyContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-history')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            deleteHistory(index);
        } else if (e.target.classList.contains('generate-report')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            generateReportFromHistory(index);
        }
    });

    updateRow(antesTableBody, antesData, 0);
    updateRow(depoisTableBody, depoisData, 0);
});