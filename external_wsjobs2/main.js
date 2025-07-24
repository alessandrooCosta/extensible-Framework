Ext.define("EAM.custom.external_wsjobs", {
    extend: "EAM.custom.AbstractExtensibleFramework",
    getSelectors: function () {
        return {
            '[extensibleFramework] [tabName=HDR] [name=reportedby]':{
                customonblur: function(field, lastValues) {
                var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                var vReportedBy = vFormPanel.getFldValue('reportedby');
                var vFieldsObj = {};
                if (!vReportedBy) {
                    vFieldsObj["datereported"] = "protected";
                    vFieldsObj["schedgroup"] = "required";
                }
                else {
                    vFieldsObj["datereported"] = "required";
                    vFieldsObj["schedgroup"] = "protected";
                }
                EAM.Builder.setFieldState(vFieldsObj, vFormPanel.getForm().getFieldsAndButtons());
            }
        },
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
    }
}
  });

