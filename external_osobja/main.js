Ext.define("EAM.custom.external_osobja", {
    extend: "EAM.custom.AbstractExtensibleFramework",

    getSelectors: function () {
        // --- CONSTANTES CENTRALIZADAS ---
        const EWS_URL = "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector";
        const API_KEY = "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36";
        const TENANT = "IBNQI1720580460_DEM";
        const ORGANIZATION = "IBNQ";
        const ORG_CODE = "C001";
        const EAM_FIELDS_NS = "http://schemas.datastream.net/MP_fields";
        const EAM_HEADERS_NS = "http://schemas.datastream.net/headers";
        // ---------------------------------

        // --- FUNÇÃO AUXILIAR: VERIFICA E EXIBE MENSAGEM (NOVO) ---
        function checkUDF51Value(value) {
            // Verifica se o valor (código ou descrição) é exatamente '02'
            if (String(value).trim() === '02') {
                Ext.Msg.alert('Aviso', 'O valor preenchido no UDFCHAR51 é 02 e requer atenção especial.');
                console.warn('[ALERTA] UDFCHAR51 = 02: Mensagem disparada.');
                
            }
        }
        
        // --- FUNÇÕES DE UTILIADDE SOAP ---

        function buildEnvelope(orgValue = ORGANIZATION) {
            var xmlDoc = document.implementation.createDocument("", "", null);
            var env = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
            env.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
            env.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");

            var header = xmlDoc.createElement("soapenv:Header");
            var tenantElem = xmlDoc.createElementNS(EAM_HEADERS_NS, "Tenant");
            tenantElem.textContent = TENANT;
            header.appendChild(tenantElem);
            var orgElem = xmlDoc.createElementNS(EAM_HEADERS_NS, "Organization");
            orgElem.textContent = orgValue;
            header.appendChild(orgElem);
            env.appendChild(header);

            var body = xmlDoc.createElement("soapenv:Body");
            env.appendChild(body);
            xmlDoc.appendChild(env);
            return { xmlDoc: xmlDoc, body: body };
        }

        function parseFaultInfo(text) {
            try {
                var xml = (new DOMParser()).parseFromString(text, "text/xml");
                var faults = xml.getElementsByTagName("Fault");
                if (faults && faults.length) {
                    var fs = faults[0].getElementsByTagName("faultstring");
                    return fs && fs.length ? (fs[0].textContent || "").trim() : "SOAP Fault";
                }
            } catch (e) { }
            return "";
        }

        function parseFirstChildText(nsXml, containerTag, wantedChild) {
            var nodes = nsXml.getElementsByTagNameNS(EAM_FIELDS_NS, containerTag);
            if (!nodes || !nodes.length) return "";
            var kids = nodes[0].childNodes || [];
            for (var i = 0; i < kids.length; i++) {
                if (kids[i].localName === wantedChild) {
                    return (kids[i].textContent || "").trim();
                }
            }
            return "";
        }

        function callSOAP(xmlData, soapAction, parseFn, onCannotFind, onHardError) {
            return Ext.Ajax.request({
                url: EWS_URL,
                method: "POST",
                withCredentials: true,
                headers: {
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": soapAction,
                    "x-api-key": API_KEY
                },
                xmlData: xmlData,
                success: function (resp) {
                    var txt = resp.responseText || "";
                    try {
                        var desc = parseFn(txt);
                        if (desc) { finishWithDesc(desc); return; }
                    } catch (e) {
                        console.warn("Parse exception:", e);
                    }

                    var fault = parseFaultInfo(txt);
                    if (fault) {
                        if (/cannot\s+find|não\s+(localizar|encontrar)/i.test(fault)) {
                            onCannotFind();
                        } else {
                            Ext.Msg.alert("Erro SOAP", fault);
                            if (onHardError) onHardError(fault);
                        }
                    } else {
                        onCannotFind();
                    }
                },
                failure: function (resp) {
                    var txt = (resp.responseText || "").toString();
                    var fault = parseFaultInfo(txt);
                    if (fault) {
                        if (/cannot\s+find|não\s+(localizar|encontrar)/i.test(fault)) {
                            onCannotFind();
                        } else {
                            Ext.Msg.alert("Erro de Conexão", fault);
                            if (onHardError) onHardError(fault);
                        }
                    } else {
                        onCannotFind();
                    }
                }
            });
        }
        // ---------------------------------

        // --- FUNÇÕES DE PARSE (DESCRIÇÃO) ---

        function parseAssetDesc(text) {
            var xml = (new DOMParser()).parseFromString(text, "text/xml");
            return parseFirstChildText(xml, "ASSETID", "DESCRIPTION");
        }
        function parseLocationDesc(text) {
            var xml = (new DOMParser()).parseFromString(text, "text/xml");
            return parseFirstChildText(xml, "LOCATIONID", "DESCRIPTION");
        }
        function parseSystemDesc(text) {
            var xml = (new DOMParser()).parseFromString(text, "text/xml");
            return parseFirstChildText(xml, "SYSTEMID", "DESCRIPTION");
        }

        // --- LÓGICA DE BUSCA DE EQUIPAMENTO/LOCALIZAÇÃO/SISTEMA ---

        function buildAssetRequest(code) {
            var b = buildEnvelope(ORGANIZATION);
            var mp = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0302_001", "MP0302_GetAssetEquipment_001");
            mp.setAttribute("verb", "Get"); mp.setAttribute("noun", "AssetEquipment"); mp.setAttribute("version", "001");

            var id = b.xmlDoc.createElementNS(EAM_FIELDS_NS, "ASSETID");
            var oid = b.xmlDoc.createElement("ORGANIZATIONID");
            var oc = b.xmlDoc.createElement("ORGANIZATIONCODE");
            oc.textContent = ORG_CODE;
            oid.appendChild(oc);
            id.appendChild(oid);

            var eq = b.xmlDoc.createElement("EQUIPMENTCODE");
            eq.textContent = code.trim();
            id.appendChild(eq);

            mp.appendChild(id);
            b.body.appendChild(mp);
            return new XMLSerializer().serializeToString(b.xmlDoc);
        }

        function buildLocationRequest(code) {
            var b = buildEnvelope(ORGANIZATION);
            var mp = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0318_001", "MP0318_GetLocation_001");
            mp.setAttribute("verb", "Get"); mp.setAttribute("noun", "Location"); mp.setAttribute("version", "001");

            var id = b.xmlDoc.createElementNS(EAM_FIELDS_NS, "LOCATIONID");
            var oid = b.xmlDoc.createElement("ORGANIZATIONID");
            var oc = b.xmlDoc.createElement("ORGANIZATIONCODE");
            oc.textContent = ORG_CODE;
            oid.appendChild(oc);
            id.appendChild(oid);

            var lc = b.xmlDoc.createElement("LOCATIONCODE");
            lc.textContent = code.trim();
            id.appendChild(lc);

            mp.appendChild(id);
            b.body.appendChild(mp);
            return new XMLSerializer().serializeToString(b.xmlDoc);
        }

        function buildSystemRequests(code) {
            var reqs = [];
            const systemOrg = ORG_CODE;

            function makeReq(includeOrg, orgValue) {
                var b = buildEnvelope(ORGANIZATION);
                var mp = b.xmlDoc.createElementNS(
                    "http://schemas.datastream.net/MP_functions/MP0312_001",
                    "MP0312_GetSystemEquipment_001"
                );
                mp.setAttribute("verb", "Get");
                mp.setAttribute("version", "001");

                var sid = b.xmlDoc.createElementNS(EAM_FIELDS_NS, "SYSTEMID");

                if (includeOrg) {
                    var oid = b.xmlDoc.createElement("ORGANIZATIONID");
                    var oc = b.xmlDoc.createElement("ORGANIZATIONCODE");
                    oc.textContent = orgValue;
                    oid.appendChild(oc);
                    sid.appendChild(oid);
                }

                var eq = b.xmlDoc.createElement("EQUIPMENTCODE");
                eq.textContent = code.trim();
                sid.appendChild(eq);

                mp.appendChild(sid);
                b.body.appendChild(mp);
                return new XMLSerializer().serializeToString(b.xmlDoc);
            }

            reqs.push(makeReq(true, systemOrg));
            reqs.push(makeReq(false, ""));

            return reqs;
        }

        function finishWithDesc(desc) {
            var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
            if (vFormPanel && desc) {
                // Preenche UDFCHAR51
                vFormPanel.setFldValue('udfchar51', desc, true);
                
                // *** CHAMA A VERIFICAÇÃO APÓS O PREENCHIMENTO ***
                checkUDF51Value(desc);
            }
        }
        
        function lookupSystem(vFormPanel, equipmentCode) {
            console.log("Tentando buscar como sistema:", equipmentCode.trim());
            var reqs = buildSystemRequests(equipmentCode);
            var i = 0;

            function nextSystem() {
                if (i >= reqs.length) {
                    console.log('Nenhuma descrição de Sistema encontrada. Fim da busca.');
                    return;
                }
                var xml = reqs[i++];
                callSOAP(
                    xml,
                    "http://schemas.datastream.net/MP_functions/MP0312_001/MP0312_GetSystemEquipment_001",
                    parseSystemDesc,
                    nextSystem
                );
            }
            nextSystem();
        }

        function lookupLocation(vFormPanel, equipmentCode) {
            console.log("Tentando buscar como localização:", equipmentCode.trim());
            callSOAP(
                buildLocationRequest(equipmentCode),
                "http://schemas.datastream.net/MP_functions/MP0318_001/MP0318_GetLocation_001",
                parseLocationDesc,
                () => lookupSystem(vFormPanel, equipmentCode)
            );
        }

        function lookupAsset(vFormPanel, equipmentCode) {
            console.log("Tentando buscar como equipamento:", equipmentCode.trim());
            callSOAP(
                buildAssetRequest(equipmentCode),
                "http://schemas.datastream.net/MP_functions/MP0302_001/MP0302_GetAssetEquipment_001",
                parseAssetDesc,
                () => lookupLocation(vFormPanel, equipmentCode)
            );
        }

        // --- LÓGICA DEPARTAMENTOS (UDFCHAR50 -> UDFCHAR51) ---

        function processDeptResponse(response, fallbackCode) {
            var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
            if (!vFormPanel) return;

            try {
                var parser = new DOMParser();
                var responseXml = parser.parseFromString(response.responseText, "text/xml");
                
                var descricaoElement = responseXml.getElementsByTagNameNS(EAM_FIELDS_NS, "DESCRIPTION");
                var desc = (descricaoElement.length > 0 && descricaoElement[0].textContent.trim() !== '') ? descricaoElement[0].textContent.trim() : fallbackCode;
                
                // Preenche UDFCHAR51
                vFormPanel.setFldValue('udfchar51', desc, true);
                
                // *** CHAMA A VERIFICAÇÃO APÓS O PREENCHIMENTO ***
                checkUDF51Value(desc);

            } catch (e) {
                console.error("Erro ao processar resposta SOAP (departamento):", e);
                // Preenche UDFCHAR51 com o código em caso de erro
                vFormPanel.setFldValue('udfchar51', fallbackCode, true);
                
                // *** CHAMA A VERIFICAÇÃO NO FALLBACK ***
                checkUDF51Value(fallbackCode);
            }
        }

        function buildDeptSoapRequest(departmentCode) {
            var b = buildEnvelope("*");
            var mpFunction = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0617_001", "MP0617_GetDepartment_001");
            mpFunction.setAttribute("verb", "Get");
            mpFunction.setAttribute("noun", "Department");
            mpFunction.setAttribute("version", "001");

            var deptID = b.xmlDoc.createElementNS(EAM_FIELDS_NS, "DEPARTMENTID");
            var orgID = b.xmlDoc.createElement("ORGANIZATIONID");
            var orgCode = b.xmlDoc.createElement("ORGANIZATIONCODE");
            orgCode.textContent = "*";
            orgID.appendChild(orgCode);
            deptID.appendChild(orgID);

            var deptCodeElement = b.xmlDoc.createElement("DEPARTMENTCODE");
            deptCodeElement.textContent = departmentCode.trim();
            deptID.appendChild(deptCodeElement);

            mpFunction.appendChild(deptID);
            b.body.appendChild(mpFunction);
            return new XMLSerializer().serializeToString(b.xmlDoc);
        }

        // --- LÓGICA DE TRADUÇÃO/DESCRIÇÃO DE CÓDIGOS DE USUÁRIO (UDFCHAR03, 04, 10) ---

        function buildTranslationRequest(code, orgValue = "*") {
            var b = buildEnvelope(orgValue);
            
            var mpFunction = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0674_001", "MP0674_GetDescription_001");
            mpFunction.setAttribute("verb", "Get");
            mpFunction.setAttribute("noun", "Description");
            mpFunction.setAttribute("version", "001");

            var descriptionID = b.xmlDoc.createElementNS(EAM_FIELDS_NS, "DESCRIPTIONID");

            var entity = b.xmlDoc.createElement("ENTITY");
            entity.textContent = "UDLV";
            descriptionID.appendChild(entity);

            var descode = b.xmlDoc.createElement("DESCODE");
            descode.textContent = code;
            descriptionID.appendChild(descode);

            var orgID = b.xmlDoc.createElement("ORGANIZATIONID");
            orgID.setAttribute("entity", "User");
            var orgCode = b.xmlDoc.createElement("ORGANIZATIONCODE");
            orgCode.textContent = orgValue;
            orgID.appendChild(orgCode);
            descriptionID.appendChild(orgID);

            var langID = b.xmlDoc.createElement("LANGUAGEID");
            var langCode = b.xmlDoc.createElement("LANGUAGECODE");
            langCode.textContent = "PT";
            langID.appendChild(langCode);
            descriptionID.appendChild(langID);

            var type = b.xmlDoc.createElement("TYPE");
            type.setAttribute("entity", "User");
            var typeCode = b.xmlDoc.createElement("TYPECODE");
            typeCode.textContent = "COCT";
            type.appendChild(typeCode);
            descriptionID.appendChild(type);

            mpFunction.appendChild(descriptionID);
            b.body.appendChild(mpFunction);
            return new XMLSerializer().serializeToString(b.xmlDoc);
        }

        // --- SELECTORS (EVENTOS) ---

        return {

            // EQUIPAMENTIOS / LOCALIZAÇÕES / SISTEMAS (equipment -> udfchar51)
            '[extensibleFramework] [tabName=HDR] [name=equipment]': {
                customonblur: function (field) {
                    var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                    var equipmentCode = vFormPanel.getFldValue('equipment');
                    if (!equipmentCode || equipmentCode.trim() === '') return;

                    vFormPanel.setFldValue('udfchar51', '', true); 
                    lookupAsset(vFormPanel, equipmentCode);
                }
            },

            // DEPARTAMENTOS (udfchar50 -> udfchar51)
            '[extensibleFramework] [tabName=HDR] [name=udfchar50]': {
                customonblur: function () {
                    var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                    var deptCode = vFormPanel.getFldValue('udfchar50');
                    if (!deptCode || deptCode.trim() === '') return;

                    vFormPanel.setFldValue('udfchar51', '', true);

                    var soapRequest = buildDeptSoapRequest(deptCode);

                    Ext.Ajax.request({
                        url: EWS_URL,
                        method: "POST",
                        headers: {
                            "Content-Type": "text/xml; charset=utf-8",
                            "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0617_001/MP0617_GetDepartment_001",
                            "x-api-key": API_KEY
                        },
                        xmlData: soapRequest,
                        success: function (response) {
                            processDeptResponse(response, deptCode.trim());
                        },
                        failure: function () {
                            console.error("Falha ao consultar departamento.");
                            var fallbackCode = deptCode.trim();
                            vFormPanel.setFldValue('udfchar51', fallbackCode, true); 
                            checkUDF51Value(fallbackCode); // Verifica o fallback em caso de falha de comunicação
                        }
                    });

                }
            },

            // TRADUÇÃO DE CÓDIGOS DE USUÁRIO (udfchar03, 04, 10)
            '[extensibleFramework] [tabName=HDR] [name=udfchar03], [name=udfchar04], [name=udfchar10]': {
                customonblur: function () {
                    var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                    
                    var fields = [
                        { from: 'udfchar03', to: 'udfchar07' },
                        { from: 'udfchar04', to: 'udfchar08' },
                        { from: 'udfchar10', to: 'udfchar14' }
                    ];

                    fields.forEach(function (pair) {
                        var value = vFormPanel.getFldValue(pair.from);
                        if (!value || value.trim() === '') {
                            vFormPanel.setFldValue(pair.to, '', true);
                            return;
                        }

                        var formattedCode = pair.from + value.trim().toLowerCase(); 

                        var soapRequest = buildTranslationRequest(formattedCode);

                        Ext.Ajax.request({
                            url: EWS_URL,
                            method: "POST",
                            headers: {
                                "Content-Type": "text/xml; charset=utf-8",
                                "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0674_001/MP0674_GetDescription_001",
                                "x-api-key": API_KEY
                            },
                            xmlData: soapRequest,
                            success: function (response) {
                                try {
                                    var parser = new DOMParser();
                                    var responseXml = parser.parseFromString(response.responseText, "text/xml");

                                    var translatedElements = responseXml.getElementsByTagNameNS(EAM_FIELDS_NS, "TRANSLATEDTEXT");
                                    var translatedText = (translatedElements.length > 0) ? translatedElements[0].textContent : '';
                                    
                                    vFormPanel.setFldValue(pair.to, translatedText.trim(), true);
                                    
                                } catch (e) {
                                    console.error("Erro ao processar resposta SOAP (tradução):", e);
                                    vFormPanel.setFldValue(pair.to, '', true);
                                }
                            },
                            failure: function () {
                                console.error(`Falha ao consultar tradução para ${pair.from}.`);
                                vFormPanel.setFldValue(pair.to, '', true);
                            }
                        });
                    });
                }
            }
        };
    }
});