// Define um "custom" do EAM para a UF/tela atual
Ext.define("EAM.custom.external_wswoup", {
    // Herdamos utilidades e o mecanismo de selectors do framework extensível
    extend: "EAM.custom.AbstractExtensibleFramework",
    
    // Ponto de entrada: retorna um mapa de seletores → handlers (funções)
    getSelectors: function () {
        // Log inicial para sabermos que o arquivo carregou e o que vamos procurar
        console.log('✅ Código carregado - buscando coluna EVT_JOBTYPE');
        
        // Retorna os seletores que o framework vai escutar
        return {
            // Atuamos na aba/lista "listonly" (usada em telas tipo WSWOUP)
            'listonly': {
                // Após a aba renderizar (quando já existem componentes internos)
                afterrender: function(listOnlyTab) {
                    console.log('✅ Tab listonly encontrada');
                    
                    // Pega a grid editável dentro da aba (se for readonly, troque o seletor)
                    var grid = listOnlyTab.down('editablegrid');
                    if (grid) {
                        console.log('✅ Grid editável encontrada');
                        
                        // 1) Coleta TODAS as colunas atuais da grid
                        var allColumns = grid.getColumns();
                        console.log('📋 Colunas disponíveis:');
                        allColumns.forEach(function(column, index) {
                            // Loga posição, dataIndex e texto da coluna (p/ diagnosticar)
                            console.log('   ', index, column.dataIndex, column.text);
                        });
                        
                        // 2) Procuramos especificamente pela coluna EVT_JOBTYPE
                        var jobTypeColumn = null;
                        
                        // Primeiro: tentativa direta via dataIndex exato
                        jobTypeColumn = grid.down('gridcolumn[dataIndex=evt_jobtype]');
                        
                        // Se não achar pelo dataIndex, tentamos por "similaridade" no texto/dataIndex
                        if (!jobTypeColumn) {
                            allColumns.forEach(function(column) {
                                // Obs.: procura "job" no label (text) ou no dataIndex
                                if (column.text && column.text.toLowerCase().includes('job') || 
                                    column.dataIndex && column.dataIndex.toLowerCase().includes('job')) {
                                    jobTypeColumn = column;
                                }
                            });
                        }
                        
                        // Se encontramos alguma coluna candidata…
                        if (jobTypeColumn) {
                            console.log('🎉 COLUNA ENCONTRADA:', jobTypeColumn.dataIndex, jobTypeColumn.text);
                            
                            // 3) Tornar a coluna "opcional" (não obrigatória) e editável
                            // readOnly=false + editable=true sinalizam que pode ser editada inline
                            jobTypeColumn.readOnly = false;
                            jobTypeColumn.editable = true;
                            
                            // Se já houver um editor configurado, garantir que não seja obrigatório
                            if (jobTypeColumn.editor) {
                                jobTypeColumn.editor.allowBlank = true;
                            }
                            
                            console.log('✅ Coluna tornada opcional e editável');
                            
                            // 4) Aplicar um pequeno estilo/UX para indicar que dá para editar
                            applyOptionalStyle(grid, jobTypeColumn);
                            
                        } else {
                            // Se não achamos, logamos para facilitar o diagnóstico
                            console.log('❌ Coluna EVT_JOBTYPE não encontrada');
                            console.log('📝 DataIndex das colunas:', allColumns.map(function(col) {
                                return col.dataIndex;
                            }));
                        }
                    }
                }
            }
        };
        
        // ----- Função auxiliar: aplica um "hint" visual na coluna para indicar edição -----
        function applyOptionalStyle(grid, jobTypeColumn) {
            var gridView = grid.getView();   // view (DOM/renderização) da grid
            var gridStore = grid.getStore(); // store (dados) da grid
            
            // Função que percorre as linhas renderizadas e estiliza só a célula da coluna alvo
            function styleCells() {
                if (gridStore && gridStore.getCount() > 0) {
                    for (var i = 0; i < gridStore.getCount(); i++) {
                        try {
                            // Pega o elemento DOM (tr da linha i)
                            var node = gridView.getNode(i);
                            if (node) {
                                // Descobre o índice (posição) da coluna alvo no header
                                var columnIndex = grid.getColumnManager().getHeaderIndex(jobTypeColumn);
                                // Coleta todas as <td> da linha
                                var cells = node.querySelectorAll('td');
                                
                                if (cells[columnIndex]) {
                                    // Cursor de "pointer" e um title ajudam a indicar que é editável
                                    cells[columnIndex].style.cursor = 'pointer';
                                    cells[columnIndex].title = 'Campo opcional - clique para editar';
                                }
                            }
                        } catch(e) {
                            // Em caso de erro em uma linha, loga mas continua
                            console.log('Erro ao estilizar célula:', e);
                        }
                    }
                }
            }
            
            // Aplica o estilo agora…
            styleCells();
            
            // …e reaplica quando houver scroll/atualização (células re-renderizadas)
            gridView.on('scroll', styleCells);
            gridStore.on('update', styleCells);
            gridStore.on('load', styleCells);
        }
    }
});
