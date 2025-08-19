// Define uma nova classe ExtJS chamada "EAM.custom.external_cssrpt"
Ext.define("EAM.custom.external_cssrpt", {
    // Herda funcionalidades da classe AbstractExtensibleFramework do EAM
    extend: "EAM.custom.AbstractExtensibleFramework",
  
    // Função principal que retorna os seletores CSS e suas respectivas funções
    getSelectors: function () {
      return {
   
        // SEÇÃO 1: BUSCA DE EQUIPAMENTOS E LOCALIZAÇÕES
        // Seleciona o campo "equipment" na aba "HDR" do framework extensível
        '[extensibleFramework] [tabName=HDR] [name=equipment]': {
          // Define função que executa quando o campo perde o foco (onblur)
          customonblur: function () {
            // Obtém referência ao painel do formulário atual
            var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
            // Obtém o valor digitado no campo equipment
            var equipmentCode = vFormPanel.getFldValue('equipment');
            // Se não há valor ou está vazio, sai da função
            if (!equipmentCode || equipmentCode.trim() === '') return;
  
            // Configurações da conexão SOAP - dados do tenant/organização
            var tenant = "IBNQI1720580460_DEM"; // Identificador do tenant no sistema
            var organization = "IBNQI"; // Código da organização
            var orgCode = "C001"; // Código específico da organização
  
            // FUNÇÃO INTERNA: Constrói requisição SOAP para buscar equipamentos
            function tryAsEquipment(code) {
              // Cria um novo documento XML vazio
              var xmlDoc = document.implementation.createDocument("", "", null);
              // Cria o elemento raiz envelope com namespace SOAP
              var envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
              // Define atributos de schema XML necessários para SOAP
              envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
              envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
  
              // Cria seção de cabeçalho SOAP
              var header = xmlDoc.createElement("soapenv:Header");
  
              // Cria elemento tenant no cabeçalho com namespace específico
              var tenantElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Tenant");
              tenantElem.textContent = tenant; // Define o valor do tenant
              header.appendChild(tenantElem); // Adiciona tenant ao cabeçalho
  
              // Cria elemento organization no cabeçalho
              var orgElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Organization");
              orgElem.textContent = organization; // Define o valor da organização
              header.appendChild(orgElem); // Adiciona organização ao cabeçalho
  
              // Adiciona cabeçalho completo ao envelope
              envelope.appendChild(header);
  
              // Cria seção body (corpo) da requisição SOAP
              var body = xmlDoc.createElement("soapenv:Body");
              // Cria elemento da função MP específica para buscar equipamentos
              var mpFunction = xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0302_001", "MP0302_GetAssetEquipment_001");
              mpFunction.setAttribute("verb", "Get"); // Define verbo da operação
              mpFunction.setAttribute("noun", "AssetEquipment"); // Define o objeto da operação
              mpFunction.setAttribute("version", "001"); // Define versão da função
  
              // Cria estrutura para identificar o equipamento
              var assetID = xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "ASSETID");
  
              // Cria identificador da organização dentro do asset
              var orgID = xmlDoc.createElement("ORGANIZATIONID");
              var orgCodeElem = xmlDoc.createElement("ORGANIZATIONCODE");
              orgCodeElem.textContent = orgCode; // Define código da organização
              orgID.appendChild(orgCodeElem); // Adiciona código à organização
              assetID.appendChild(orgID); // Adiciona organização ao asset
  
              // Cria elemento com código do equipamento
              var eqCodeElem = xmlDoc.createElement("EQUIPMENTCODE");
              eqCodeElem.textContent = code.trim(); // Define código do equipamento (sem espaços)
              assetID.appendChild(eqCodeElem); // Adiciona código ao asset
  
              // Monta estrutura hierárquica: função -> asset -> body -> envelope -> documento
              mpFunction.appendChild(assetID);
              body.appendChild(mpFunction);
              envelope.appendChild(body);
              xmlDoc.appendChild(envelope);
  
              // Converte documento XML em string para envio
              return new XMLSerializer().serializeToString(xmlDoc);
            }
  
            // FUNÇÃO INTERNA: Constrói requisição SOAP para buscar localizações
            function tryAsLocation(code) {
              // Cria novo documento XML (mesma estrutura base do equipamento)
              var xmlDoc = document.implementation.createDocument("", "", null);
              var envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
              envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
              envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
  
              // Cria cabeçalho (idêntico ao equipamento)
              var header = xmlDoc.createElement("soapenv:Header");
  
              var tenantElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Tenant");
              tenantElem.textContent = tenant;
              header.appendChild(tenantElem);
  
              var orgElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Organization");
              orgElem.textContent = organization;
              header.appendChild(orgElem);
  
              envelope.appendChild(header);
  
              // Cria corpo da requisição específico para localizações
              var body = xmlDoc.createElement("soapenv:Body");
              // Usa função MP0318 específica para localizações (diferente de equipamentos)
              var mpFunction = xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0318_001", "MP0318_GetLocation_001");
              mpFunction.setAttribute("verb", "Get");
              mpFunction.setAttribute("noun", "Location"); // Noun muda para Location
              mpFunction.setAttribute("version", "001");
  
              // Cria estrutura para identificar localização (similar ao asset)
              var locationID = xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "LOCATIONID");
  
              var orgID = xmlDoc.createElement("ORGANIZATIONID");
              var orgCodeElem = xmlDoc.createElement("ORGANIZATIONCODE");
              orgCodeElem.textContent = orgCode;
              orgID.appendChild(orgCodeElem);
              locationID.appendChild(orgID);
  
              // Usa LOCATIONCODE em vez de EQUIPMENTCODE
              var locCodeElem = xmlDoc.createElement("LOCATIONCODE");
              locCodeElem.textContent = code.trim();
              locationID.appendChild(locCodeElem);
  
              // Monta estrutura hierárquica
              mpFunction.appendChild(locationID);
              body.appendChild(mpFunction);
              envelope.appendChild(body);
              xmlDoc.appendChild(envelope);
  
              return new XMLSerializer().serializeToString(xmlDoc);
            }
  
            // FUNÇÃO INTERNA: Executa requisição SOAP e processa resposta
            function makeSOAPRequest(soapRequest, soapAction, isLocation) {
              // Faz requisição Ajax usando ExtJS
              return Ext.Ajax.request({
                url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector", // URL do serviço SOAP
                method: "POST", // Método HTTP
                headers: {
                  "Content-Type": "text/xml; charset=utf-8", // Tipo de conteúdo
                  "SOAPAction": soapAction, // Ação SOAP específica
                  "x-api-key": "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36" // Chave de API para autenticação
                },
                xmlData: soapRequest, // Dados XML da requisição
                // Função executada em caso de sucesso
                success: function (response) {
                  try {
                    // Cria parser para interpretar XML da resposta
                    var parser = new DOMParser();
                    var responseXml = parser.parseFromString(response.responseText, "text/xml");
                    // Define namespace para buscar elementos na resposta
                    var ns = "http://schemas.datastream.net/MP_fields";
                    var description = ""; // Variável para armazenar descrição
  
                    // Processa resposta baseado no tipo (localização ou equipamento)
                    if (isLocation) {
                      // Busca nós LOCATIONID na resposta XML
                      var locationNodes = responseXml.getElementsByTagNameNS(ns, "LOCATIONID");
                      if (locationNodes.length > 0) {
                        // Itera pelos filhos do primeiro nó encontrado
                        var children = locationNodes[0].childNodes;
                        for (var i = 0; i < children.length; i++) {
                          var child = children[i];
                          // Procura elemento DESCRIPTION
                          if (child.localName === "DESCRIPTION") {
                            description = child.textContent.trim(); // Extrai descrição
                            break; // Para a busca quando encontra
                          }
                        }
                      }
                    } else {
                      // Mesmo processo para equipamentos, mas busca ASSETID
                      var assetIdNodes = responseXml.getElementsByTagNameNS(ns, "ASSETID");
                      if (assetIdNodes.length > 0) {
                        var children = assetIdNodes[0].childNodes;
                        for (var i = 0; i < children.length; i++) {
                          var child = children[i];
                          if (child.localName === "DESCRIPTION") {
                            description = child.textContent.trim();
                            break;
                          }
                        }
                      }
                    }
  
                    // Verifica se encontrou descrição
                    if (description) {
                      // Preenche campo udfchar12 com a descrição encontrada
                      vFormPanel.setFldValue('udfchar12', description, true);
                      // Ext.Msg.alert('Sucesso', description); // Comentado - não mostra popup
                    } else {
                      // Se não encontrou como equipamento, tenta como localização
                      if (!isLocation) {
                        tryLocationLookup(); // Chama função de fallback
                      } else {
                        // Se já tentou como localização e não achou, mostra erro
                        Ext.Msg.alert('Aviso', 'Descrição não encontrada');
                      }
                    }
                  } catch (e) {
                    // Captura erros de processamento da resposta
                    console.error("Erro ao processar resposta SOAP:", e);
                    if (!isLocation) {
                      tryLocationLookup(); // Tenta como localização se deu erro como equipamento
                    } else {
                      Ext.Msg.alert('Erro', 'Erro ao processar resposta');
                    }
                  }
                },
                // Função executada em caso de falha na requisição
                failure: function (response) {
                  console.error("Falha na requisição SOAP:", response);
                  
                  // Se falhou como equipamento, tenta como localização
                  if (!isLocation) {
                    tryLocationLookup();
                  } else {
                    Ext.Msg.alert('Erro', 'Falha na consulta');
                  }
                }
              });
            }
  
            // FUNÇÃO INTERNA: Tenta buscar código como localização (fallback)
            function tryLocationLookup() {
              console.log("Tentando buscar como localização:", equipmentCode.trim());
              // Constrói requisição SOAP para localização
              var locationSoapRequest = tryAsLocation(equipmentCode);
              // Faz requisição com ação SOAP específica para localizações
              makeSOAPRequest(
                locationSoapRequest, 
                "http://schemas.datastream.net/MP_functions/MP0019_001/MP0318_GetLocation_001", // Ação SOAP
                true // Flag indicando que é localização
              );
            }
  
            // EXECUÇÃO PRINCIPAL: Tenta primeiro como equipamento
            console.log("Tentando buscar como equipamento:", equipmentCode.trim());
            var equipmentSoapRequest = tryAsEquipment(equipmentCode); // Constrói requisição
            makeSOAPRequest(
              equipmentSoapRequest, 
              "http://schemas.datastream.net/MP_functions/MP0302_001/MP0302_GetAssetEquipment_001", // Ação SOAP
              false // Flag indicando que é equipamento
            );
          }
        },
  
        // SEÇÃO 2: BUSCA DE DEPARTAMENTOS
        // Seleciona campo udfchar05 (departamento) na aba HDR
        '[extensibleFramework] [tabName=HDR] [name=udfchar05]': {
          customonblur: function () {
            // Obtém painel do formulário e valor do campo
            var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
            var deptCode = vFormPanel.getFldValue('udfchar05');
            // Sai se não há valor
            if (!deptCode || deptCode.trim() === '') return;
  
            // Configurações para busca de departamento
            var tenant = "IBNQI1720580460_DEM";
            var organization = "IBNQI";
  
            // FUNÇÃO INTERNA: Constrói requisição SOAP para departamentos
            function buildSoapRequest(departmentCode) {
              // Estrutura XML básica (similar às anteriores)
              var xmlDoc = document.implementation.createDocument("", "", null);
              var envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
              envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
              envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
  
              var header = xmlDoc.createElement("soapenv:Header");
  
              var tenantElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Tenant");
              tenantElem.textContent = tenant;
              header.appendChild(tenantElem);
  
              var orgElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Organization");
              orgElem.textContent = organization;
              header.appendChild(orgElem);
  
              envelope.appendChild(header);
  
              // Corpo específico para busca de departamentos
              var body = xmlDoc.createElement("soapenv:Body");
              // Função MP0617 específica para departamentos
              var mpFunction = xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0617_001", "MP0617_GetDepartment_001");
              mpFunction.setAttribute("verb", "Get");
              mpFunction.setAttribute("noun", "Department");
              mpFunction.setAttribute("version", "001");
  
              // Estrutura para identificar departamento
              var deptID = xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "DEPARTMENTID");
  
              var orgID = xmlDoc.createElement("ORGANIZATIONID");
              var orgCode = xmlDoc.createElement("ORGANIZATIONCODE");
              orgCode.textContent = "*"; // Asterisco para buscar em todas organizações
              orgID.appendChild(orgCode);
              deptID.appendChild(orgID);
  
              // Código do departamento
              var deptCodeElement = xmlDoc.createElement("DEPARTMENTCODE");
              deptCodeElement.textContent = departmentCode.trim();
              deptID.appendChild(deptCodeElement);
  
              mpFunction.appendChild(deptID);
              body.appendChild(mpFunction);
              envelope.appendChild(body);
              xmlDoc.appendChild(envelope);
  
              return new XMLSerializer().serializeToString(xmlDoc);
            }
  
            // Constrói primeira requisição SOAP
            var soapRequest = buildSoapRequest(deptCode);
  
            // Executa requisição Ajax
            Ext.Ajax.request({
              url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector",
              method: "POST",
              headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0617_001/MP0617_GetDepartment_001",
                "x-api-key": "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36"
              },
              xmlData: soapRequest,
              success: function (response) {
                try {
                  // Parse da resposta XML
                  var parser = new DOMParser();
                  var responseXml = parser.parseFromString(response.responseText, "text/xml");
                  var ns = "http://schemas.datastream.net/MP_fields";
                  // Busca campo UDFCHAR01 que contém código da unidade superior
                  var unidadeElement = responseXml.getElementsByTagNameNS(ns, "UDFCHAR01");
  
                  // Verifica se departamento tem unidade vinculada
                  if (unidadeElement.length > 0 && unidadeElement[0].textContent.trim() !== '') {
                    var unidadeCodigo = unidadeElement[0].textContent.trim();
  
                    // SEGUNDA CHAMADA: buscar descrição da unidade
                    // (unidade também é um departamento, por isso usa mesma função)
                    var soapRequestUnidade = buildSoapRequest(unidadeCodigo);
  
                    Ext.Ajax.request({
                      url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector",
                      method: "POST",
                      headers: {
                        "Content-Type": "text/xml; charset=utf-8",
                        "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0617_001/MP0617_GetDepartment_001",
                        "x-api-key": "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36"
                      },
                      xmlData: soapRequestUnidade,
                      success: function (response) {
                        try {
                          // Parse da segunda resposta
                          var parser = new DOMParser();
                          var responseXml = parser.parseFromString(response.responseText, "text/xml");
                          // Busca descrição da unidade
                          var descricaoElement = responseXml.getElementsByTagNameNS(ns, "DESCRIPTION");
  
                          if (descricaoElement.length > 0 && descricaoElement[0].textContent.trim() !== '') {
                            // Se encontrou descrição da unidade, usa ela
                            var descricaoUnidade = descricaoElement[0].textContent.trim();
                            vFormPanel.setFldValue('udfchar06', descricaoUnidade, true);
                          } else {
                            // Se não achou descrição, usa o código da unidade
                            vFormPanel.setFldValue('udfchar06', unidadeCodigo, true);
                          }
                        } catch (e) {
                          console.error("Erro ao processar resposta SOAP (unidade):", e);
                          // Em caso de erro, usa código da unidade
                          vFormPanel.setFldValue('udfchar06', unidadeCodigo, true);
                        }
                      },
                      failure: function () {
                        console.error("Falha ao consultar unidade.");
                        // Em caso de falha, usa código da unidade
                        vFormPanel.setFldValue('udfchar06', unidadeCodigo, true);
                      }
                    });
  
                  } else {
                    // Se departamento não tem unidade vinculada, usa o próprio código do depto
                    vFormPanel.setFldValue('udfchar06', deptCode.trim(), true);
                  }
                } catch (e) {
                  console.error("Erro ao processar resposta SOAP (departamento):", e);
                  // Em caso de erro, usa código do departamento
                  vFormPanel.setFldValue('udfchar06', deptCode.trim(), true);
                }
              },
              failure: function () {
                console.error("Falha ao consultar departamento.");
                // Em caso de falha, usa código do departamento
                vFormPanel.setFldValue('udfchar06', deptCode.trim(), true);
              }
            });
          }
        },
  
        // SEÇÃO 3: BUSCA DE DESCRIÇÕES TRADUZIDAS
        // Seleciona múltiplos campos (udfchar03, udfchar04, udfchar10) na aba HDR
        '[extensibleFramework] [tabName=HDR] [name=udfchar03], [name=udfchar04], [name=udfchar10]': {
          customonblur: function () {
            // Obtém painel do formulário
            var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
  
            // Configurações para busca de descrições
            var tenant = "IBNQI1720580460_DEM";
            var organization = "*"; // Asterisco para todas organizações
  
            // Array que mapeia campos de origem para campos de destino
            var fields = [
              { from: 'udfchar03', to: 'udfchar07' }, // Campo 03 -> Campo 07
              { from: 'udfchar04', to: 'udfchar08' }, // Campo 04 -> Campo 08
              { from: 'udfchar10', to: 'udfchar14' }  // Campo 10 -> Campo 14
            ];
  
            // Itera por cada par de campos
            fields.forEach(function (pair) {
              // Obtém valor do campo de origem
              var value = vFormPanel.getFldValue(pair.from);
              // Se não há valor, pula para próximo
              if (!value || value.trim() === '') return;
  
              // Formata valor: concatena nome do campo + valor em minúsculas
              // Ex: "udfchar03" + "ABC" = "udfchar03abc"
              var formattedValue = pair.from + value.trim().toLowerCase();
  
              // Constrói documento XML para requisição
              var xmlDoc = document.implementation.createDocument("", "", null);
              var envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
              envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
              envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
  
              // Cabeçalho da requisição
              var header = xmlDoc.createElement("soapenv:Header");
  
              var tenantElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Tenant");
              tenantElem.textContent = tenant;
              header.appendChild(tenantElem);
  
              var orgElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Organization");
              orgElem.textContent = organization;
              header.appendChild(orgElem);
  
              envelope.appendChild(header);
  
              // Corpo da requisição específico para descrições
              var body = xmlDoc.createElement("soapenv:Body");
  
              // Função MP0674 para buscar descrições/traduções
              var mpFunction = xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0674_001", "MP0674_GetDescription_001");
              mpFunction.setAttribute("verb", "Get");
              mpFunction.setAttribute("noun", "Description");
              mpFunction.setAttribute("version", "001");
  
              // Estrutura para identificar a descrição
              var descriptionID = xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "DESCRIPTIONID");
  
              // Entidade - tipo de objeto que contém a descrição
              var entity = xmlDoc.createElement("ENTITY");
              entity.textContent = "UDLV"; // Tipo específico para User Defined List Values
              descriptionID.appendChild(entity);
  
              // Código da descrição (valor formatado)
              var descode = xmlDoc.createElement("DESCODE");
              descode.textContent = formattedValue;
              descriptionID.appendChild(descode);
  
              // ID da organização
              var orgID = xmlDoc.createElement("ORGANIZATIONID");
              orgID.setAttribute("entity", "User"); // Entidade de usuário
              var orgCode = xmlDoc.createElement("ORGANIZATIONCODE");
              orgCode.textContent = "*"; // Todas organizações
              orgID.appendChild(orgCode);
              descriptionID.appendChild(orgID);
  
              // ID do idioma para tradução
              var langID = xmlDoc.createElement("LANGUAGEID");
              var langCode = xmlDoc.createElement("LANGUAGECODE");
              langCode.textContent = "PT"; // Português
              langID.appendChild(langCode);
              descriptionID.appendChild(langID);
  
              // Tipo da descrição
              var type = xmlDoc.createElement("TYPE");
              type.setAttribute("entity", "User"); // Entidade de usuário
              var typeCode = xmlDoc.createElement("TYPECODE");
              typeCode.textContent = "COCT"; // Tipo específico do sistema
              type.appendChild(typeCode);
              descriptionID.appendChild(type);
  
              // Monta estrutura hierárquica
              mpFunction.appendChild(descriptionID);
              body.appendChild(mpFunction);
              envelope.appendChild(body);
              xmlDoc.appendChild(envelope);
  
              // Converte para string XML
              var soapRequest = new XMLSerializer().serializeToString(xmlDoc);
  
              // Executa requisição Ajax
              Ext.Ajax.request({
                url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector",
                method: "POST",
                headers: {
                  "Content-Type": "text/xml; charset=utf-8",
                  "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0674_001/MP0674_GetDescription_001",
                  "x-api-key": "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36"
                },
                xmlData: soapRequest,
                success: function (response) {
                  try {
                    // Parse da resposta XML
                    var parser = new DOMParser();
                    var responseXml = parser.parseFromString(response.responseText, "text/xml");
  
                    var ns = "http://schemas.datastream.net/MP_fields";
                    // Busca elemento que contém texto traduzido
                    var translatedElements = responseXml.getElementsByTagNameNS(ns, "TRANSLATEDTEXT");
  
                    if (translatedElements.length > 0) {
                      // Se encontrou tradução, preenche campo de destino
                      var translatedText = translatedElements[0].textContent;
                      vFormPanel.setFldValue(pair.to, translatedText, true);
                    } else {
                      // Se não encontrou, não faz nada (campo fica vazio)
                      // console.warn("Sem resultado para o campo: " + pair.from);
                    }
                  } catch (e) {
                    // Captura erros de processamento (não mostra ao usuário)
                    // console.error("Erro ao processar resposta SOAP:", e);
                  }
                },
                failure: function () {
                  // Captura falhas de requisição (não mostra ao usuário)
                  // console.error("Falha na requisição SOAP.");
                }
              });
            }); // Fim do forEach
          }
        }
  
      }; // Fim do return dos selectors
    } // Fim da função getSelectors
  }); // Fim da definição da classe