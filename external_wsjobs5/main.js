Ext.define('EAM.custom.external_wsjobs', {
    extend: 'EAM.custom.AbstractExtensibleFramework',
    getSelectors: function() {
        console.log('WSJOBS5 carregado');
        return {
            
            '[extensibleFramework] [tabName=HDR] [name=organization]': {
    customonblur: function(field, lastValues) {
        var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
        var orgValue = vFormPanel.getFldValue('organization');
        
        if (orgValue && orgValue.trim() !== '') {
            console.log('Organização selecionada, aplicando regras...'); // log para debug
            var vFieldsObj = {};
            vFieldsObj["description"] = "protected";
            vFieldsObj["servicecategory"] = "required";
            vFieldsObj["serviceproblemcode"] = "required";
            vFieldsObj["udfnote01"] = "protected";
            try {
                var fieldsAndButtons = vFormPanel.getForm().getFieldsAndButtons();
                EAM.Builder.setFieldState(vFieldsObj, fieldsAndButtons);
                console.log('Regras aplicadas');
            } catch (error) {
                console.error('Erro:', error);
            }
        }
 
    }
},


        };
    }
});