// Define uma classe ExtJS no namespace do EAM para o seu script customizado
Ext.define('EAM.custom.external_wsjobs', {
    // Diz que herda do framework extensível do EAM
    extend: 'EAM.custom.AbstractExtensibleFramework',

    // Ponto de entrada: retorna o “mapa” de seletores/eventos que o EAM vai escutar
    getSelectors: function () {

        // --- Regras de habilitação/obrigatoriedade dos campos, dependendo de org e novo/antigo registro
        function applyFieldRulesIfOrgSelected() {
            // Obtém o painel do formulário da aba atual
            var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
            // Se não tiver formulário, não faz nada
            if (!vFormPanel) return;
        
            // Lê o valor da organização no cabeçalho (HDR)
            var orgValue = vFormPanel.getFldValue('organization');
            // Normaliza para string (evita null/undefined) e tira espaços
            var orgStr = (orgValue == null) ? '' : String(orgValue).trim();
            // Se organização estiver vazia, não aplica regras ainda
            if (orgStr === '') return;
        
            // Detecta se o registro é novo ou existente usando o campo recordid (vazio = novo)
            var recordIdVal = vFormPanel.getFldValue('recordid');
            var isNew = (recordIdVal == null || String(recordIdVal).trim() === '');
        
            // Objeto com o estado dos campos que vamos aplicar via EAM.Builder
            var vFieldsObj = {};
        
            if (isNew) {
                // Regras para NOVO registro
                vFieldsObj = {
                    "description": "optional",        // descrição opcional ao criar
                    "udfnote01": "optional",          // nota opcional ao criar
                    "servicecategory": "required",    // categoria obrigatória ao criar
                    "serviceproblemcode": "required"  // código de serviço obrigatório ao criar
                };
            } else {
                // Regras para REGISTRO EXISTENTE
                vFieldsObj = {
                    "description": "optional",        // continua opcional
                    "udfnote01": "protected",         // 🔒 proteger nota após salvo
                    "servicecategory": "optional",    // não exigir após salvo
                    "serviceproblemcode": "optional"  // não exigir após salvo
                };
            }
        
            try {
                // Pega todos os campos/botões do formulário
                var fieldsAndButtons = vFormPanel.getForm().getFieldsAndButtons();
                // Aplica os estados definidos (required/optional/protected etc.)
                EAM.Builder.setFieldState(vFieldsObj, fieldsAndButtons);
            } catch (error) {
                // Loga caso algo dê errado ao aplicar regras
                console.error('[WSJOBS] Erro ao aplicar regras:', error);
            }
        }
        
        // --- Debounce: evita reaplicar regras em excesso durante digitação/múltiplos eventos
        var debounceTimer;
        function debounceApply() {
            // Cancela um timer anterior (se existir)
            clearTimeout(debounceTimer);
            // Agenda a aplicação das regras para 150ms depois do último evento
            debounceTimer = setTimeout(applyFieldRulesIfOrgSelected, 150);
        }

        // --- Cache em memória para descrições por (org|code) para ficar rápido ao repetir códigos
        var descCache = {};

        // --- Busca a descrição do código de serviço consultando a LOV (LVCCSERVICECODES)
        function fetchServiceDescriptionFromLOV(org, code) {
            // Chave do cache = organização + código
            var cacheKey = org + '|' + code;
            // Se já consultou antes, retorna do cache
            if (descCache[cacheKey]) return descCache[cacheKey];

            try {
                // Requisição síncrona via EAM.Ajax (no EAM isso retorna objeto, não é o Ext.Ajax assíncrono)
                var resp = EAM.Ajax.request({
                    url: '/web/base/LOVPOP',              // endpoint de LOV
                    method: 'POST',
                    params: {
                        popup: true,                      // indica contexto de LOV
                        GRID_NAME: 'LVCCSERVICECODES',    // nome da LOV (dataspy/lista)
                        GRID_TYPE: 'LOV',
                        REQUEST_TYPE: 'LOV.HEAD_DATA.STORED',
                        LOV_TAGNAME: 'serviceproblemcode',
                        usagetype: 'lov',
                        USER_FUNCTION_NAME: 'WSJOBS',     // função atual (para contexto)
                        CURRENT_TAB_NAME: 'HDR',          // tab atual (cabeçalho)
                        // Passa a organização para filtrar (alias mapeado na LOV)
                        LOV_ALIAS_NAME_6: 'control.org',
                        LOV_ALIAS_VALUE_6: org,
                        LOV_ALIAS_TYPE_6: 'text',
                        // Filtro: problemcode = code
                        filterfields: 'problemcode',
                        filteroperator: '=',
                        filtervalue: code,
                        // Identificadores do seu tenant/ambiente
                        eamid: '81f4c322-1529-4d8d-b8bc-9b6a1770135c',   // TOKEN
                        tenant: 'IBNQI1720580460_DEM'                    // TENANT
                    }
                });

                // Navega na estrutura da resposta até o array de linhas
                var rows = (((resp || {}).responseData || {}).pageData || {}).grid;
                rows = (((rows || {}).GRIDRESULT || {}).GRID || {}).DATA || [];

                if (rows.length > 0) {
                    // Pega a primeira linha
                    var r = rows[0];
                    // Tenta os campos de descrição que costumam aparecer na LOV
                    var desc = r.description || r.problemcodedesc || r.PROBLEMCODEDESC || r.problemcode;
                    if (desc) {
                        // Normaliza e salva no cache
                        desc = String(desc).trim();
                        descCache[cacheKey] = desc;
                        return desc;
                    }
                } else {
                    // (Opcional) Sem linhas: não faz nada especial aqui
                }
            } catch (e) {
                // Se a requisição da LOV falhar, loga o erro e segue adiante
                console.error('[WSJOBS] Erro na requisição LOV LVCCSERVICECODES:', e);
            }

            // Se não achou nada, retorna string vazia
            return '';
        }

        // Flag para evitar reentrância (o mesmo fluxo ser chamado em cascata)
        var _fillingDesc = false;

        // --- Preenche o campo description com base no código de serviço selecionado
        function fillDescriptionFromServiceCode(field) {
            // Evita concorrência/reentrância
            if (_fillingDesc) return;
            _fillingDesc = true;

            try {
                // Painel do formulário
                var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                if (!vFormPanel) return;

                // Lê org e código do formulário
                var orgVal = vFormPanel.getFldValue('organization');
                var codeVal = vFormPanel.getFldValue('serviceproblemcode');
                var org = (orgVal == null) ? '' : String(orgVal).trim();
                var code = (codeVal == null) ? '' : String(codeVal).trim();
                // Sem org ou código, não tenta preencher
                if (!org || !code) return;

                // Componente (campo) do código de serviço (para pegar display/raw)
                var cmp = vFormPanel.getFld('serviceproblemcode');
                if (!cmp) return;

                try {
                    // Primeiro tenta obter a descrição diretamente do “display” da LOV
                    var displayTxt = (typeof cmp.getDisplayValue === 'function') ? cmp.getDisplayValue() : cmp.getRawValue();
                    if (displayTxt && typeof displayTxt === 'string') {
                        // Padrão comum: "CODIGO - DESCRICAO"
                        if (displayTxt.indexOf(' - ') > -1) {
                            var parts = displayTxt.split(' - ');
                            // Junta tudo após o primeiro " - " como descrição
                            var descFromDisplay = parts.slice(1).join(' - ').trim();
                            if (descFromDisplay) {
                                // Escreve no campo description e reaplica regras
                                vFormPanel.setFldValue('description', descFromDisplay, true);
                                applyFieldRulesIfOrgSelected();
                                return;
                            }
                        }
                        // Se o display não é igual ao código (ex.: mostra um label legível), usa como descrição
                        if (displayTxt.trim() && displayTxt.trim().toUpperCase() !== code.toUpperCase()) {
                            vFormPanel.setFldValue('description', displayTxt.trim(), true);
                            applyFieldRulesIfOrgSelected();
                            return;
                        }
                    }
                } catch (eDisp) {
                    // Se não conseguiu ler o display, apenas loga e continua para LOV via backend
                    console.warn('[WSJOBS] Falha ao extrair descrição do display da LOV', eDisp);
                }

                // Se o display não ajudou, consulta a LOV programaticamente (LVCCSERVICECODES)
                var lovDesc = fetchServiceDescriptionFromLOV(org, code);
                if (lovDesc) {
                    // Preenche com a descrição obtida da LOV
                    vFormPanel.setFldValue('description', lovDesc, true);
                    applyFieldRulesIfOrgSelected();
                    return;
                }

                // Último recurso: não deixar vazio — usa o valor “cru” do campo
                if (cmp && typeof cmp.getRawValue === 'function') {
                    var onlyRaw = cmp.getRawValue();
                    if (onlyRaw && String(onlyRaw).trim()) {
                        vFormPanel.setFldValue('description', String(onlyRaw).trim(), true);
                        applyFieldRulesIfOrgSelected();
                        return;
                    }
                }

            } catch (fatal) {
                // Qualquer falha não prevista no fluxo de preenchimento
                console.error('[WSJOBS] Erro fatal ao preencher descrição:', fatal);
            } finally {
                // Libera o “lock” de execução
                _fillingDesc = false;
            }
        }

        // --- Mapa de eventos/seletores que o framework do EAM vai “escutar”
        return {
            // Quando organização perde o foco ou muda, aplica as regras (novo x existente)
            '[extensibleFramework] [tabName=HDR] [name=organization]': {
                customonblur: function () { applyFieldRulesIfOrgSelected(); },
                change: function () { applyFieldRulesIfOrgSelected(); }
            },

            // Em qualquer campo da aba HDR, reaplica com debounce (evita flicker e excesso)
            '[extensibleFramework] [tabName=HDR] [isFormField]': {
                customonblur: function () { debounceApply(); },
                change: function () { debounceApply(); }
            },

            // No campo LOV do código de serviço: ao selecionar/mudar/sair, tenta preencher a descrição
            '[extensibleFramework] [tabName=HDR] lovfield[name=serviceproblemcode]': {
                select: function (field) { fillDescriptionFromServiceCode(field); },
                change: function (field) { fillDescriptionFromServiceCode(field); },
                customonblur: function (field) { fillDescriptionFromServiceCode(field); }
            }
        };
    }
});
