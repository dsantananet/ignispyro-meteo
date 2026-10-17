# Bases da descrição do tefigrama

A leitura usa o perfil GFS da estação/hora, com dados ausentes preservados e níveis sob a superfície excluídos. Não é um diagnóstico observado, nem um produto oficial IPMA.

## Materiais fornecidos pelo utilizador

- METEO_AMANDA_CUNINGHAN.zip: apenas o documento Tefiagrama Exercise e a referência visual de tefigrama foram relevantes. O material EventGDB de cartografia de ocorrências não entra na interpretação meteorológica. O exercício fornece níveis de pressão e perguntas sobre gradiente, inversões, Haines e parcela.
- Skew T log - Know How.pptx: 3 diapositivos, crédito NAD-AIR / Marcos Campos, sobre curvas, LCL, LFC, CIN, CAPE, LI e nível de equilíbrio. Skew-T/log-p e tefigrama têm geometrias diferentes. A taxa da adiabática saturada não é constante. CIN é a integral da flutuabilidade negativa da parcela, não simplesmente a área entre LCL e LFC. CAPE convencional não é negativo; zero CAPE não exclui convecção do fogo. Não se usa a afirmação didática que liga diretamente ultrapassar o equilíbrio a pirocúmulo como regra de previsão.
- IPMA_02Haines.pdf: título Stability, Fire Behaviour and the Haines Index, 30 diapositivos. O nome do ficheiro não comprova autoria IPMA. Diapositivos 6–7 definem Haines e as variantes. Diapositivos 18–24 definem C-Haines, limites e o exemplo Black Saturday. Diapositivos 17, 26 e 29 salientam calibração/climatologia e leitura do perfil inteiro.

Não se republicam os anexos originais nem imagens dos materiais no repositório público.

## Haines intermédio

Variante fixa 850–700 hPa. Diferenças físicas sem arredondamento: D=T850−T700; M=T850−Td850. A tabela dos materiais apresenta graus inteiros. Esta implementação arredonda cada diferença ao inteiro mais próximo (Math.round; empate .5 para cima) antes da pontuação discreta: A=1 se D arredondado ≤5, A=2 se 6–10, A=3 se ≥11; B=1 se M arredondado ≤5, B=2 se 6–12, B=3 se ≥13. Expõe o arredondamento no texto. H=A+B. Não se calcula se os níveis estiverem ausentes/sob o terreno ou Td850>T850.

Verificação independente da tabela: NWS Western Region Technical Attachment 00-08, Haines Index Application for AWIPS, Mike Seaman, 08/08/2000: https://www.weather.gov/media/wrh/online_publications/TAs/ta0008.pdf.

## C-Haines

Sobre diferenças sem arredondamento: CA=0.5D−2; M limitado superiormente a 30 °C; CB=M/3−1; se CB>5, CB=5+0.5(CB−5). C-Haines=CA+CB. Usa-se 1/3 em vez da aproximação 0.3333 do diapositivo. Exemplo do material: T850=27, T700=13, Td850=−1: Haines=6 e C-Haines=11.6667. O valor ~13 citado no material não é adotado como limiar operacional português. Não se atribui percentil sem climatologia local.

## Limites da interpretação

A existência dos níveis acima da grelha não confirma adequação à maior orografia regional. Não se seleciona automaticamente uma variante pela altitude da estação. O gradiente 850–700 requer alturas geopotenciais válidas. Inversões exigem níveis originais adjacentes válidos. A camada inferior é 0–3000 m AGL do modelo. LCL/LFC/LI/EL e trajetória de parcela não são inferidos a partir dos campos escalares CAPE/CIN. A descrição não quantifica o risco operacional nem prevê piroconvecção.
