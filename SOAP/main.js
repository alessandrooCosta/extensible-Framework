/*
Exemplo básico SOAP em JavaScript — criar, enviar e processar
*/

// 1. Captura ou define o valor que será consultado
const codeToQuery = "udfchar03abc";

// 2. Cria um documento XML vazio
const xmlDoc = document.implementation.createDocument("", "", null);

// 3. Cria o Envelope SOAP e define namespace padrão
const envelope = xmlDoc.createElementNS("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");

// Adiciona namespaces usados no envelope
envelope.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
envelope.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");

// 4. Cria o Header SOAP
const header = xmlDoc.createElement("soapenv:Header");

// 4.1 Cria o nó de segurança com usuário e senha
const security = xmlDoc.createElement("wsse:Security");
security.setAttribute("xmlns:wsse", "http://schemas.xmlsoap.org/ws/2002/04/secext");

const usernameToken = xmlDoc.createElement("wsse:UsernameToken");
const username = xmlDoc.createElement("wsse:Username");
username.textContent = "SEU_USUARIO_AQUI";

const password = xmlDoc.createElement("wsse:Password");
password.textContent = "SUA_SENHA_AQUI";

usernameToken.appendChild(username);
usernameToken.appendChild(password);
security.appendChild(usernameToken);
header.appendChild(security);

// 4.2 Outros elementos do header, como organização e sessão
const sessionScenario = xmlDoc.createElement("SessionScenario");
sessionScenario.setAttribute("xmlns", "http://schemas.datastream.net/headers");
sessionScenario.textContent = "terminate";  // pode variar conforme o sistema
header.appendChild(sessionScenario);

const organization = xmlDoc.createElement("Organization");
organization.setAttribute("xmlns", "http://schemas.datastream.net/headers");
organization.textContent = "*";
header.appendChild(organization);

envelope.appendChild(header);

// 5. Cria o Body SOAP
const body = xmlDoc.createElement("soapenv:Body");

// 5.1 Cria o elemento da função, com atributos e namespace
const mpFunction = xmlDoc.createElement("MP0674_GetDescription_001");
mpFunction.setAttribute("xmlns", "http://schemas.datastream.net/MP_functions/MP0674_001");
mpFunction.setAttribute("verb", "Get");
mpFunction.setAttribute("noun", "Description");
mpFunction.setAttribute("version", "001");

// 5.2 Cria o elemento DESCRIPTIONID, com seu namespace
const descriptionID = xmlDoc.createElement("DESCRIPTIONID");
descriptionID.setAttribute("xmlns", "http://schemas.datastream.net/MP_fields");

// 5.3 Elementos filhos de DESCRIPTIONID
const entity = xmlDoc.createElement("ENTITY");
entity.textContent = "UDLV";  // sempre igual nesse contexto
descriptionID.appendChild(entity);

const descode = xmlDoc.createElement("DESCODE");
descode.textContent = codeToQuery; // valor passado na consulta
descriptionID.appendChild(descode);

const orgID = xmlDoc.createElement("ORGANIZATIONID");
orgID.setAttribute("entity", "User");

const orgCode = xmlDoc.createElement("ORGANIZATIONCODE");
orgCode.textContent = "*";  // padrão para organização
orgID.appendChild(orgCode);

descriptionID.appendChild(orgID);

const langID = xmlDoc.createElement("LANGUAGEID");
const langCode = xmlDoc.createElement("LANGUAGECODE");
langCode.textContent = "PT"; // idioma português
langID.appendChild(langCode);
descriptionID.appendChild(langID);

const type = xmlDoc.createElement("TYPE");
type.setAttribute("entity", "User");
const typeCode = xmlDoc.createElement("TYPECODE");
typeCode.textContent = "EVNT"; // tipo do código
type.appendChild(typeCode);
descriptionID.appendChild(type);

// 5.4 Junta tudo
mpFunction.appendChild(descriptionID);
body.appendChild(mpFunction);
envelope.appendChild(body);

// 6. Adiciona o envelope ao documento
xmlDoc.appendChild(envelope);

// 7. Serializa para string XML para enviar na requisição
const soapRequest = new XMLSerializer().serializeToString(xmlDoc);

// 8. Envia a requisição HTTP via AJAX (Exemplo usando fetch)
fetch("https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector", {
  method: "POST",
  headers: {
    "Content-Type": "text/xml; charset=utf-8",
    "SOAPAction": "http://schemas.datastream.net/MP_functions/MP0674_001/MP0674_GetDescription_001"
  },
  body: soapRequest
})
.then(response => response.text())
.then(str => {
  // 9. Faz o parse do XML retornado
  const parser = new DOMParser();
  const xmlResponse = parser.parseFromString(str, "text/xml");

  // 10. Busca o elemento TRANSLATEDTEXT no namespace certo
  const ns = "http://schemas.datastream.net/MP_fields";
  const translatedElements = xmlResponse.getElementsByTagNameNS(ns, "TRANSLATEDTEXT");

  if (translatedElements.length > 0) {
    const translatedText = translatedElements[0].textContent;
    console.log("Descrição encontrada:", translatedText);

    // Aqui você pode preencher o campo do formulário, por exemplo:
    // vFormPanel.setFldValue('udfchar07', translatedText, true);
  } else {
    console.log("Nenhuma descrição encontrada.");
  }
})
.catch(err => console.error("Erro na requisição SOAP:", err));


/*
Resumo prático do que acontece:
Você cria um XML SOAP conforme padrão.

No Header você passa a autenticação.

No Body você passa os dados da função e parâmetros no formato que o servidor espera (segundo o esquema XSD).

Envia a mensagem para o endpoint SOAP via POST.

Recebe a resposta XML.

Faz parse e extrai as informações desejadas.

Usa as informações para popular seu formulário ou interface.
*/