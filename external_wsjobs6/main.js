Ext.define("EAM.custom.external_osobja", {
    extend: "EAM.custom.AbstractExtensibleFramework",

    getSelectors: function () {

        function getFormPanel() {
            return EAM.Utils.getCurrentTab().getFormPanel();
        }

        function getFields(fp) {
            return fp && fp.getForm && fp.getForm().getFieldsAndButtons();
        }

        function setProtectedState(isProtected, formPanel) {
            if (!formPanel) return;

            var fields = getFields(formPanel);
            if (!fields) return;

            var newState = isProtected ? "protected" : "optional";

            var fieldsToChange = [
                "department",
                "udfchar50"
            ];

            var action = {};
            fieldsToChange.forEach(function (fieldName) {
                action[fieldName] = newState;
            });

            EAM.Builder.setFieldState(action, fields);
        }

        function updateUdf03State(fp) {
            fp = fp || getFormPanel();
            if (!fp) return;

            var fields = getFields(fp);
            if (!fields) return;

            var code = (fp.getFldValue("udfchar50") || "").trim();

            var checked = false;
            try {
                var chkCmp = fp.getFld && fp.getFld("udfchkbox03");
                if (chkCmp && typeof chkCmp.getValue === "function") {
                    checked = !!chkCmp.getValue();
                } else {
                    var raw = fp.getFldValue("udfchkbox03");
                    if (raw === true) checked = true;
                    else if (raw) {
                        raw = String(raw).trim().toUpperCase();
                        checked = (raw === "Y" || raw === "S" || raw === "TRUE" || raw === "1" || raw === "+" || raw === "ON" || raw === "T");
                    }
                }
            } catch (e) {
                console.warn("[UDF03] Erro ao ler checkbox:", e);
            }


            if (code === "02" || code === "03") {

                EAM.Builder.setFieldState({ udfchkbox03: "optional" }, fields);

                if (checked) {
                    EAM.Builder.setFieldState({ udfdate03: "optional" }, fields);
                } else {
                    EAM.Builder.setFieldState({ udfdate03: "protected" }, fields);
                    fp.setFldValue("udfdate03", "", false);
                }
            } else {
                EAM.Builder.setFieldState({
                    udfchkbox03: "protected",
                    udfdate03: "protected"
                }, fields);

                fp.setFldValue("udfchkbox03", false, false);
                fp.setFldValue("udfdate03", "", false);
            }
        }

        var descCache = {};
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
                        GRID_NAME: "LVUDFCD",
                        GRID_TYPE: "LOV",
                        REQUEST_TYPE: "LOV.HEAD_DATA.STORED",
                        LOV_TAGNAME: "udfchar50",
                        usagetype: "lov",
                        USER_FUNCTION_NAME: "OSOBJA",
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
                        vFormPanel.setFldValue("udfchar51", "", false);
                        updateUdf03State(vFormPanel);
                        return;
                    }

                    var desc = fetchUDF50DescriptionFromLOV(trimmedCode);
                    if (!desc) {
                        desc = trimmedCode;
                    }

                    vFormPanel.setFldValue("udfchar51", desc, false);

                    updateUdf03State(vFormPanel);
                }, 80);
            };
        }

        return {
            "[extensibleFramework] [tabName=HDR]": {
                afterrender: function () {
                    var vFormPanel = getFormPanel();
                    if (vFormPanel) {
                        hookUDF50Lookup(vFormPanel);

                        Ext.defer(function () {
                            updateUdf03State(vFormPanel);
                            var assetStatusCode = vFormPanel.getFldValue('assetstatus');
                            var statusToAllowEdit = "I";
                            var shouldProtect = (assetStatusCode || "").toUpperCase() !== statusToAllowEdit;
                            setProtectedState(shouldProtect, vFormPanel);
                        }, 200);
                    }
                },

                // NOVO HOOK: Protege/Disponibiliza os campos após o salvamento
                aftersaverecord: function () {
                    var vFormPanel = getFormPanel();
                    if (!vFormPanel) return;
                    var assetStatusCode = vFormPanel.getFldValue('assetstatus');
                    var statusToAllowEdit = "I";
                    var shouldProtect = (assetStatusCode || "").toUpperCase() !== statusToAllowEdit;
                    setProtectedState(shouldProtect, vFormPanel);
                }
            },

            "[extensibleFramework] [tabName=HDR] [name=udfchar50]": {
                customonblur: function () {
                    var vFormPanel = getFormPanel();
                    if (!vFormPanel) return;

                    var code = vFormPanel.getFldValue("udfchar50");
                    var trimmedCode = (code || "").trim();

                    if (!trimmedCode) {
                        vFormPanel.setFldValue("udfchar51", "", true);
                        updateUdf03State(vFormPanel);
                        return;
                    }

                    var desc = fetchUDF50DescriptionFromLOV(trimmedCode);
                    if (!desc) {
                        desc = trimmedCode;
                    }

                    vFormPanel.setFldValue("udfchar51", desc, true);

                    updateUdf03State(vFormPanel);
                }
            },

            "[extensibleFramework] [tabName=HDR] checkbox[name=udfchkbox03]": {
                change: function () {
                    updateUdf03State(getFormPanel());
                }
            },


            '[extensibleFramework] [tabName=HDR] uxcombobox[name=assetstatus]': {
                select: function (field) {
                    var vFormPanel = getFormPanel();
                    if (!vFormPanel) return;

                    var assetStatusCode = field.getValue();
                    var statusToAllowEdit = "I";

                    var shouldProtect = (assetStatusCode || "").toUpperCase() !== statusToAllowEdit;

                    setProtectedState(shouldProtect, vFormPanel);


                }
            }
        };
    }
});