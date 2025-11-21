Ext.define("EAM.custom.external_osobja", {
    extend: "EAM.custom.AbstractExtensibleFramework",

    getSelectors: function () {

        const EWS_URL = "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector";
        const API_KEY = "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36"; // API KEY
        const TENANT = "IBNQI1720580460_DEM"; // TENANT
        const ORGANIZATION = "IBNQ"; // ORGANIZATION
        const ORG_CODE = "C001"; // ORG CODE
        const EAM_FIELDS_NS = "http://schemas.datastream.net/MP_fields";
        const EAM_HEADERS_NS = "http://schemas.datastream.net/headers";

        // ----------------- HELPERS DE FORM / CAMPOS -----------------
        function getFormPanel() {
            return EAM.Utils.getCurrentTab().getFormPanel();
        }

        function getFields(fp) {
            return fp && fp.getForm && fp.getForm().getFieldsAndButtons();
        }
        
        // ----------------- REGRA: ESTADO DO CHECKBOX -----------------
        function setUdf03CheckboxState(enableCheckbox, fp) {
            fp = fp || getFormPanel();
            var fields = getFields(fp);
            if (!fields) return;

            var newState = enableCheckbox ? "optional" : "protected";
            var action = { 
                udfchkbox03: newState 
            };
            
            EAM.Builder.setFieldState(action, fields);
            console.log("[UDF03] Checkbox 03 definido como: " + newState);

            if (!enableCheckbox) {
                fp.setFldValue("udfchkbox03", false, false);
                setUdf03DateState(false, fp);
            }
        }
        
        // ----------------- REGRA: ESTADO DA DATA -----------------
        function setUdf03DateState(enableDate, fp) {
            fp = fp || getFormPanel();
            var fields = getFields(fp);
            if (!fields) return;

            var newState = enableDate ? "optional" : "protected";
            var action = { 
                udfdate03: newState 
            };

            EAM.Builder.setFieldState(action, fields);
            console.log("[UDF03] Data 03 definida como: " + newState);
            
            if (!enableDate) {
                fp.setFldValue("udfdate03", "", false);
            }
        }

        // ----------------- REGRA CENTRAL: APLICAR A PARTIR DOS VALORES -----------------
        // Usada no afterrender, hook e blur
        function applyUdf03RulesFromValues(fp) {
            fp = fp || getFormPanel();
            if (!fp) return;

            var code = (fp.getFldValue("udfchar50") || "").trim();
            var enableCheckbox = (code === "02" || code === "03");

            // Habilita/protege checkbox conforme o código
            setUdf03CheckboxState(enableCheckbox, fp);

            // Se o código permite, a data depende do valor atual do checkbox
            if (enableCheckbox) {
                var isChecked = !!fp.getFldValue("udfchkbox03");
                setUdf03DateState(isChecked, fp);
            }
        }

        function checkUDF51Value(value) {
            if (String(value).trim() === "02") {
                // placeholder se quiser lógica adicional
            }
        }

        // ----------------- CACHE PARA DESCRIÇÕES DO UDF50 -----------------
        var descCache = {};

        // ----------------- LOVPOP: BUSCA DESCRIÇÃO DO UDF50 -----------------
        function fetchUDF50DescriptionFromLOV(code) {
            if (!code) return "";
            code = String(code).trim();
            if (!code) return "";

            var cacheKey = code;
            if (descCache[cacheKey]) {
                return descCache[cacheKey];
            }

            try {
                var resp = EAM.Ajax.request({
                    url: "/web/base/LOVPOP",
                    method: "POST",
                    params: {
                        popup: true,
                        GRID_NAME: "LVUDFCD",                // Nome da grid do LOV (do JSON)
                        GRID_TYPE: "LOV",
                        REQUEST_TYPE: "LOV.HEAD_DATA.STORED", 
                        LOV_TAGNAME: "udfchar50",
                        usagetype: "lov",
                        USER_FUNCTION_NAME: "OSOBJA",       // Nome da função/tela
                        CURRENT_TAB_NAME: "HDR",

                        LOV_ALIAS_NAME_1: "param.rentity",
                        LOV_ALIAS_VALUE_1: "OBJ",
                        LOV_ALIAS_TYPE_1: "text",

                        LOV_ALIAS_NAME_2: "param.field",
                        LOV_ALIAS_VALUE_2: "udfchar50",
                        LOV_ALIAS_TYPE_2: "text",

                        LOV_ALIAS_NAME_3: "param.fieldid",
                        LOV_ALIAS_VALUE_3: "udfchar50",
                        LOV_ALIAS_TYPE_3: "text",

                        LOV_ALIAS_NAME_4: "param.associatedrentity",
                        LOV_ALIAS_VALUE_4: "OBJ",
                        LOV_ALIAS_TYPE_4: "text",

                        filterfields: "userdefinedfieldvalue",
                        filteroperator: "=",
                        filtervalue: code,

                        eamid: "4ad22f92-d098-4413-9473-f284878ff1d1",
                        tenant: "ASSET_EAM01"
                    }
                });

                var rows = (((resp || {}).responseData || {}).pageData || {}).grid;
                rows = (((rows || {}).GRIDRESULT || {}).GRID || {}).DATA || [];

                if (rows.length > 0) {
                    var r = rows[0];
                    var desc = r.description || r.userdefinedfieldvalue || "";
                    if (desc) {
                        desc = String(desc).trim();
                        descCache[cacheKey] = desc;
                        return desc;
                    }
                }
            } catch (e) {
                console.error("Erro na requisição do campo UDF50.", e);
            }

            return "";
        }

        // ----------------- HOOK NO setValue() DO UDFCHAR50 -----------------
        function hookUDF50Lookup(vFormPanel) {
            var fldCode = vFormPanel.getFld("udfchar50");
            var fldDesc = vFormPanel.getFld("udfchar51");
            if (!fldCode || !fldDesc) return;

            if (fldCode._UDF50_hooked) return;
            fldCode._UDF50_hooked = true;

            var originalSetValue = fldCode.setValue;

            fldCode.setValue = function (v) {
                originalSetValue.apply(this, arguments);

                Ext.defer(function () {
                    var code = fldCode.getValue();
                    var trimmedCode = (code || "").trim();

                    if (!trimmedCode) {
                        // limpa desc e protege checkbox/data
                        vFormPanel.setFldValue("udfchar51", "", false);
                        applyUdf03RulesFromValues(vFormPanel);
                        return;
                    }

                    var desc = fetchUDF50DescriptionFromLOV(trimmedCode);
                    if (!desc) {
                        desc = trimmedCode;
                    }

                    vFormPanel.setFldValue("udfchar51", desc, false);
                    checkUDF51Value(desc);

                    // Aplica regra central após tudo preenchido
                    applyUdf03RulesFromValues(vFormPanel);
                }, 80);
            };
        }

        // ----------------- SELECTORS -----------------
        return {
            // Ativa hook do UDF50 e reaplica regras ao abrir/reabrir a tela
            "[extensibleFramework] [tabName=HDR]": {
                afterrender: function () {
                    var vFormPanel = getFormPanel();
                    if (vFormPanel) {
                        hookUDF50Lookup(vFormPanel);

                        // Dá um tempinho pro EAM carregar os valores e reaplica regras
                        Ext.defer(function () {
                            applyUdf03RulesFromValues(vFormPanel);
                        }, 200);
                    }
                }
            },

            // UDFCHAR50 → UDFCHAR51 + regra do checkbox/data (fallback no blur)
            "[extensibleFramework] [tabName=HDR] [name=udfchar50]": {
                customonblur: function () {
                    var vFormPanel = getFormPanel();
                    if (!vFormPanel) return;

                    var code = vFormPanel.getFldValue("udfchar50");
                    var trimmedCode = (code || "").trim();

                    if (!trimmedCode) {
                        vFormPanel.setFldValue("udfchar51", "", true);
                        applyUdf03RulesFromValues(vFormPanel);
                        return;
                    }

                    var desc = fetchUDF50DescriptionFromLOV(trimmedCode);
                    if (!desc) {
                        desc = trimmedCode;
                    }

                    vFormPanel.setFldValue("udfchar51", desc, true);
                    checkUDF51Value(desc);

                    // Reaplica regra central com base nos valores atuais
                    applyUdf03RulesFromValues(vFormPanel);
                }
            },

            // Checkbox → libera/bloqueia a data (udfdate03)
            "[extensibleFramework] [tabName=HDR] checkbox[name=udfchkbox03]": {
                change: function (field, newValue) {
                    setUdf03DateState(newValue, getFormPanel());
                }
            }
        };
    }
});
