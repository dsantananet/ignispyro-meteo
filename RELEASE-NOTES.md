# IgnisPyro Meteo 1.2.0-rc.5

Novo painel **Meteograma de incêndios · ponto específico**, para coordenadas livres ou para a estação selecionada: humidade relativa, temperatura, ponto de orvalho, precipitação, vento, rajadas e direção (superfície, 950 e 900 hPa), camada limite e CAPE, 72 horas em UTC, a partir do GFS Global via Open-Meteo. Inclui estimativas calculadas de humidade de equilíbrio do combustível fino, Índice de Haines e Hot-Dry-Windy. Exportação SVG e CSV com proveniência.

Previsão de grelha, não observação nem classe oficial de perigo. FWI horário e probabilidade de trovoada não estão incluídos. Windows x64: instalador e portátil. Android 8+: APK experimental. Online: https://dsantananet.github.io/ignispyro-meteo/.

---

# Versão anterior · 1.2.0-rc.4

Descrição dinâmica abaixo do tefigrama, baseada nos materiais de leitura de perfis e Haines fornecidos: curvas, gradiente térmico, Haines intermédio e C-Haines, CAPE/CIN e implicações para incêndios rurais. Cada descrição acompanha a estação e a hora UTC e identifica dados ausentes.

Haines e C-Haines calculados sobre GFS, sem caráter de produto oficial IPMA. Não atribui classe de risco, probabilidade de piroconvecção ou percentil de C-Haines sem climatologia local. A convenção de arredondamento do Haines discreto é indicada. Fórmulas e fontes documentadas no repositório.

Windows x64: instalador e portátil. Android 8+: APK experimental. Online: https://dsantananet.github.io/ignispyro-meteo/. LCL/LFC, trajetória de parcela e adiabáticas saturadas ainda indisponíveis; APK sem validação em dispositivo físico.
