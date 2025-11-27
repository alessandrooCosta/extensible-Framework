Ext.define("EAM.custom.external_wsjobs", {
    extend: "EAM.custom.AbstractExtensibleFramework",

    getSelectors: function () {

        return {
            '[extensibleFramework] [tabName=HDR]': {
                aftersaverecord: function () {

                    var udfField = Ext.ComponentQuery.query("datefield[name=udfdate10]")[0];
                    var createdField = Ext.ComponentQuery.query("datefield[name=datetimecreated]")[0]; // ajuste o name se for outro

                    if (!udfField || !createdField) {
                        return;
                    }

                    var udfRaw = udfField.getValue();
                    var createdRaw = createdField.getValue();

                    var normalizeDate = function (val) {
                        if (!val) return null;

                        if (Ext.isDate(val)) {
                            return val;
                        }

                        if (Ext.isString(val)) {
                            var parsed = Ext.Date.parse(val, "d-m-Y H:i");
                            if (parsed) {
                                return parsed;
                            }
                        }

                        return null;
                    };

                    var udfVal = normalizeDate(udfRaw);
                    var createdVal = normalizeDate(createdRaw);

                    if (!udfVal) {
                        return;
                    }

                    // compara data+hora
                    var sameDateTime = createdVal &&
                        Ext.Date.format(udfVal, "d-m-Y H:i") === Ext.Date.format(createdVal, "d-m-Y H:i");

                    if (sameDateTime) {
                        return;
                    }

                    // trata readOnly
                    var wasReadOnly = !!createdField.readOnly;

                    if (wasReadOnly) {
                        createdField.setReadOnly(false);
                    }

                    createdField.setValue(udfVal);

                    if (wasReadOnly) {
                        createdField.setReadOnly(true);
                    }

                    if (window.EAM && EAM.Utils && EAM.Utils.info) {
                        EAM.Utils.info("Data de criação atualizada para " +
                            (createdVal ? Ext.Date.format(createdVal, "d/m/Y H:i") : "nulo") +
                            " com base em UDFDATE10.");
                    }               


                }            }
        };
    }});
