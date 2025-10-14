
Ext.define('EAM.custom.external_wsjobs', {
    extend: 'EAM.custom.AbstractExtensibleFramework',

    getSelectors: function () {

        function applyFieldRulesIfOrgSelected() {
            var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
            if (!vFormPanel) return;
        
            var orgValue = vFormPanel.getFldValue('organization');
            var orgStr = (orgValue == null) ? '' : String(orgValue).trim();
            if (orgStr === '') return;
        
            var recordIdVal = vFormPanel.getFldValue('recordid');
            var isNew = (recordIdVal == null || String(recordIdVal).trim() === '');
        
            var vFieldsObj = {};
        
            if (isNew) {
                vFieldsObj = {
                    "description": "optional",
                    "udfnote01": "optional",
                    "servicecategory": "required",
                    "serviceproblemcode": "required"
                };
            } else {
                vFieldsObj = {
                    "description": "optional",
                    "udfnote01": "protected",  
                    "servicecategory": "optional",
                    "serviceproblemcode": "optional"
                };
            }
        
            try {
                var fieldsAndButtons = vFormPanel.getForm().getFieldsAndButtons();
                EAM.Builder.setFieldState(vFieldsObj, fieldsAndButtons);
            } catch (error) {
                console.error('[WSJOBS] Erro ao aplicar regras:', error);
            }
        }
        
        
        var debounceTimer;
        function debounceApply() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFieldRulesIfOrgSelected, 150);
        }

        var descCache = {};

        function fetchServiceDescriptionFromLOV(org, code) {
            var cacheKey = org + '|' + code;
            if (descCache[cacheKey]) return descCache[cacheKey];

            try {
                var resp = EAM.Ajax.request({
                    url: '/web/base/LOVPOP',
                    method: 'POST',
                    params: {
                        popup: true,
                        GRID_NAME: 'LVCCSERVICECODES',
                        GRID_TYPE: 'LOV',
                        REQUEST_TYPE: 'LOV.HEAD_DATA.STORED',
                        LOV_TAGNAME: 'serviceproblemcode',
                        usagetype: 'lov',
                        USER_FUNCTION_NAME: 'WSJOBS',
                        CURRENT_TAB_NAME: 'HDR',
                        LOV_ALIAS_NAME_6: 'control.org',
                        LOV_ALIAS_VALUE_6: org,
                        LOV_ALIAS_TYPE_6: 'text',
                        filterfields: 'problemcode',
                        filteroperator: '=',
                        filtervalue: code,
                        eamid: '81f4c322-1529-4d8d-b8bc-9b6a1770135c',   // TOKEN
                        tenant: 'IBNQI1720580460_DEM'                    // TENANT
                    }
                });

                var rows = (((resp || {}).responseData || {}).pageData || {}).grid;
                rows = (((rows || {}).GRIDRESULT || {}).GRID || {}).DATA || [];

                if (rows.length > 0) {
                    var r = rows[0];
                    var desc = r.description || r.problemcodedesc || r.PROBLEMCODEDESC || r.problemcode;
                    if (desc) {
                        desc = String(desc).trim();
                        descCache[cacheKey] = desc;
                        return desc;
                    }
                } else {
                    
                }
            } catch (e) {
                console.error('[WSJOBS] Erro na requisição LOV LVCCSERVICECODES:', e);
            }

            return '';
        }

        var _fillingDesc = false;
        function fillDescriptionFromServiceCode(field) {
            if (_fillingDesc) return;
            _fillingDesc = true;

            try {
                var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                if (!vFormPanel) return;

                var orgVal = vFormPanel.getFldValue('organization');
                var codeVal = vFormPanel.getFldValue('serviceproblemcode');
                var org = (orgVal == null) ? '' : String(orgVal).trim();
                var code = (codeVal == null) ? '' : String(codeVal).trim();
                if (!org || !code) return;

                var cmp = vFormPanel.getFld('serviceproblemcode');
                if (!cmp) return;

                try {
                    var displayTxt = (typeof cmp.getDisplayValue === 'function') ? cmp.getDisplayValue() : cmp.getRawValue();
                    if (displayTxt && typeof displayTxt === 'string') {
                        if (displayTxt.indexOf(' - ') > -1) {
                            var parts = displayTxt.split(' - ');
                            var descFromDisplay = parts.slice(1).join(' - ').trim();
                            if (descFromDisplay) {
                                vFormPanel.setFldValue('description', descFromDisplay, true);
                                applyFieldRulesIfOrgSelected();
                                return;
                            }
                        }
                        if (displayTxt.trim() && displayTxt.trim().toUpperCase() !== code.toUpperCase()) {
                            vFormPanel.setFldValue('description', displayTxt.trim(), true);
                            applyFieldRulesIfOrgSelected();
                            return;
                        }
                    }
                } catch (eDisp) {
                    console.warn('[WSJOBS] Falha ao extrair descrição do display da LOV', eDisp);
                }

                var lovDesc = fetchServiceDescriptionFromLOV(org, code);
                if (lovDesc) {
                    vFormPanel.setFldValue('description', lovDesc, true);
                    applyFieldRulesIfOrgSelected();
                    return;
                }

                if (cmp && typeof cmp.getRawValue === 'function') {
                    var onlyRaw = cmp.getRawValue();
                    if (onlyRaw && String(onlyRaw).trim()) {
                        vFormPanel.setFldValue('description', String(onlyRaw).trim(), true);
                        applyFieldRulesIfOrgSelected();
                        return;
                    }
                }

            } catch (fatal) {
                console.error('[WSJOBS] Erro fatal ao preencher descrição:', fatal);
            } finally {
                _fillingDesc = false;
            }
        }

        // Eventos do formulário
        return {
            '[extensibleFramework] [tabName=HDR] [name=organization]': {
                customonblur: function () { applyFieldRulesIfOrgSelected(); },
                change: function () { applyFieldRulesIfOrgSelected(); }
            },

            '[extensibleFramework] [tabName=HDR] [isFormField]': {
                customonblur: function () { debounceApply(); },
                change: function () { debounceApply(); }
            },

            '[extensibleFramework] [tabName=HDR] lovfield[name=serviceproblemcode]': {
                select: function (field) { fillDescriptionFromServiceCode(field); },
                change: function (field) { fillDescriptionFromServiceCode(field); },
                customonblur: function (field) { fillDescriptionFromServiceCode(field); }
            }
        };
    }
});
