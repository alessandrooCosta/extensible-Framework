Ext.define("EAM.custom.external_cssrpt", {
    extend: "EAM.custom.AbstractExtensibleFramework",
  
    getSelectors: function () {
      return {
  
        // EQUIPAMENTIOS / LOCALIZAÇÕES / SISTEMAS
        '[extensibleFramework] [tabName=HDR] [name=equipment]': {
          customonblur: function () {
            var vFormPanel    = EAM.Utils.getCurrentTab().getFormPanel();
            var equipmentCode = vFormPanel.getFldValue('equipment');
            if (!equipmentCode || equipmentCode.trim() === '') return;
            var tenant       = "IBNQI1720580460_DEM";
            var organization = "IBNQ";
            var orgCode      = "C001";     
            var systemOrg    = orgCode;   
            var API_KEY      = "aeb580ed2d-2aa7-45f7-97e2-97cce77f3b36"; 
            function buildEnvelope() {
              var xmlDoc = document.implementation.createDocument("", "", null);
              var env = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
              env.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
              env.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
  
              var header = xmlDoc.createElement("soapenv:Header");
              var tenantElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Tenant");
              tenantElem.textContent = tenant;
              header.appendChild(tenantElem);
              var orgElem = xmlDoc.createElementNS("http://schemas.datastream.net/headers", "Organization");
              orgElem.textContent = organization;
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
              } catch(e){}
              return "";
            }
            function finishWithDesc(desc) {
              if (desc) vFormPanel.setFldValue('udfchar12', desc, true);
            }
            function parseFirstChildText(nsXml, tagNS, containerTag, wantedChild) {
              var nodes = nsXml.getElementsByTagNameNS(tagNS, containerTag);
              if (!nodes || !nodes.length) return "";
              var kids = nodes[0].childNodes || [];
              for (var i = 0; i < kids.length; i++) {
                if (kids[i].localName === wantedChild) {
                  return (kids[i].textContent || "").trim();
                }
              }
              return "";
            }
            function buildAssetRequest(code) {
              var b  = buildEnvelope();
              var mp = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0302_001", "MP0302_GetAssetEquipment_001");
              mp.setAttribute("verb", "Get");
              mp.setAttribute("noun", "AssetEquipment");
              mp.setAttribute("version", "001");
  
              var id  = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "ASSETID");
              var oid = b.xmlDoc.createElement("ORGANIZATIONID");
              var oc  = b.xmlDoc.createElement("ORGANIZATIONCODE");
              oc.textContent = orgCode;
              oid.appendChild(oc);
              id.appendChild(oid);
  
              var eq  = b.xmlDoc.createElement("EQUIPMENTCODE");
              eq.textContent = code.trim();
              id.appendChild(eq);
  
              mp.appendChild(id);
              b.body.appendChild(mp);
              return new XMLSerializer().serializeToString(b.xmlDoc);
            }
            function buildLocationRequest(code) {
              var b  = buildEnvelope();
              var mp = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_functions/MP0318_001", "MP0318_GetLocation_001");
              mp.setAttribute("verb", "Get");
              mp.setAttribute("noun", "Location");
              mp.setAttribute("version", "001");
  
              var id  = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "LOCATIONID");
              var oid = b.xmlDoc.createElement("ORGANIZATIONID");
              var oc  = b.xmlDoc.createElement("ORGANIZATIONCODE");
              oc.textContent = orgCode;
              oid.appendChild(oc);
              id.appendChild(oid);
  
              var lc  = b.xmlDoc.createElement("LOCATIONCODE");
              lc.textContent = code.trim();
              id.appendChild(lc);
  
              mp.appendChild(id);
              b.body.appendChild(mp);
              return new XMLSerializer().serializeToString(b.xmlDoc);
            }
            function buildSystemRequests(code) {
              var reqs = [];
  
              function makeReq(includeOrg, orgValue) {
                var b  = buildEnvelope();
                var mp = b.xmlDoc.createElementNS(
                  "http://schemas.datastream.net/MP_functions/MP0312_001",
                  "MP0312_GetSystemEquipment_001"
                );
                mp.setAttribute("verb", "Get");
                mp.setAttribute("version", "001");
  
                var sid = b.xmlDoc.createElementNS("http://schemas.datastream.net/MP_fields", "SYSTEMID");
  
                if (includeOrg) {
                  var oid = b.xmlDoc.createElement("ORGANIZATIONID");
                  var oc  = b.xmlDoc.createElement("ORGANIZATIONCODE");
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
  
              reqs.push(makeReq(true,  systemOrg)); // com ORGANIZATIONID/ORGANIZATIONCODE
              reqs.push(makeReq(false, ""));        // 
  
              return reqs;
            }
            function callSOAP(xmlData, soapAction, parseFn, onCannotFind, onHardError) {
              return Ext.Ajax.request({
                url: "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector",
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
                    if (/cannot\s+find/i.test(fault) || /não\s+(localizar|encontrar)/i.test(fault)) {
                      onCannotFind();
                    } else {
                      Ext.Msg.alert("Erro", fault);
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
                    if (/cannot\s+find/i.test(fault) || /não\s+(localizar|encontrar)/i.test(fault)) {
                      onCannotFind();
                    } else {
                      Ext.Msg.alert("Erro", fault);
                      if (onHardError) onHardError(fault);
                    }
                  } else {
                    onCannotFind();
                  }
                }
              });
            }
  
            function parseAssetDesc(text) {
              var xml = (new DOMParser()).parseFromString(text, "text/xml");
              return parseFirstChildText(xml, "http://schemas.datastream.net/MP_fields", "ASSETID", "DESCRIPTION");
            }
            function parseLocationDesc(text) {
              var xml = (new DOMParser()).parseFromString(text, "text/xml");
              return parseFirstChildText(xml, "http://schemas.datastream.net/MP_fields", "LOCATIONID", "DESCRIPTION");
            }
            function parseSystemDesc(text) {
              var xml = (new DOMParser()).parseFromString(text, "text/xml");
              return parseFirstChildText(xml, "http://schemas.datastream.net/MP_fields", "SYSTEMID", "DESCRIPTION");
            }
  
            function lookupSystem() {
              console.log("Tentando buscar como sistema:", equipmentCode.trim());
              var reqs = buildSystemRequests(equipmentCode);
              var i = 0;
  
              function nextSystem() {
                if (i >= reqs.length) {
                  Ext.Msg.alert('Aviso', 'Falha na consulta do sistema');
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
  
            function lookupLocation() {
              console.log("Tentando buscar como localização:", equipmentCode.trim());
              callSOAP(
                buildLocationRequest(equipmentCode),
                "http://schemas.datastream.net/MP_functions/MP0318_001/MP0318_GetLocation_001",
                parseLocationDesc,
                lookupSystem
              );
            }
  
            console.log("Tentando buscar como equipamento:", equipmentCode.trim());
            callSOAP(
              buildAssetRequest(equipmentCode),
              "http://schemas.datastream.net/MP_functions/MP0302_001/MP0302_GetAssetEquipment_001",
              parseAssetDesc,
              lookupLocation
            );
          }
        },
  
  // DEPARTAMENTOS
  '[extensibleFramework] [tabName=HDR] [name=udfchar05]': {
    customonblur: function () {
      var vFormPanel = EAM.Utils.getCurrentTab().getFormPanel();
      var deptCode = vFormPanel.getFldValue('udfchar05');
      if (!deptCode || deptCode.trim() === '') return;
  
      var tenant = "IBNQI1720580460_DEM";
      var organization = "*";
  
      function buildSoapRequest(departmentCode) {
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
        deptCodeElement.textContent = departmentCode.trim();
        deptID.appendChild(deptCodeElement);
  
        mpFunction.appendChild(deptID);
        body.appendChild(mpFunction);
        envelope.appendChild(body);
        xmlDoc.appendChild(envelope);
  
        return new XMLSerializer().serializeToString(xmlDoc);
      }
  
      function processResponse(response, fallbackCode) {
        try {
          var parser = new DOMParser();
          var responseXml = parser.parseFromString(response.responseText, "text/xml");
          var ns = "http://schemas.datastream.net/MP_fields";
  
          var unidadeElement = responseXml.getElementsByTagNameNS(ns, "UDFCHAR01");
          if (unidadeElement.length > 0 && unidadeElement[0].textContent.trim() !== '') {
            var unidadeCodigo = unidadeElement[0].textContent.trim();
  
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
                  var parser = new DOMParser();
                  var responseXml = parser.parseFromString(response.responseText, "text/xml");
                  var descricaoElement = responseXml.getElementsByTagNameNS(ns, "DESCRIPTION");
  
                  if (descricaoElement.length > 0 && descricaoElement[0].textContent.trim() !== '') {
                    vFormPanel.setFldValue('udfchar06', descricaoElement[0].textContent.trim(), true);
                  } else {
                    vFormPanel.setFldValue('udfchar06', unidadeCodigo, true);
                  }
                } catch (e) {
                  console.error("Erro ao processar resposta SOAP (unidade):", e);
                  vFormPanel.setFldValue('udfchar06', unidadeCodigo, true);
                }
              },
              failure: function () {
                console.error("Falha ao consultar unidade.");
                vFormPanel.setFldValue('udfchar06', unidadeCodigo, true);
              }
            });
          } else {
            var descricaoElement = responseXml.getElementsByTagNameNS(ns, "DESCRIPTION");
            if (descricaoElement.length > 0 && descricaoElement[0].textContent.trim() !== '') {
              vFormPanel.setFldValue('udfchar06', descricaoElement[0].textContent.trim(), true);
            } else {
              vFormPanel.setFldValue('udfchar06', fallbackCode, true);
            }
          }
        } catch (e) {
          console.error("Erro ao processar resposta SOAP (departamento):", e);
          vFormPanel.setFldValue('udfchar06', fallbackCode, true);
        }
      }
  
      var soapRequest = buildSoapRequest(deptCode);
  
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
          processResponse(response, deptCode.trim());
        },
        failure: function () {
          console.error("Falha ao consultar departamento.");
          vFormPanel.setFldValue('udfchar06', deptCode.trim(), true);
        }
      });
    }
  },
  
        // 
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
                      console.log(response);
                    } else {
                    }
                  } catch (e) {
                  }
                },
                failure: function () {
                }
              });
            });
          }
        }
  
      };
    }
  });
  