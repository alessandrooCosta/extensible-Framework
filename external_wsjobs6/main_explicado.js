/*
    Atualiza o campo DATETIMECREATED com o valor de UDFDATE10 após salvar o registro,
    caso UDFDATE10 esteja preenchido e diferente do valor atual de DATETIMECREATED.
*/

Ext.define("EAM.custom.external_wsjobs", {
    extend: "EAM.custom.AbstractExtensibleFramework",

    getSelectors: function () {

        return {
            '[extensibleFramework] [tabName=HDR]': {
                aftersaverecord: function () {

                    // Obtém os campos de data a partir do componente da interface
                    var udfField = Ext.ComponentQuery.query("datefield[name=udfdate10]")[0];
                    var createdField = Ext.ComponentQuery.query("datefield[name=datetimecreated]")[0]; // ajuste o name se for outro

                    // Verifica se os campos existem; se não, sai da função
                    if (!udfField || !createdField) {
                        return;
                    }

                    // Obtém os valores dos campos
                    var udfRaw = udfField.getValue();
                    var createdRaw = createdField.getValue();

                    // Função para normalizar a data
                    var normalizeDate = function (val) {
                        if (!val) return null;

                        if (Ext.isDate(val)) {
                            return val; // Retorna se já for um objeto de data
                        }

                        if (Ext.isString(val)) {
                            var parsed = Ext.Date.parse(val, "d-m-Y H:i"); // Tenta fazer o parse da string
                            if (parsed) {
                                return parsed; // Retorna a data parseada
                            }
                        }

                        return null; // Retorna null se não for uma data válida
                    };

                    // Normaliza os valores obtidos
                    var udfVal = normalizeDate(udfRaw);
                    var createdVal = normalizeDate(createdRaw);

                    // Se o valor normalizado de udfVal for nulo, sai da função
                    if (!udfVal) {
                        return;
                    }

                    // Compara data e hora
                    var sameDateTime = createdVal &&
                        Ext.Date.format(udfVal, "d-m-Y H:i") === Ext.Date.format(createdVal, "d-m-Y H:i");

                    // Se as datas forem iguais, sai da função
                    if (sameDateTime) {
                        return;
                    }

                    // Verifica se o campo de criação está como somente leitura
                    var wasReadOnly = !!createdField.readOnly;

                    // Se estava como somente leitura, habilita a edição
                    if (wasReadOnly) {
                        createdField.setReadOnly(false);
                    }

                    // Define o valor do campo de criação como o valor normalizado de udfVal
                    createdField.setValue(udfVal);

                    // Se estava como somente leitura, volta a definir como somente leitura
                    if (wasReadOnly) {
                        createdField.setReadOnly(true);
                    }

                    // Exibe uma mensagem informativa sobre a atualização da data
                    if (window.EAM && EAM.Utils && EAM.Utils.info) {
                        EAM.Utils.info("Data de criação atualizada para " +
                            (createdVal ? Ext.Date.format(createdVal, "d/m/Y H:i") : "nulo") +
                            " com base em UDFDATE10.");
                    }               
                }
            }
        };
    }
});