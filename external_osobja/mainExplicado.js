/*
Sincronizar UDFCHAR50 e UDFCHAR51: Quando o valor do campo UDFCHAR50 (um código) muda, 
ele busca a descrição correspondente em uma Lista de Valores (LOV - List of Values) do EAM através de uma requisição AJAX e preenche o campo UDFCHAR51 com essa descrição.

Regra de Habilitação de Campos:

Se o valor de UDFCHAR50 for exatamente "02", ele habilita o campo Checkbox UDFCHKBOX03. 
Caso contrário, ele o protege (desabilita) e o limpa.

O estado do Checkbox UDFCHKBOX03 (marcado/desmarcado) controla a habilitação/proteção do campo de Data UDFDATE03. Se o checkbox for marcado, a data é habilitada; se for desmarcado, a data é protegida e limpa.
*/

Ext.define("EAM.custom.external_osobja", { // Define uma nova classe Ext JS (Ext.define) para customização do EAM.
    extend: "EAM.custom.AbstractExtensibleFramework", // Estende a classe base para frameworks de extensibilidade do EAM.

    getSelectors: function () { // Método obrigatório que retorna um objeto contendo os "hooks" (seletores de componentes e eventos) para o EAM.

        const EWS_URL = "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector"; // Constante para a URL do EWS Connector (Web Service).
        const API_KEY = "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36"; // Constante para a chave da API (API KEY).
        const TENANT = "IBNQI1720580460_DEM"; // Constante para o nome do Tenant.
        const ORGANIZATION = "IBNQ"; // Constante para o nome da Organização.
        const ORG_CODE = "C001"; // Constante para o código da Organização.
        const EAM_FIELDS_NS = "http://schemas.datastream.net/MP_fields"; // Namespace de campos do EAM (usado em requisições de serviço).
        const EAM_HEADERS_NS = "http://schemas.datastream.net/headers"; // Namespace de cabeçalhos do EAM (usado em requisições de serviço).

        function getFormPanel() { // Função utilitária para obter o painel de formulário da aba atual.
            return EAM.Utils.getCurrentTab().getFormPanel();
        }

        function getFields(fp) { // Função utilitária para obter os campos e botões do formulário.
            return fp && fp.getForm && fp.getForm().getFieldsAndButtons();
        }
        
        function setUdf03CheckboxState(enableCheckbox, fp) { // Função para habilitar/proteger o checkbox UDF03.
            fp = fp || getFormPanel(); // Obtém o painel de formulário se não for passado.
            var fields = getFields(fp); // Obtém a lista de campos.
            if (!fields) return; // Sai se não houver campos.

            var newState = enableCheckbox ? "optional" : "protected"; // Define o novo estado: "optional" (habilitado) ou "protected" (desabilitado).
            var action = { // Objeto de ação para definir o estado do campo.
                udfchkbox03: newState // O campo udfchkbox03 receberá o novo estado.
            };
            
            EAM.Builder.setFieldState(action, fields); // Aplica a mudança de estado no campo.
            console.log("[UDF03] Checkbox 03 definido como: " + newState); // Loga a mudança de estado no console.

            if (!enableCheckbox) { // Se o checkbox estiver sendo desabilitado/protegido.
                fp.setFldValue("udfchkbox03", false, false); // Define o valor do checkbox para 'false' (desmarcado).
                setUdf03DateState(false, fp); // Chama a função para também proteger/desabilitar o campo de data UDF03.
            }
        }
        
        function setUdf03DateState(enableDate, fp) { // Função para habilitar/proteger o campo de data UDF03.
            fp = fp || getFormPanel(); // Obtém o painel de formulário se não for passado.
            var fields = getFields(fp); // Obtém a lista de campos.
            if (!fields) return; // Sai se não houver campos.

            var newState = enableDate ? "optional" : "protected"; // Define o novo estado: "optional" (habilitado) ou "protected" (desabilitado).
            var action = { // Objeto de ação para definir o estado do campo.
                udfdate03: newState // O campo udfdate03 receberá o novo estado.
            };

            EAM.Builder.setFieldState(action, fields); // Aplica a mudança de estado no campo.
            console.log("[UDF03] Data 03 definida como: " + newState); // Loga a mudança de estado no console.
            
            if (!enableDate) { // Se o campo de data estiver sendo desabilitado/protegido.
                fp.setFldValue("udfdate03", "", false); // Limpa o valor do campo de data.
            }
        }

        function checkUDF51Value(value) { // Função que parece incompleta ou reservada para lógica futura (chamada, mas não faz nada útil no código atual).
            if (String(value).trim() === "02") {
                // Lógica de validação/ação para UDFCHAR51
            }
        }

        var descCache = {}; // Objeto de cache para armazenar descrições de UDF50 já buscadas (evitar múltiplas requisições).

        function fetchUDF50DescriptionFromLOV(code) { // Função principal para buscar a descrição de um código UDF50 via AJAX.
            if (!code) return ""; // Sai se o código estiver vazio ou nulo.
            code = String(code).trim(); // Converte para string e remove espaços em branco.
            if (!code) return ""; // Sai se for uma string vazia após o trim.

            var cacheKey = code; // Define a chave do cache.
            if (descCache[cacheKey]) { // Verifica se a descrição já está no cache.
                return descCache[cacheKey]; // Retorna a descrição do cache se encontrada.
            }
            // Provelmente estas informações precisam ser ajustadas conforme a tela / configuração
            try {
                var resp = EAM.Ajax.request({ // Inicia uma requisição AJAX síncrona usando a API do EAM.
                    url: "/web/base/LOVPOP", // URL do endpoint para buscar dados de Listas de Valores (LOV).
                    method: "POST", // Método da requisição.
                    params: { // Parâmetros da requisição para buscar dados do LOV.
                        popup: true, // Indica que é um popup (contexto de LOV).
                        GRID_NAME: "LVUDFCD", // Nome da grid (tabela) que contém os UDF Codes.
                        GRID_TYPE: "LOV", // Tipo da grid.
                        REQUEST_TYPE: "LOV.HEAD_DATA.STORED", // Tipo de requisição de dados.
                        LOV_TAGNAME: "udfchar50", // O nome do campo UDF sendo buscado.
                        usagetype: "lov", // Tipo de uso.
                        USER_FUNCTION_NAME: "OSOBJA",  // O nome da tela (função de usuário) de onde a busca está sendo feita.
                        CURRENT_TAB_NAME: "HDR", // O nome da aba atual.

                        LOV_ALIAS_NAME_1: "param.rentity", // Parâmetro 1: Entidade de referência (OBJ = Objeto/Ativo).
                        LOV_ALIAS_VALUE_1: "OBJ",
                        LOV_ALIAS_TYPE_1: "text",

                        LOV_ALIAS_NAME_2: "param.field", // Parâmetro 2: O nome do campo (udfchar50).
                        LOV_ALIAS_VALUE_2: "udfchar50",
                        LOV_ALIAS_TYPE_2: "text",

                        LOV_ALIAS_NAME_3: "param.fieldid", // Parâmetro 3: ID do campo (udfchar50).
                        LOV_ALIAS_VALUE_3: "udfchar50",
                        LOV_ALIAS_TYPE_3: "text",

                        LOV_ALIAS_NAME_4: "param.associatedrentity", // Parâmetro 4: Entidade associada (OBJ).
                        LOV_ALIAS_VALUE_4: "OBJ",
                        LOV_ALIAS_TYPE_4: "text",

                        filterfields: "userdefinedfieldvalue", // Campo para aplicar o filtro.
                        filteroperator: "=", // Operador de filtro (igual a).
                        filtervalue: code, // O valor do código UDF50 a ser buscado.

                        eamid: "4ad22f92-d098-4413-9473-f284878ff1d1", // ID da sessão (eamid).
                        tenant: "ASSET_EAM01" // Tenant usado na requisição (pode ser diferente do TENANT constante).
                    }
                });

                var rows = (((resp || {}).responseData || {}).pageData || {}).grid; // Navega no objeto de resposta para obter os dados da grid.
                rows = (((rows || {}).GRIDRESULT || {}).GRID || {}).DATA || []; // Continua a navegação para obter a lista de registros (linhas).

                if (rows.length > 0) { // Se um ou mais registros foram retornados.
                    var r = rows[0]; // Pega o primeiro registro.
                    var desc = r.description || r.userdefinedfieldvalue || ""; // Tenta obter a descrição ou o próprio valor UDF.
                    if (desc) { // Se a descrição foi encontrada.
                        desc = String(desc).trim(); // Limpa espaços em branco.
                        descCache[cacheKey] = desc; // Armazena no cache.
                        return desc; // Retorna a descrição.
                    }
                }
            } catch (e) {
                console.error("Erro na requisição do campo UDF50.", e); // Loga qualquer erro na requisição.
            }

            return ""; // Retorna string vazia se nada for encontrado ou ocorrer erro.
        }

        function hookUDF50Lookup(vFormPanel) { // Função para interceptar (hook) a lógica de preenchimento do campo UDF50.
            var fldCode = vFormPanel.getFld("udfchar50"); // Obtém a referência do campo UDFCHAR50.
            var fldDesc = vFormPanel.getFld("udfchar51"); // Obtém a referência do campo UDFCHAR51.
            if (!fldCode || !fldDesc) return; // Sai se os campos não existirem.

            if (fldCode._UDF50_hooked) return; // Evita aplicar o hook mais de uma vez.
            fldCode._UDF50_hooked = true; // Marca o campo como "hooked".

            var originalSetValue = fldCode.setValue; // Armazena a função original 'setValue'.

            fldCode.setValue = function (v) { // Sobrescreve a função 'setValue' do campo UDFCHAR50.
                originalSetValue.apply(this, arguments); // Chama a função 'setValue' original para definir o valor.

                Ext.defer(function () { // Executa a lógica customizada após um pequeno atraso (para dar tempo do ExtJS processar).
                    var code = fldCode.getValue(); // Pega o novo valor do campo UDFCHAR50.
                    var trimmedCode = (code || "").trim(); // Limpa espaços em branco.

                    if (trimmedCode === "02") { // Lógica de habilitação do checkbox UDF03.
                        setUdf03CheckboxState(true, vFormPanel); // Habilita o checkbox se o código for "02".
                    } else {
                        setUdf03CheckboxState(false, vFormPanel); // Protege/desabilita o checkbox caso contrário.
                    }

                    if (!trimmedCode) { // Se o campo estiver vazio.
                        vFormPanel.setFldValue("udfchar51", "", false); // Limpa o UDFCHAR51.
                        return; // Sai da função.
                    }

                    var desc = fetchUDF50DescriptionFromLOV(trimmedCode); // Busca a descrição no LOV.
                    if (!desc) { // Se não encontrar a descrição.
                        desc = trimmedCode; // Usa o próprio código como fallback para a descrição.
                    }

                    vFormPanel.setFldValue("udfchar51", desc, false); // Define o valor do UDFCHAR51 (descrição).
                    checkUDF51Value(desc); // Chama a função (incompleta/reservada) para checar o UDF51.
                }, 80); // Atraso de 80ms.
            };
        }

        return { // O objeto de retorno do getSelectors, contendo os hooks de eventos.
            // Ativa hook do UDF50 assim que a HDR(tela) renderiza
            "[extensibleFramework] [tabName=HDR]": { // Selector para a aba HDR do framework de extensibilidade.
                afterrender: function () { // Evento: após a renderização da aba.
                    var vFormPanel = getFormPanel(); // Obtém o painel de formulário.
                    if (vFormPanel) {
                        hookUDF50Lookup(vFormPanel); // Aplica a interceptação do UDF50 no 'setValue'.
                    }
                }
            },

            // UDFCHAR50 → UDFCHAR51 + regra do checkbox/data
            "[extensibleFramework] [tabName=HDR] [name=udfchar50]": { // Selector para o campo UDFCHAR50 na aba HDR.
                customonblur: function () { // Evento: quando o campo perde o foco.
                    var vFormPanel = getFormPanel(); // Obtém o painel de formulário.
                    if (!vFormPanel) return; // Sai se não houver formulário.

                    var code = vFormPanel.getFldValue("udfchar50"); // Obtém o valor do UDFCHAR50.
                    var trimmedCode = (code || "").trim(); // Limpa espaços em branco.

                    if (trimmedCode === "02") { // Lógica de habilitação do checkbox UDF03.
                        setUdf03CheckboxState(true, vFormPanel); // Habilita se for "02".
                    } else {
                        setUdf03CheckboxState(false, vFormPanel); // Protege/desabilita caso contrário.
                    }

                    if (!trimmedCode) { // Se o campo estiver vazio.
                        vFormPanel.setFldValue("udfchar51", "", true); // Limpa o UDFCHAR51 (o 'true' provavelmente força o evento de alteração).
                        return;
                    }

                    var desc = fetchUDF50DescriptionFromLOV(trimmedCode); // Busca a descrição no LOV.
                    if (!desc) {
                        desc = trimmedCode; // Fallback para o código se a descrição não for encontrada.
                    }

                    vFormPanel.setFldValue("udfchar51", desc, true); // Define o valor do UDFCHAR51.
                    checkUDF51Value(desc); // Chama a função (incompleta/reservada) para checar o UDF51.
                }
            },

            // Checkbox → libera/bloqueia a data
            "[extensibleFramework] [tabName=HDR] checkbox[name=udfchkbox03]": { // Selector para o checkbox UDF03 na aba HDR.
                change: function (field, newValue) { // Evento: quando o valor do checkbox é alterado.
                    setUdf03DateState(newValue, getFormPanel()); // Chama a função para habilitar/proteger a data, usando o novo valor do checkbox.
                }
            },

        };
    }
});