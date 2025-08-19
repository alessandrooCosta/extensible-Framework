// Define uma nova classe JavaScript seguindo o padrão do Ext JS
// O nome da classe é "EAM.custom.external_wsjobs"
Ext.define("EAM.custom.external_wsjobs", {
  
  // Especifica que esta classe herda de "EAM.custom.AbstractExtensibleFramework"
  // Isso significa que ela vai ter acesso a todos os métodos e propriedades da classe pai
  extend: "EAM.custom.AbstractExtensibleFramework",
  
  // Função obrigatória que deve retornar um objeto com os "seletores"
  // Os seletores são como "ouvintes de eventos" que ficam observando elementos na tela
  getSelectors: function () {
    // Retorna um objeto onde cada chave é um seletor CSS e o valor são os eventos
    return {
      
      // ================================
      // REGRA 1: Controle do campo 'reportedby'
      // ================================
      
      // Este seletor observa o campo 'reportedby' na aba 'HDR'
      // [extensibleFramework] = elemento com esse atributo (container principal)
      // [tabName=HDR] = elemento que representa a aba chamada 'HDR'
      // [name=reportedby] = campo de input com name='reportedby'
      '[extensibleFramework] [tabName=HDR] [name=reportedby]': {
        
        // Evento customizado que dispara quando o campo perde o foco (blur)
        customonblur: function (field, lastValues) {
          
          // Obtém a referência do painel de formulário da aba que está ativa no momento
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          
          // Lê o valor atual do campo 'reportedby'
          // getFldValue é um método do framework EAM para obter valores de campos
          var vReportedBy = vFormPanel.getFldValue('reportedby');
          
          // Cria um objeto vazio que vai armazenar as configurações de estado dos campos
          var vFieldsObj = {};
          
          // Verifica se o campo 'reportedby' está vazio ou nulo
          if (!vReportedBy) {
            // Se estiver vazio:
            // - O campo 'datereported' fica protegido (não pode ser editado)
            vFieldsObj["datereported"] = "protected";
            // - O campo 'schedgroup' se torna obrigatório
            vFieldsObj["schedgroup"] = "required";
          } else {
            // Se estiver preenchido, inverte a lógica:
            // - O campo 'datereported' se torna obrigatório
            vFieldsObj["datereported"] = "required";
            // - O campo 'schedgroup' fica protegido
            vFieldsObj["schedgroup"] = "protected";
          }
          
          // Aplica as configurações de estado definidas acima aos campos da tela
          // setFieldState é um método do framework EAM que altera propriedades dos campos
          EAM.Builder.setFieldState(
            vFieldsObj, // Objeto com as configurações (qual campo e qual estado)
            vFormPanel.getForm().getFieldsAndButtons() // Lista de todos os campos e botões da tela
          );
        }
      },
      
      // ================================
      // REGRA 2: Sincronização do status da ordem de trabalho
      // ================================
      
      // Este seletor observa um combo box (dropdown) chamado 'workorderstatus' na aba 'HDR'
      // uxcombobox é um tipo específico de campo combo box do framework
      '[extensibleFramework] [tabName=HDR] uxcombobox[name=workorderstatus]': {
        
        // Evento que dispara quando o usuário seleciona uma opção no combo box
        select: function (field) {
          
          // Obtém a referência do painel de formulário da aba atual
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          
          // Obtém o valor selecionado no combo box 'workorderstatus'
          // rawValue pega o texto visível da opção selecionada (não o valor interno)
          var vStatus = vFormPanel.getFld('workorderstatus').rawValue;
          
          // Copia o valor selecionado para o campo 'udfchar01'
          // setFldValue(nome_do_campo, valor, atualizar_visualmente)
          // O terceiro parâmetro 'true' força a atualização visual na tela
          vFormPanel.setFldValue('udfchar01', vStatus, true);
        }
      },
      
      // ================================
      // REGRA 3: Preenchimento automático ao criar novo registro
      // ================================
      
      // Este seletor observa a aba 'ACT' que é uma visualização em abas (tabview)
      // [isTabView=true] especifica que é uma aba dentro de outra aba
      '[extensibleFramework] [tabName=ACT][isTabView=true]': {
        
        // Evento que dispara depois que um novo registro é criado nesta aba
        afternewrecord: function () {
          
          // Obtém a referência do painel de formulário da aba atual
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          
          // Pega o número da ordem de trabalho do registro atual
          var vWorkorder = vFormPanel.getFldValue('workordernum');
          
          // Faz uma chamada Ajax (requisição HTTP) para buscar dados no servidor
          var vHDR = EAM.Ajax.request({
            url: "GRIDDATA", // Endpoint da API que retorna dados de grid
            
            // Parâmetros que serão enviados na requisição
            params: {
              USER_FUNCTION_NAME: "WSJOBS", // Nome da função definida pelo usuário
              SYSTEM_FUNCTION_NAME: "WSJOBS", // Nome da função do sistema
              CURRENT_TAB_NAME: "LST", // Aba de onde vêm os dados (lista)
              COMPONENT_INFO_TYPE: "DATA_ONLY", // Tipo de resposta (só dados, sem layout)
              filterfields: "workordernum", // Campo que será usado para filtrar
              filteroperator: "=", // Operador de comparação (igual a)
              filtervalue: vWorkorder // Valor para filtrar (o número da ordem de trabalho)
            }
          }),
          
          // Extrai os dados da resposta da requisição Ajax
          // Navega pela estrutura: responseData -> pageData -> grid -> GRIDRESULT -> GRID -> DATA
          vRows = vHDR.responseData.pageData.grid.GRIDRESULT.GRID.DATA;
          
          // Conta quantos registros foram retornados
          vCountRows = vRows.length;
          
          // Se retornou exatamente um registro
          if (vCountRows == 1) {
            // Pega o campo 'description' do primeiro (e único) registro
            var vWoDesc = vRows[0].description;
          }
          
          // Verifica se a descrição não está vazia ou nula
          // Ext.isEmpty é uma função do Ext JS que verifica se um valor está vazio
          if (!Ext.isEmpty(vWoDesc)) {
            // Preenche o campo 'udfchar02' com a descrição encontrada
            // O terceiro parâmetro 'true' atualiza a interface visualmente
            vFormPanel.setFldValue('udfchar02', vWoDesc, true);
          }
        }
      }
      
    } // Fim do objeto return
  } // Fim da função getSelectors
}); // Fim da definição da classe