// USAR PARA TESTES E DESENVOLVIMENTO

Ext.define("EAM.custom.external_wsjobs", {
    extend: "EAM.custom.AbstractExtensibleFramework",
    getSelectors: function () {
        return {
            '[extensibleFramework] [tabName=HDR] uxcombobox[name=workorderstatus]': {
                customonblur: function (field) {
                    var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                    var vStatus = vFormPanel.getFld('workorderstatus').rawValue;
                    vFormPanel.setFldValue('udfchar01', vStatus, true);
                }
            }
        };
    }
  });
  
