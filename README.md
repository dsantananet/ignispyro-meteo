# IgnisPyro Meteo

<p align="center"><img src="img/IgnisPyro1.jpg" alt="IgnisPyro — identidade oficial do projeto" width="640"></p>

Aplicação meteorológica para consultar observações de estações em Portugal, explorar um mapa,
visualizar meteogramas ECMWF via Open-Meteo e exportar CSV/GeoJSON. Integra a estação
Aldeia do Bispo (IALDEI10) e mantém o Borda d’Água digital para agronomia. Não depende da linguagem FlameLang.

## Instalação para utilizadores

A versão experimental Windows x64 está publicada em [Releases](https://github.com/dsantananet/ignispyro-meteo/releases/tag/v1.2.0-rc.1), com instalador, ZIP portátil, instruções e SHA256.
Descarregue `IgnisPyroMeteo-…-windows-x64-setup.exe`, execute o assistente e abra IgnisPyroMeteo
no menu Iniciar. Python, Node.js e Git não são necessários.
O painel abre no navegador; mantenha a pequena janela IgnisPyro Meteo aberta.
Desinstalação: Definições → Aplicações → IgnisPyroMeteo.
O ZIP de código-fonte não é um instalador.

## Como utilizar

1. Clique em Atualizar IPMA e aguarde as observações.
2. Escolha variável, estação e horário; consulte mapa e meteogramas de temperatura, humidade, vento, rajadas, chuva, pressão, nebulosidade e ponto de orvalho.
3. Escolha uma estação, uma seleção ou todas, e carregue as previsões. No separador **Previsão de risco**, copie o boletim para análise de incêndios ou partilha no Telegram. Não são enviadas mensagens. Exporte observações em CSV/GeoJSON e previsões em CSV separado.
4. Feche a janela de controlo para terminar o servidor local.

## Requisitos e estado

Pacote candidato para Windows 10/11 x64 e navegador moderno. Usa apenas a interface local 127.0.0.1,
porta 8765; Internet é necessária para obter novas observações. Histórico guardado no navegador.
Instalação, dois arranques e desinstalação passaram num runner Windows novo e no Windows local, com os ficheiros descarregados da Release. Linux e macOS não foram testados.
![Painel com o logótipo e Aldeia do Bispo](docs/screenshots/meteo-windows.png)

## Funcionalidades e limitações

IPMA não requer chave. IALDEI10 integra a lista comum. Neste computador, a credencial fica no Gestor de Credenciais do Windows, fora do repositório e do instalador. A distribuição consulta também `data/aldeia.json`, atualizado pelo fluxo **Aldeia do Bispo observations**, que requer o segredo de repositório `WU_API_KEY`. Os agendamentos podem sofrer atrasos; a hora real da observação é sempre preservada.

**Adicionar estação pessoal** pede identificador e chave para cada nova ligação. A chave é usada em memória pelo servidor local e não é guardada no navegador. Chuva diária WU nunca é apresentada como chuva horária.

O boletim identifica calor, secura, vento e coincidências nas próximas 24 horas; os meteogramas cobrem 72 horas. O resumo nacional cobre as estações carregadas, não toda a superfície do país. Não calcula FWI oficial, não prevê propagação de incêndios e não substitui avisos oficiais, avaliação de combustível, relevo e condições no terreno. Dados em falta não são zeros.

Previsão [ECMWF via Open-Meteo](https://open-meteo.com/en/docs/ecmwf-api), com atribuição CC BY 4.0 e sujeita às condições/limites do serviço gratuito. Azul: observado; laranja tracejado: modelo. Valores passados do modelo não são observações nem previsões históricas arquivadas para validação. Modelo e WU usam UTC; a API IPMA não explicita o fuso das observações, pelo que o alinhamento UTC é provisório e indicado no painel. Não medir erros de previsão sem confirmar esse alinhamento.
O histórico permanece no navegador após desinstalar, para evitar apagar observações do utilizador.

## Para programadores

Python 3.12+ e Node.js 22 para testes. `python desktop.py` abre a aplicação.
`node --test tests/*.test.mjs`; `python -m unittest discover -s tests`.
Os testes de cifragem requerem `requirements-meteo-crypto.txt`.
Para compilar no Windows: instale `requirements-build.txt`, execute `python packaging/build.py`
e compile `packaging/windows.iss` com Inno Setup 6.7.3.
O guia [METEO.md](METEO.md) mantém detalhes históricos; os comandos de desenvolvimento não são necessários
para instalar o pacote autónomo. Conteúdos antigos sobre alojamento FlameLang devem ser revistos antes da migração pública.

## Novidades do candidato 1.2.0-rc.1

Separação do projeto, arranque gráfico, pacote Windows autónomo e restrição de acesso HTTP aos recursos do painel.
A versão candidata não é uma Release estável.

## Licença e contacto

Licença [MIT](LICENSE), conforme declaração original; [avisos](LEGAL-NOTICE.md). Leaflet conserva a licença original.
Contacto: [dsantananet](https://github.com/dsantananet); problemas em Issues deste repositório.

