// Define uma classe JavaScript no padrão Ext JS
Ext.define("EAM.custom.external_wsjobs", {
  // Informa que essa classe estende a base de extensões customizadas do EAM
  extend: "EAM.custom.AbstractExtensibleFramework",
  // Função obrigatória que retorna os "seletores" (eventos amarrados a elementos da tela)
  getSelectors: function () {
    return {
      // === REGRA 1 ===
      // Quando o campo 'reportedby' na aba 'HDR' perder o foco (evento 'blur')
      '[extensibleFramework] [tabName=HDR] [name=reportedby]': {
        customonblur: function (field, lastValues) {
          // Obtém o painel de formulário da aba atual
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          // Lê o valor do campo 'reportedby'
          var vReportedBy = vFormPanel.getFldValue('reportedby');
          // Objeto que será usado para definir os estados dos campos
          var vFieldsObj = {};
          // Se o campo 'reportedby' estiver vazio
          if (!vReportedBy) {
            vFieldsObj["datereported"] = "protected"; // Protege 'datereported'
            vFieldsObj["schedgroup"] = "required";    // Torna 'schedgroup' obrigatório
          } else {
            // Se estiver preenchido, inverte os estados
            vFieldsObj["datereported"] = "required";
            vFieldsObj["schedgroup"] = "protected";
          }
          // Aplica os estados definidos aos campos usando o builder do EAM
          EAM.Builder.setFieldState(
            vFieldsObj, // Objeto com os estados definidos
            vFormPanel.getForm().getFieldsAndButtons() // Campos e botões da tela atual
          );
        }
      },
      // === REGRA 2 ===
      // Quando o usuário selecionar uma opção no combo 'workorderstatus'
      '[extensibleFramework] [tabName=HDR] uxcombobox[name=workorderstatus]': {
        select: function (field) {
          // Obtém o painel de formulário da aba atual
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          // Pega o valor do campo 'workorderstatus' (como texto)
          var vStatus = vFormPanel.getFld('workorderstatus').rawValue;
          // Define o valor do campo 'udfchar01' com o mesmo texto
          // 'true' força a atualização visual do campo
          vFormPanel.setFldValue('udfchar01', vStatus, true);
        }
      },

      // === REGRA 3 ===
      // Quando for criado um novo registro na aba 'ACT' (que é uma tab view)
      '[extensibleFramework] [tabName=ACT][isTabView=true]': {
        afternewrecord: function () {
          // Obtém o painel de formulário da aba atual
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          // Pega o valor do campo 'workordernum' (número da OS)
          var vWorkorder = vFormPanel.getFldValue('workordernum');
          // Realiza uma chamada Ajax para buscar dados da ordem
          var vHDR = EAM.Ajax.request({
            url: "GRIDDATA", // Endereço do recurso (padrão do EAM)
            params: {
              USER_FUNCTION_NAME: "WSJOBS", // Nome da função de usuário
              SYSTEM_FUNCTION_NAME: "WSJOBS", // Nome da função do sistema
              CURRENT_TAB_NAME: "LST", // Aba de onde virão os dados
              COMPONENT_INFO_TYPE: "DATA_ONLY", // Tipo da resposta
              filterfields: "workordernum", // Campo de filtro
              filteroperator: "=",           // Operador
              filtervalue: vWorkorder        // Valor a ser filtrado (número da OS)
            }
          }),
          // Extrai os dados retornados da chamada Ajax
          vRows = vHDR.responseData.pageData.grid.GRIDRESULT.GRID.DATA;
          // Conta quantos registros vieram
          vCountRows = vRows.length;
          // Se só veio um registro, pega a descrição
          if (vCountRows == 1) {
            var vWoDesc = vRows[0].description;
          }
          // Se a descrição não estiver vazia, preenche o campo 'udfchar02'
          if (!Ext.isEmpty(vWoDesc)) {
            vFormPanel.setFldValue('udfchar02', vWoDesc, true);
          }
        }
      }
    }
  }
});
