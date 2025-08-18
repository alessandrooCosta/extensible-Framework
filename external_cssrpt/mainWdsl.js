Ext.define("EAM.custom.external_cssrpt", {
  extend: "EAM.custom.AbstractExtensibleFramework",

  getSelectors: function () {
    return {

      // EQUIPAMENTOS
      '[extensibleFramework] [tabName=HDR] [name=equipment]': {
          customonblur: function () {
              var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
              var equipmentCode = vFormPanel.getFldValue('equipment');
              if (!equipmentCode || equipmentCode.trim() === '') return;

              var tenant = "IBNQI1720580460_DEM"; // TENANT
              var organization = "IBNQI"; // ORGANIZATION
              var orgCode = "C001"; // CODIGO DA ORGANIZAÇÃO

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

              var body = xmlDoc.createElement("soapenv:Body");
              var mpFunction = xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0302_001", "MP0302_GetAssetEquipment_001");
              mpFunction.setAttribute("verb", "Get");
              mpFunction.setAttribute("noun", "AssetEquipment");
              mpFunction.setAttribute("version", "001");

              var assetID = xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "ASSETID");

              var orgID = xmlDoc.createElement("ORGANIZATIONID");
              var orgCodeElem = xmlDoc.createElement("ORGANIZATIONCODE");
              orgCodeElem.textContent = orgCode;
              orgID.appendChild(orgCodeElem);
              assetID.appendChild(orgID);

              var eqCodeElem = xmlDoc.createElement("EQUIPMENTCODE");
              eqCodeElem.textContent = equipmentCode.trim();
              assetID.appendChild(eqCodeElem);

              mpFunction.appendChild(assetID);
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
                      "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0302_001/MP0302_GetAssetEquipment_001",
                      "x-api-key": "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36" // TOKEN
                  },
                  xmlData: soapRequest,
                  success: function (response) {
                      try {
                          var parser = new DOMParser();
                          var responseXml = parser.parseFromString(response.responseText, "text/xml");
                          var ns = "http://schemas.datastream.net/MP_fields";

                          var assetIdNodes = responseXml.getElementsByTagNameNS(ns, "ASSETID");
                          var description = "";
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

                          vFormPanel.setFldValue('udfchar12', description, true);
                        //  console.log("Descrição do equipamento:", description);
                      } catch (e) {
                        //  console.error("Erro ao processar resposta SOAP:", e);
                      }
                  },
                  failure: function () {
                    //  console.error("Falha na requisição SOAP.");
                  }
              });
          }
      },

      // DEPARTAMENTOS
      '[extensibleFramework] [tabName=HDR] [name=udfchar05]': {
        customonblur: function () {
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
          var deptCode = vFormPanel.getFldValue('udfchar05');
          if (!deptCode || deptCode.trim() === '') return;

          var tenant = "IBNQI1720580460_DEM";
          var organization = "IBNQI";
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

          var body = xmlDoc.createElement("soapenv:Body");
          var mpFunction = xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0617_001", "MP0617_GetDepartment_001");
          mpFunction.setAttribute("verb", "Get");
          mpFunction.setAttribute("noun", "Department");
          mpFunction.setAttribute("version", "001");

          var deptID = xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "DEPARTMENTID");

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
         // console.log("SOAP Request:", soapRequest);

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
                var parser = new DOMParser();
                var responseXml = parser.parseFromString(response.responseText, "text/xml");
                var ns = "http://schemas.datastream.net/MP_fields";
                var unidadeElement = responseXml.getElementsByTagNameNS(ns, "DESCRIPTION");

                if (unidadeElement.length > 0 && unidadeElement[0].textContent.trim() !== '') {
                  var unidadeCodigo = unidadeElement[0].textContent.trim();
                  vFormPanel.setFldValue('udfchar06', unidadeCodigo, true);
                } else {
                  vFormPanel.setFldValue('udfchar06', deptCode.trim(), true);
                }
              } catch (e) {
              //  console.log("Erro", "Erro ao processar resposta.");
              }
            },
            failure: function () {
            //  console.log("Erro", "Erro ao consultar o departamento.");
            }
          });
        }
      },
      
      // É POSSIVEL CONTINUAR O TRABALHO ? ETC...
      '[extensibleFramework] [tabName=HDR] [name=udfchar03], [name=udfchar04], [name=udfchar10]': {
        customonblur: function () {
          var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();

          var tenant = "IBNQI1720580460_DEM";
          var organization = "*";

          var fields = [
            { from: 'udfchar03', to: 'udfchar07' },
            { from: 'udfchar04', to: 'udfchar08' },
            { from: 'udfchar10', to: 'udfchar14' }
          ];

          fields.forEach(function (pair) {
            var value = vFormPanel.getFldValue(pair.from);
            if (!value || value.trim() === '') return;

            var formattedValue = pair.from + value.trim().toLowerCase();

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

            var body = xmlDoc.createElement("soapenv:Body");

            var mpFunction = xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0674_001", "MP0674_GetDescription_001");
            mpFunction.setAttribute("verb", "Get");
            mpFunction.setAttribute("noun", "Description");
            mpFunction.setAttribute("version", "001");

            var descriptionID = xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "DESCRIPTIONID");

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
                  var parser = new DOMParser();
                  var responseXml = parser.parseFromString(response.responseText, "text/xml");

                  var ns = "http://schemas.datastream.net/MP_fields";
                  var translatedElements = responseXml.getElementsByTagNameNS(ns, "TRANSLATEDTEXT");

                  if (translatedElements.length > 0) {
                    var translatedText = translatedElements[0].textContent;
                    vFormPanel.setFldValue(pair.to, translatedText, true);
                  } else {
                    // console.warn("Sem resultado para o campo: " + pair.from);
                  }
                } catch (e) {
                  // console.error("Erro ao processar resposta SOAP:", e);
                }
              },
              failure: function () {
                // console.error("Falha na requisição SOAP.");
              }
            });
          });
        }
      }
    };
  }
});
