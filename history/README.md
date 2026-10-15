# Histórico relevante preservado

`source.bundle` contém o histórico Git filtrado dos componentes Meteo, antes das alterações de distribuição.
A filtragem conserva autores, datas e mensagens; os identificadores dos commits mudam por conterem árvores diferentes.
O repositório original e os seus ramos não são reescritos.

Para consultar: `git clone source.bundle meteo-history`.
O workflow Preserve imported history liga este histórico como segundo pai de um commit com a árvore atual,
sem substituir ficheiros nem reescrever os commits já publicados no novo repositório.
