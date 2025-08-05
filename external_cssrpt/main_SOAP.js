/* CODIGO FINALIZADO E EM PRODUÇÃO  */

Ext.define("EAM.custom.external_cssrpt", {
    extend: "EAM.custom.AbstractExtensibleFramework",
  
    getSelectors: function () {
      return {

        // Campo UDFCHAR05 - Consulta SOAP para buscar o DEPARTMENT e preencher UDFCHAR06
        '[extensibleFramework] [tabName=HDR] [name=udfchar05]': {
          customonblur: function () {
            var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
            var deptCode = vFormPanel.getFldValue('udfchar05');
  
            if (!deptCode || deptCode.trim() === '') return;

            // Cria requisição SOAP para buscar o DEPARTMENT
            var xmlDoc = document.implementation.createDocument("", "", null);
            var envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
            envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
            envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
  
            var header = xmlDoc.createElement("soapenv:Header");
            var security = xmlDoc.createElement("wsse:Security");
            security.setAttribute("xmlns:wsse", "http://schemas.xmlsoap.org/ws/2002/04/secext");
  
            var usernameToken = xmlDoc.createElement("wsse:UsernameToken");
            var username = xmlDoc.createElement("wsse:Username");
            var password = xmlDoc.createElement("wsse:Password");
            // username.textContent = "AATAIDE@IBNQI1720580460_DEM";
            // password.textContent = "Asset@2025";
            username.textContent = "ACOSTA@IBNQI1720580460_DEM";
            password.textContent = "Asset@25";
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
            organization.textContent = "IBNQI";
            header.appendChild(organization);
  
            envelope.appendChild(header);
  
            var body = xmlDoc.createElement("soapenv:Body");
            var mpFunction = xmlDoc.createElement("MP0617_GetDepartment_001");
            mpFunction.setAttribute("xmlns", "http://schemas.datastream.net/MP_functions/MP0617_001");
            mpFunction.setAttribute("verb", "Get");
            mpFunction.setAttribute("noun", "Department");
            mpFunction.setAttribute("version", "001");
  
            var deptID = xmlDoc.createElement("DEPARTMENTID");
            deptID.setAttribute("xmlns", "http://schemas.datastream.net/MP_fields");
  
            var orgID = xmlDoc.createElement("ORGANIZATIONID");
            var orgCode = xmlDoc.createElement("ORGANIZATIONCODE");
            orgCode.textContent = "*";
            orgID.appendChild(orgCode);
            deptID.appendChild(orgID);
  
            var deptCodeElement = xmlDoc.createElement("DEPARTMENTCODE");
            deptCodeElement.textContent = deptCode.trim();
            deptID.appendChild(deptCodeElement);
  
            mpFunction.appendChild(deptID);
            body.appendChild(mpFunction);
            envelope.appendChild(body);
            xmlDoc.appendChild(envelope);
  
            var soapRequest = new XMLSerializer().serializeToString(xmlDoc);
            //console.log("SOAP Request:", soapRequest);
            Ext.Ajax.request({
              url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector",
              method: "POST",
              headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0617_001/MP0617_GetDepartment_001"
              },
              xmlData: soapRequest,
              success: function (response) {
                try {
                  var parser = new DOMParser();
                  var responseXml = parser.parseFromString(response.responseText, "text/xml");
                  var ns = "http://schemas.datastream.net/MP_fields";
  
                  var unidadeElement = responseXml.getElementsByTagNameNS(ns, "UDFCHAR01");
  
                  if (unidadeElement.length > 0 && unidadeElement[0].textContent.trim() !== '') {
                    var unidadeCodigo = unidadeElement[0].textContent.trim();
                    vFormPanel.setFldValue('udfchar06', unidadeCodigo, true);
                  } else {
                    vFormPanel.setFldValue('udfchar06', deptCode.trim(), true);
                  }
                } catch (e) {
                  console.log("Erro", "Erro ao processar resposta.");
                }
              },
              failure: function () {
                console.log("Erro", "Erro ao consultar o departamento.");
              }
            });
          }
        },
        
        // Campo UDFCHAR03, UDFCHAR04 e UDFCHAR10 
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
                if (!value || value.trim() === '') return;
    
                var formattedValue = pair.from + value.trim().toLowerCase();
    
                // Criação do XML SOAP
                var xmlDoc = document.implementation.createDocument("", "", null);
                var envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
                envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
                envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
    
                var header = xmlDoc.createElement("soapenv:Header");
    
                var security = xmlDoc.createElement("wsse:Security");
                security.setAttribute("xmlns:wsse", "http://schemas.xmlsoap.org/ws/2002/04/secext");
    
                var usernameToken = xmlDoc.createElement("wsse:UsernameToken");
                var username = xmlDoc.createElement("wsse:Username");
                var password = xmlDoc.createElement("wsse:Password");
                // username.textContent = "AATAIDE@IBNQI1720580460_DEM";
                // password.textContent = "Asset@2025";
                username.textContent = "ACOSTA@IBNQI1720580460_DEM";
                password.textContent = "Asset@25";
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
                typeCode.textContent = "COCT";
                type.appendChild(typeCode);
                descriptionID.appendChild(type);
    
                mpFunction.appendChild(descriptionID);
                body.appendChild(mpFunction);
                envelope.appendChild(body);
                xmlDoc.appendChild(envelope);
    
                var soapRequest = new XMLSerializer().serializeToString(xmlDoc);
    
                // Envio da requisição
                Ext.Ajax.request({
                  url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector",
                  method: "POST",
                  headers: {
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0674_001/MP0674_GetDescription_001"
                  },
                  xmlData: soapRequest,
                  success: function (response) {
                    try {
                      var parser = new DOMParser();
                      var responseXml = parser.parseFromString(response.responseText, "text/xml");
    
                      var ns = "http://schemas.datastream.net/MP_fields";
                      var translatedElements = responseXml.getElementsByTagNameNS(ns, "TRANSLATEDTEXT");
    
                      if (translatedElements.length > 0) {
                        var translatedText = translatedElements[0].textContent;
                        vFormPanel.setFldValue(pair.to, translatedText, true);
                        //console.log("Campo " + pair.to + " preenchido com:", translatedText);
                      } else {
                        console.warn("Sem resultado para o campo: " + pair.from);
                      }
                    } catch (e) {
                      console.error("Erro ao processar resposta SOAP:", e);
                    }
                  },
                  failure: function () {
                    console.error("Falha na requisição SOAP.");
                  }
                });
              });
            }
          }
      };
    }
  });
  