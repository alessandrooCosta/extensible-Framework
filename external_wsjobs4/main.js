Ext.define("EAM.custom.external_wsjobs", {
    extend: "EAM.custom.AbstractExtensibleFramework",
    getSelectors: function () {
        console.log('WSJOBS') 
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
        '[extensibleFramework] [tabName=ACT] [isTabView=true]': { 
            afternewrecord: function () { 
              var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel(); 
              var vWorkorder = vFormPanel.getFldValue('workordernum'); 
              var vHDR =  EAM.Ajax.request({ 
                url : "GRIDDATA",    
    
                params : {     
          
                  USER_FUNCTION_NAME:"WSJOBS",                                                         
                  SYSTEM_FUNCTION_NAME : "WSJOBS", 
                  CURRENT_TAB_NAME : "LST", 
                  COMPONENT_INFO_TYPE : "DATA_ONLY", 
                  filterfields : "workordernum", 
                  filteroperator : "=", 
                  filtervalue : vWorkorder 
                }}), 
              vRows = vHDR.responseData.pageData.grid.GRIDRESULT.GRID.DATA; 
              vCountRows = vRows.length;   
              if (vCountRows == 1) { 
                var vWoDesc = vHDR.responseData.pageData.grid.GRIDRESULT.GRID.DATA[0].description;         
                var vWoDesc = vRows[0].description;
                var vWoDesc2 = vRows[0].description;
              } 
              if (!Ext.isEmpty(vWoDesc)) { 
                vFormPanel.setFldValue('udfchar02',vWoDesc,true); 
                //vFormPanel.setFldValue('relatedworkorder',vWoDesc, true);
              } 
              if (!Ext.isEmpty(vWoDesc2)) {
                  vFormPanel.setFldValue('udfchar03',vWoDesc2, true);
              }
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

