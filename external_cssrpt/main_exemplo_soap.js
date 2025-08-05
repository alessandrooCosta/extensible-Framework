
/* CODIGO UTILIZANDO SOAP !!   */
/* ESTA VINCULADO A WSJOBS !! */
/* APENAS EXEMPLO !!   */
Ext.define("EAM.custom.external_cssrpt", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function() {
      return {
          '[extensibleFramework] [tabName=HDR] [name=udfchar03]': {
              customonblur: function() {
                  var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
                  var udfChar03Value = vFormPanel.getFldValue('udfchar03');

                  // Se o valor estiver vazio, não faz nada
                  if (!udfChar03Value || udfChar03Value.trim() === '') {
                      return;
                  }

                  // Formata o valor conforme schema, se for mudar mude apenas o campo udfchar03
                  var formattedValue = "udfchar03" + udfChar03Value.trim().toLowerCase();

                  // Construção segura do XML
                  var xmlDoc = document.implementation.createDocument("", "", null);
                  var envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
                  envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
                  envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
                  
                  var header = xmlDoc.createElement("soapenv:Header");
                  
                  var security = xmlDoc.createElement("wsse:Security");
                  security.setAttribute("xmlns:wsse", "http://schemas.xmlsoap.org/ws/2002/04/secext");
                  
                  // Se for usar em outro sistema, utilizar outro usuário, de preferencia crie um usuário só pra isso!
                  var usernameToken = xmlDoc.createElement("wsse:UsernameToken");
                  var username = xmlDoc.createElement("wsse:Username");
                  username.textContent = "AATAIDE@IBNQI1720580460_DEM";
                  var password = xmlDoc.createElement("wsse:Password");
                  password.textContent = "Asset@2025";
                  
                  usernameToken.appendChild(username);
                  usernameToken.appendChild(password);
                  security.appendChild(usernameToken);
                  header.appendChild(security);
                  
                  var sessionScenario = xmlDoc.createElement("SessionScenario");
                  sessionScenario.setAttribute("xmlns", "http://schemas.datastream.net/headers");
                  sessionScenario.textContent = "terminate";
                  header.appendChild(sessionScenario);
                  
                  var organization = xmlDoc.createElement("Organization");
                  organization.setAttribute("xmlns", "http://schemas.datastream.net/headers");
                  organization.textContent = "*";
                  header.appendChild(organization);
                  
                  envelope.appendChild(header);
                  
                  var body = xmlDoc.createElement("soapenv:Body");
                  
                  var mpFunction = xmlDoc.createElement("MP0674_GetDescription_001");
                  mpFunction.setAttribute("xmlns", "http://schemas.datastream.net/MP_functions/MP0674_001");
                  mpFunction.setAttribute("verb", "Get");
                  mpFunction.setAttribute("noun", "Description");
                  mpFunction.setAttribute("version", "001");
                  
                  var descriptionID = xmlDoc.createElement("DESCRIPTIONID");
                  descriptionID.setAttribute("xmlns", "http://schemas.datastream.net/MP_fields");
                  
                  var entity = xmlDoc.createElement("ENTITY");
                  entity.textContent = "UDLV";
                  descriptionID.appendChild(entity);
                  
                  var descode = xmlDoc.createElement("DESCODE");
                  descode.textContent = formattedValue;
                  descriptionID.appendChild(descode);
                  
                  var orgID = xmlDoc.createElement("ORGANIZATIONID");
                  orgID.setAttribute("entity", "User");
                  var orgCode = xmlDoc.createElement("ORGANIZATIONCODE");
                  orgCode.textContent = "*";
                  orgID.appendChild(orgCode);
                  descriptionID.appendChild(orgID);
                  
                  var langID = xmlDoc.createElement("LANGUAGEID");
                  var langCode = xmlDoc.createElement("LANGUAGECODE");
                  langCode.textContent = "PT";
                  langID.appendChild(langCode);
                  descriptionID.appendChild(langID);
                  
                  var type = xmlDoc.createElement("TYPE");
                  type.setAttribute("entity", "User");
                  var typeCode = xmlDoc.createElement("TYPECODE");
                  typeCode.textContent = "EVNT";
                  type.appendChild(typeCode);
                  descriptionID.appendChild(type);
                  
                  mpFunction.appendChild(descriptionID);
                  body.appendChild(mpFunction);
                  envelope.appendChild(body);
                  xmlDoc.appendChild(envelope);
                  
                  var soapRequest = new XMLSerializer().serializeToString(xmlDoc);

                  // Envia a requisição
                  Ext.Ajax.request({
                      url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector",
                      method: "POST",
                      headers: {
                          "Content-Type": "text/xml; charset=utf-8",
                          "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0674_001/MP0674_GetDescription_001"
                      },
                      xmlData: soapRequest,
                      success: function(response) {
                          try {
                              var parser = new DOMParser();
                              var responseXml = parser.parseFromString(response.responseText, "text/xml");
                              
                              // Buscar TRANSLATEDTEXT com namespace correto
                              var ns = "http://schemas.datastream.net/MP_fields";
                              var translatedElements = responseXml.getElementsByTagNameNS(ns, "TRANSLATEDTEXT");
                              
                              if (translatedElements.length > 0) {
                                  var translatedText = translatedElements[0].textContent;
                                  // Preenche o campo silenciosamente (sem alerta)
                                  vFormPanel.setFldValue('udfchar02', translatedText, true);
                              }
                          } catch (e) {
                              console.error("Erro ao processar resposta:", e);
                          }
                      }
                  });
              }
          }
      };
  }
});