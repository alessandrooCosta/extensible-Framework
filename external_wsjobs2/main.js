// Define uma nova classe ExtJS chamada "EAM.custom.external_wsjobs"
Ext.define("EAM.custom.external_wsjobs", {
    // Herda funcionalidades da classe AbstractExtensibleFramework do EAM
    extend: "EAM.custom.AbstractExtensibleFramework",
    
    // Função principal que retorna os seletores CSS e suas respectivas funções
    getSelectors: function () {
        return {
            
            // SEÇÃO 1: CONTROLE DE CAMPOS BASEADO NO "REPORTED BY"
            // Seleciona o campo "reportedby" na aba "HDR" do framework extensível
            '[extensibleFramework] [tabName=HDR] [name=reportedby]': {
                // Define função que executa quando o campo perde o foco (onblur)
                // Parâmetros: field (o campo atual), lastValues (valores anteriores)
                customonblur: function(field, lastValues) {
                    // Obtém referência ao painel do formulário da aba atual
                    var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                    
                    // Lê o valor atual do campo "reportedby"
                    var vReportedBy = vFormPanel.getFldValue('reportedby');
                    
                    // Cria objeto para armazenar configurações de estado dos campos
                    var vFieldsObj = {};
                    
                    // Verifica se o campo "reportedby" está vazio ou nulo
                    if (!vReportedBy) {
                        // SE NÃO HÁ PESSOA REPORTANDO:
                        // Campo "datereported" fica protegido (não pode ser editado/é opcional)
                        vFieldsObj["datereported"] = "protected";
                        // Campo "schedgroup" torna-se obrigatório
                        vFieldsObj["schedgroup"] = "required";
                    }
                    else {
                        // SE HÁ PESSOA REPORTANDO:
                        // Campo "datereported" torna-se obrigatório (deve ser preenchido)
                        vFieldsObj["datereported"] = "required";
                        // Campo "schedgroup" fica protegido (não pode ser editado/é opcional)
                        vFieldsObj["schedgroup"] = "protected";
                    }
                    
                    // Aplica as configurações de estado aos campos do formulário
                    // Primeiro parâmetro: objeto com configurações dos campos
                    // Segundo parâmetro: lista de campos e botões do formulário atual
                    EAM.Builder.setFieldState(vFieldsObj, vFormPanel.getForm().getFieldsAndButtons());
                }
            },
            
            // SEÇÃO 2: SINCRONIZAÇÃO DE STATUS DA ORDEM DE TRABALHO
            // Seleciona um combo box específico chamado "workorderstatus" na aba "HDR"
            // uxcombobox indica que é um componente combo box personalizado do sistema
            '[extensibleFramework] [tabName=HDR] uxcombobox[name=workorderstatus]': {
                
                // Define função que executa quando usuário SELECIONA um valor no combo box
                // Diferente de onblur, "select" é disparado no momento da seleção
                select: function (field) {
                    
                    // Obtém referência ao painel do formulário da aba atual
                    var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                    
                    // Lê o valor RAW (não processado) do campo "workorderstatus"
                    // rawValue pega o valor original/texto visível, não o código interno
                    // Por exemplo: se mostra "Em Progresso" mas o código é "PROG", pega "Em Progresso"
                    var vStatus = vFormPanel.getFld('workorderstatus').rawValue;
                    
                    // Copia o valor selecionado do status da ordem para o campo personalizado "udfchar01"
                    // Parâmetros:
                    // 1º: nome do campo de destino ('udfchar01')
                    // 2º: valor a ser definido (vStatus)
                    // 3º: true = força atualização visual da interface
                    vFormPanel.setFldValue('udfchar01', vStatus, true);
                }
            }
            
        }; // Fim do return dos selectors
    } // Fim da função getSelectors
}); // Fim da definição da classe