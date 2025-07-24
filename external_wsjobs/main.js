// Define uma nova classe chamada "external_wsjobs" no namespace "EAM.custom"
Ext.define("EAM.custom.external_wsjobs", {
  // Estende (herda) a classe base "AbstractExtensibleFramework"
  extend: "EAM.custom.AbstractExtensibleFramework",
  // Define a função getSelectors, que retorna os componentes da interface que terão lógica personalizada
  getSelectors: function () {
      // Retorna um objeto com os seletores e suas respectivas funções de evento
      return {
          // Seletor para o componente uxcombobox com nome "workorderstatus" na aba "HDR"
          '[extensibleFramework] [tabName=HDR] uxcombobox[name=workorderstatus]': {
              // Define a função que será executada quando o usuário selecionar um valor no combo box
              select: function (field) {
                  // Obtém o painel de formulário da aba atual
                  var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                  // Lê o valor selecionado no campo "workorderstatus"
                  var vStatus = vFormPanel.getFld('workorderstatus').rawValue;
                  // Define o valor do campo "udfchar01" com o valor selecionado no campo "workorderstatus"
                  // O terceiro parâmetro "true" garante que a interface seja atualizada visualmente
                  vFormPanel.setFldValue('udfchar01', vStatus, true);
              }
          }
      };
  }
});

