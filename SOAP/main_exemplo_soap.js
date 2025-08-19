/* CODIGO UTILIZANDO SOAP !!   */
/* ESTA VINCULADO A WSJOBS !! */
/* APENAS EXEMPLO !!   */

// Define uma nova classe JavaScript seguindo o padrão do Ext JS
// O nome da classe é "EAM.custom.external_cssrpt"
Ext.define("EAM.custom.external_cssrpt", {
  
    // Especifica que esta classe herda de "EAM.custom.AbstractExtensibleFramework"
    // Fornece acesso aos métodos base para customizações EAM
    extend: "EAM.custom.AbstractExtensibleFramework",
  
    // Função obrigatória que retorna os "seletores" (observadores de eventos)
    getSelectors: function() {
        // Retorna um objeto com seletores CSS como chaves e eventos como valores
        return {
            
            // ================================
            // SELETOR: Campo udfchar03 na aba HDR
            // ================================
            
            // Observa o campo 'udfchar03' na aba 'HDR'
            // Este campo será usado como "gatilho" para buscar descrições via SOAP
            '[extensibleFramework] [tabName=HDR] [name=udfchar03]': {
                
                // Evento que dispara quando o usuário sai do campo (perde o foco)
                customonblur: function() {
                    
                    // Obtém a referência do painel de formulário da aba atual
                    var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                    
                    // Lê o valor atual do campo 'udfchar03'
                    var udfChar03Value = vFormPanel.getFldValue('udfchar03');
  
                    // ================================
                    // VALIDAÇÃO DE ENTRADA
                    // ================================
                    
                    // Verifica se o campo está vazio ou contém apenas espaços
                    // Se estiver vazio, interrompe a execução (não faz a consulta SOAP)
                    if (!udfChar03Value || udfChar03Value.trim() === '') {
                        return; // Sai da função sem fazer nada
                    }
  
                    // ================================
                    // FORMATAÇÃO DO VALOR
                    // ================================
                    
                    // Formata o valor para o padrão esperado pelo serviço SOAP
                    // Concatena "udfchar03" + valor limpo em minúsculas
                    // Exemplo: se o usuário digitar "ABC", fica "udfchar03abc"
                    var formattedValue = "udfchar03" + udfChar03Value.trim().toLowerCase();
  
                    // ================================
                    // CONSTRUÇÃO DO XML SOAP - INÍCIO
                    // ================================
                    
                    // Cria um documento XML vazio usando a API nativa do browser
                    var xmlDoc = document.implementation.createDocument("", "", null);
                    
                    // Cria o elemento raiz "Envelope" com namespace SOAP
                    var envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
                    // Define namespaces XML Schema para validação
                    envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
                    envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
                    
                    // ================================
                    // CONSTRUÇÃO DO CABEÇALHO SOAP
                    // ================================
                    
                    // Cria o cabeçalho SOAP
                    var header = xmlDoc.createElement("soapenv:Header");
                    
                    // Elemento de segurança WS-Security
                    var security = xmlDoc.createElement("wsse:Security");
                    security.setAttribute("xmlns:wsse", "http://schemas.xmlsoap.org/ws/2002/04/secext");
                    
                    // ================================
                    // CREDENCIAIS DE AUTENTICAÇÃO
                    // ================================
                    
                    // IMPORTANTE: Se for usar em outro sistema, altere as credenciais!
                    // De preferência, crie um usuário específico para integração
                    var usernameToken = xmlDoc.createElement("wsse:UsernameToken");
                    
                    // Nome do usuário para autenticação
                    var username = xmlDoc.createElement("wsse:Username");
                    username.textContent = "AATAIDE@IBNQI1720580460_DEM";
                    
                    // Senha do usuário (ATENÇÃO: senha em texto plano - considere criptografia)
                    var password = xmlDoc.createElement("wsse:Password");
                    password.textContent = "Asset@2025";
                    
                    // Monta a estrutura do token de usuário
                    usernameToken.appendChild(username);
                    usernameToken.appendChild(password);
                    security.appendChild(usernameToken);
                    header.appendChild(security);
                    
                    // ================================
                    // PARÂMETROS DE SESSÃO
                    // ================================
                    
                    // Define o cenário da sessão como "terminate" (terminar após uso)
                    var sessionScenario = xmlDoc.createElement("SessionScenario");
                    sessionScenario.setAttribute("xmlns", "http://schemas.datastream.net/headers");
                    sessionScenario.textContent = "terminate";
                    header.appendChild(sessionScenario);
                    
                    // Define a organização como "*" (todas as organizações)
                    var organization = xmlDoc.createElement("Organization");
                    organization.setAttribute("xmlns", "http://schemas.datastream.net/headers");
                    organization.textContent = "*";
                    header.appendChild(organization);
                    
                    // Adiciona o cabeçalho completo ao envelope
                    envelope.appendChild(header);
                    
                    // ================================
                    // CONSTRUÇÃO DO CORPO SOAP
                    // ================================
                    
                    // Cria o corpo da mensagem SOAP
                    var body = xmlDoc.createElement("soapenv:Body");
                    
                    // Define a função MP específica que será chamada
                    // MP0674_GetDescription_001 = função para obter descrições
                    var mpFunction = xmlDoc.createElement("MP0674_GetDescription_001");
                    mpFunction.setAttribute("xmlns", "http://schemas.datastream.net/MP_functions/MP0674_001");
                    mpFunction.setAttribute("verb", "Get");        // Verbo da operação
                    mpFunction.setAttribute("noun", "Description"); // Substantivo da operação
                    mpFunction.setAttribute("version", "001");      // Versão da função
                    
                    // ================================
                    // PARÂMETROS DA CONSULTA
                    // ================================
                    
                    // Container principal para o ID da descrição
                    var descriptionID = xmlDoc.createElement("DESCRIPTIONID");
                    descriptionID.setAttribute("xmlns", "http://schemas.datastream.net/MP_fields");
                    
                    // Entidade a ser consultada (UDLV = User Defined List Values)
                    var entity = xmlDoc.createElement("ENTITY");
                    entity.textContent = "UDLV";
                    descriptionID.appendChild(entity);
                    
                    // Código da descrição (valor formatado do campo)
                    var descode = xmlDoc.createElement("DESCODE");
                    descode.textContent = formattedValue;
                    descriptionID.appendChild(descode);
                    
                    // ================================
                    // CONFIGURAÇÕES ORGANIZACIONAIS
                    // ================================
                    
                    // ID da organização
                    var orgID = xmlDoc.createElement("ORGANIZATIONID");
                    orgID.setAttribute("entity", "User");
                    var orgCode = xmlDoc.createElement("ORGANIZATIONCODE");
                    orgCode.textContent = "*"; // Todas as organizações
                    orgID.appendChild(orgCode);
                    descriptionID.appendChild(orgID);
                    
                    // ================================
                    // CONFIGURAÇÕES DE IDIOMA
                    // ================================
                    
                    // ID do idioma para a descrição
                    var langID = xmlDoc.createElement("LANGUAGEID");
                    var langCode = xmlDoc.createElement("LANGUAGECODE");
                    langCode.textContent = "PT"; // Português
                    langID.appendChild(langCode);
                    descriptionID.appendChild(langID);
                    
                    // ================================
                    // TIPO DE DESCRIÇÃO
                    // ================================
                    
                    // Tipo de descrição a ser buscada
                    var type = xmlDoc.createElement("TYPE");
                    type.setAttribute("entity", "User");
                    var typeCode = xmlDoc.createElement("TYPECODE");
                    typeCode.textContent = "EVNT"; // Tipo "EVNT" (Event/Evento)
                    type.appendChild(typeCode);
                    descriptionID.appendChild(type);
                    
                    // Monta a estrutura completa
                    mpFunction.appendChild(descriptionID);
                    body.appendChild(mpFunction);
                    envelope.appendChild(body);
                    xmlDoc.appendChild(envelope);
                    
                    // ================================
                    // SERIALIZAÇÃO DO XML
                    // ================================
                    
                    // Converte o documento XML em string para envio
                    var soapRequest = new XMLSerializer().serializeToString(xmlDoc);
  
                    // ================================
                    // ENVIO DA REQUISIÇÃO SOAP
                    // ================================
                    
                    // Envia a requisição SOAP usando Ext.Ajax
                    Ext.Ajax.request({
                        
                        // URL do serviço web SOAP da Hexagon
                        url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector",
                        
                        // Método HTTP POST (padrão para SOAP)
                        method: "POST",
                        
                        // Cabeçalhos HTTP obrigatórios para SOAP
                        headers: {
                            "Content-Type": "text/xml; charset=utf-8", // Tipo de conteúdo XML
                            "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0674_001/MP0674_GetDescription_001" // Ação SOAP específica
                        },
                        
                        // Dados XML da requisição
                        xmlData: soapRequest,
                        
                        // ================================
                        // TRATAMENTO DO SUCESSO
                        // ================================
                        
                        // Função executada quando a requisição é bem-sucedida
                        success: function(response) {
                            
                            // Bloco try-catch para tratar erros de processamento
                            try {
                                
                                // Cria um parser DOM para processar a resposta XML
                                var parser = new DOMParser();
                                var responseXml = parser.parseFromString(response.responseText, "text/xml");
                                
                                // ================================
                                // EXTRAÇÃO DOS DADOS DA RESPOSTA
                                // ================================
                                
                                // Busca elementos TRANSLATEDTEXT com namespace correto
                                var ns = "http://schemas.datastream.net/MP_fields";
                                var translatedElements = responseXml.getElementsByTagNameNS(ns, "TRANSLATEDTEXT");
                                
                                // Verifica se encontrou pelo menos um elemento com a descrição
                                if (translatedElements.length > 0) {
                                    
                                    // Extrai o texto da descrição encontrada
                                    var translatedText = translatedElements[0].textContent;
                                    
                                    // ================================
                                    // PREENCHIMENTO AUTOMÁTICO
                                    // ================================
                                    
                                    // Preenche o campo 'udfchar02' com a descrição encontrada
                                    // setFldValue(nome_campo, valor, atualizar_visualmente)
                                    // O terceiro parâmetro 'true' força a atualização na tela
                                    vFormPanel.setFldValue('udfchar02', translatedText, true);
                                }
                                
                            } 
                            // Captura erros durante o processamento da resposta
                            catch (e) {
                                // Loga o erro no console para debug
                                console.error("Erro ao processar resposta:", e);
                            }
                        }
                        
                        // Nota: Não há tratamento de erro (failure) definido
                        // Em produção, seria recomendável adicionar tratamento para falhas de rede
                        
                    }); // Fim da requisição Ajax
                    
                } // Fim da função customonblur
            } // Fim do seletor do campo udfchar03
        }; // Fim do objeto return
    } // Fim da função getSelectors
  }); // Fim da definição da classe