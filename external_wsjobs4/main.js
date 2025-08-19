// Define uma nova classe ExtJS chamada "EAM.custom.external_wsjobs"
Ext.define("EAM.custom.external_wsjobs", {
  // Herda funcionalidades da classe AbstractExtensibleFramework do EAM
  extend: "EAM.custom.AbstractExtensibleFramework",
  
  // Função principal que retorna os seletores CSS e suas respectivas funções
  getSelectors: function () {
      // Log no console para debug - indica que o módulo WSJOBS foi carregado
      console.log('WSJOBS') 
      
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
          
          // SEÇÃO 2: AUTO-PREENCHIMENTO DE CAMPOS EM NOVA ATIVIDADE
          // Seleciona a aba "ACT" (Activities/Atividades) quando está em modo de visualização de abas
          '[extensibleFramework] [tabName=ACT] [isTabView=true]': { 
              // Função executada APÓS criar um novo registro na aba de atividades
              afternewrecord: function () { 
                  // Obtém referência ao painel do formulário da aba atual
                  var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel(); 
                  
                  // Lê o número da ordem de trabalho do formulário atual
                  var vWorkorder = vFormPanel.getFldValue('workordernum'); 
                  
                  // Faz uma requisição Ajax síncrona para buscar dados da ordem de trabalho
                  var vHDR = EAM.Ajax.request({ 
                      url: "GRIDDATA", // Endpoint para buscar dados em formato grid
                      
                      // Parâmetros da requisição
                      params: {     
                          // Nome da função customizada do usuário
                          USER_FUNCTION_NAME: "WSJOBS",                                                         
                          // Nome da função do sistema
                          SYSTEM_FUNCTION_NAME: "WSJOBS", 
                          // Nome da aba atual para contexto
                          CURRENT_TAB_NAME: "LST", 
                          // Tipo de informação - apenas dados, sem metadados
                          COMPONENT_INFO_TYPE: "DATA_ONLY", 
                          // Campo usado para filtrar os resultados
                          filterfields: "workordernum", 
                          // Operador de comparação (igual a)
                          filteroperator: "=", 
                          // Valor para filtrar (número da ordem de trabalho)
                          filtervalue: vWorkorder 
                      }
                  }), 
                  
                  // Extrai as linhas de dados da resposta da requisição Ajax
                  // Navega pela estrutura: responseData -> pageData -> grid -> GRIDRESULT -> GRID -> DATA
                  vRows = vHDR.responseData.pageData.grid.GRIDRESULT.GRID.DATA; 
                  
                  // Conta quantas linhas foram retornadas
                  vCountRows = vRows.length;   
                  
                  // Verifica se retornou exatamente 1 registro
                  if (vCountRows == 1) { 
                      // MÚLTIPLAS FORMAS DE ACESSAR A DESCRIÇÃO (redundante, mas garante compatibilidade):
                      
                      // Forma 1: Acesso através da estrutura completa da resposta
                      var vWoDesc = vHDR.responseData.pageData.grid.GRIDRESULT.GRID.DATA[0].description;         
                      
                      // Forma 2: Acesso através da variável vRows (mais limpo)
                      var vWoDesc = vRows[0].description;
                      
                      // Forma 3: Cria uma segunda variável com mesmo valor (para backup/uso múltiplo)
                      var vWoDesc2 = vRows[0].description;
                  } 
                  
                  // Verifica se a primeira descrição não está vazia usando função ExtJS
                  // Ext.isEmpty() verifica null, undefined, string vazia, array vazio, etc.
                  if (!Ext.isEmpty(vWoDesc)) { 
                      // Preenche campo customizado "udfchar02" com a descrição da ordem de trabalho
                      // Parâmetros: nome do campo, valor, atualizar interface (true)
                      vFormPanel.setFldValue('udfchar02', vWoDesc, true); 
                      
                      // Linha comentada - possivelmente preencheria campo "relatedworkorder"
                      // vFormPanel.setFldValue('relatedworkorder', vWoDesc, true);
                  } 
                  
                  // Verifica se a segunda descrição não está vazia
                  if (!Ext.isEmpty(vWoDesc2)) {
                      // Preenche campo customizado "udfchar03" com a descrição da ordem de trabalho
                      vFormPanel.setFldValue('udfchar03', vWoDesc2, true);
                  }
              } 
          },
          
          // SEÇÃO 3: SINCRONIZAÇÃO DE STATUS DA ORDEM DE TRABALHO
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