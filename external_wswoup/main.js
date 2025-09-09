Ext.define("EAM.custom.external_wswoup", {
    extend: "EAM.custom.AbstractExtensibleFramework",
    getSelectors: function () {
        return {
            '[extensibleFramework] [tabName=LST]': {
                afterlayout: function() {
                    var grid = EAM.Utils.getScreen().down("readonlygrid");
                    
                    // 1. Torna a grid editável (se for readonly)
                    if (grid && grid.readonly) {
                        grid.setReadOnly(false);
                    }
                    
                    // 2. Encontra a coluna EVT_JOBTYPE e muda para OPTIONAL
                    var jobTypeColumn = grid.down('gridcolumn[dataIndex=EVT_JOBTYPE]');
                    
                    if (jobTypeColumn) {
                        // Remove restrições de edição
                        jobTypeColumn.readOnly = false;
                        jobTypeColumn.disabled = false;
                        jobTypeColumn.editable = true;
                        
                        // Configura o editor para ser opcional
                        if (!jobTypeColumn.editor) {
                            // Adiciona um editor se não existir
                            jobTypeColumn.editor = {
                                xtype: 'textfield',
                                allowBlank: true, // Campo opcional
                                selectOnFocus: true
                            };
                        } else {
                            // Se já tiver editor, torna opcional
                            jobTypeColumn.editor.allowBlank = true;
                            jobTypeColumn.editor.readOnly = false;
                        }
                        
                        // 3. Atualiza visualmente para mostrar que é editável
                        var headerEl = jobTypeColumn.getEl();
                        if (headerEl) {
                            headerEl.removeCls('x-item-disabled');
                            headerEl.setStyle('font-weight', 'normal');
                            headerEl.set({
                                'data-qtip': 'Optional - Click to edit'
                            });
                        }
                        
                        // 4. Adiciona estilo às células para indicar que são editáveis
                        var gridView = grid.getView();
                        var gridStore = grid.getStore();
                        
                        function makeCellsEditableStyle() {
                            for (var i = 0; i < gridStore.getCount(); i++) {
                                try {
                                    var node = gridView.getNode(i);
                                    if (node) {
                                        var columnIndex = grid.getColumnManager().getHeaderIndex(jobTypeColumn);
                                        var cells = node.querySelectorAll('td');
                                        
                                        if (cells[columnIndex]) {
                                            // Remove estilo de bloqueado
                                            cells[columnIndex].classList.remove('x-item-disabled');
                                            cells[columnIndex].style.cursor = 'pointer';
                                            cells[columnIndex].style.backgroundColor = '#f9f9f9';
                                            cells[columnIndex].title = 'Click to edit (optional)';
                                        }
                                    }
                                } catch(e) {
                                    console.log('Erro ao processar linha:', e);
                                }
                            }
                        }
                        
                        makeCellsEditableStyle();
                        gridView.on('scroll', makeCellsEditableStyle);
                        
                        console.log('Campo EVT_JOBTYPE alterado de RESTRICT para OPTIONAL');
                    }
                }  
            }
        };
    }
});