
import sys  # Importa funcionalidades do sistema (ex.: versão do Python, args)
import pandas  # Importa pandas (potencialmente para uso futuro; não usado aqui)
import config  # Importa módulo de configuração compartilhado
import requests  # Cliente HTTP para chamadas REST
import hxgn_eam as eam  # SDK/utilitários do HxGN EAM
import json  # Manipulação de JSON (serialização/desserialização)

if sys.version_info.major == 3 and sys.version_info.minor >= 10:  # Ajuste de compatibilidade para Python 3.10+
    import collections  # Importa collections para ajustar MutableMapping
    setattr(collections, "MutableMapping", collections.abc.MutableMapping)  # Redireciona MutableMapping para o novo local

# Prepara cabeçalhos e chama a API do EAM para obter detalhes da ordem de serviço
def prepare_req_data_and_call_eam_api(config):  # Define função utilitária que retorna o JSON da resposta
    # Obtém/define token de acesso à API REST do EAM
    config.token = eam.get_token(config)  # Salva o token dentro do objeto config
    # Define os cabeçalhos da requisição REST do EAM
    headers = {
        'accept': 'application/json',  # Solicita resposta em JSON
        'tenant': config.tenant,  # Identifica o tenant
        'organization': config.organization,  # Identifica a organização
        'Content-Type': 'application/json',  # Corpo no formato JSON
        'x-api-key': config.token  # Credencial/Bearer (conforme implementação do SDK)
    }
    # Monta o caminho para buscar dados de ordem de serviço (work order)
    data_path = "/workorders/" + str(config.workorderid) + "%23" + config.organization  # "%23" codifica '#'
    req_url = config.base_url + data_path  # URL completa da requisição
    response = requests.get(req_url, headers=headers)  # Executa requisição GET
    return response.json()  # Retorna o corpo já em dict (JSON desserializado)

def setParameters(request):  # Ajusta parâmetros a partir do ambiente ou do request
    eam.log("Begin processing parameters")  # Log inicial de processamento
    # Os valores abaixo são EXEMPLOS; o usuário deve configurar conforme o ambiente
    # Observação: parâmetros vazios não são enviados pelo EAM; para Studio e Flex, garanta valores
    #
    config.tenant = eam.get_tenant_id()               # Obtém tenant id do ambiente atual
    config.base_url = eam.get_base_url()              # Obtém URL base do serviço REST do EAM
         
    if __name__ == "__main__":  # Executando localmente (ex.: Python Studio)
        # Exemplos de valores a serem definidos durante execução local
        config.user = 'ACOSTA'                  # Usuário (exemplo)
        config.organization = 'C001'            # Organização (exemplo)
        config.workorderid = '13495'            # ID da ordem de serviço (exemplo)
        
    else:    # Executando no Flex Python Framework (parâmetros chegam via request)
        eam.log(f"request = {request}")  # Loga o request bruto
        if request is not None:  # Valida se há payload
            params = json.loads(request)  # Converte JSON de string para dict
            eam.log(f"parameters are: {params}")  # Loga os parâmetros interpretados
        else:  # Sem parâmetros, aborta execução
            eam.log("Request failed with missing request parameters!}")  # Log de erro
            sys.exit("Request failed with missing request parameters and exit!")  # Encerra o processo
        # Mapeia parâmetros recebidos pelo Flex para o objeto config
        config.user = params['PARAM1']              # Usuário vindo do request
        config.organization = params['PARAM2']      # Organização vinda do request
        config.workorderid = params['PARAM3']       # ID da ordem de serviço vinda do request

def main(request=None):  # Função principal; coordena leitura de parâmetros e chamada da API
    eam.log("Begin get work order details")  # Início do job
    # Lê parâmetros (local ou Flex, conforme ambiente)
    setParameters(request)  # Prepara config para a chamada
    # Chama a API REST do EAM para obter detalhes da ordem de serviço
    get_workorder = prepare_req_data_and_call_eam_api(config)  # Executa chamada e obtém JSON
    if len(get_workorder['ErrorAlert'])>0:  # Se houver erros retornados
        eam.log(f"Job completed with below errors for workorder: {config.workorderid}")  # Log contextual
        eam.log(f"ERROR: {get_workorder['ErrorAlert'][0]['Message']}")  # Log da primeira mensagem de erro
    else:  # Sem erros
        eam.log(f"Job Completed Successfully for workorder: {config.workorderid} and workorder details are as below.")  # Sucesso
        eam.log(get_workorder)  # Loga o payload completo de detalhes
     
    # Nada mais a fazer aqui; execução direta ocorre no guard ao final do arquivo

if __name__ == "__main__":  # Execução direta do arquivo
    # execute the script
    main()  # Invoca main sem request (modo local)