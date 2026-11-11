# Esqueleto de slides (10–15 min) — todos os membros falam

1. **Problema (2 min)**: troca de cartas + "serve no meu deck?". Pergunta e tarefa (classificação binária de pares).
2. **Dados (1,5 min)**: Scryfall + MTGJSON; 206 → 178 decks (duplicatas!); 56.848 pares, 25% positivos.
3. **EDA (1,5 min)**: `eda_decks.png` (esqueleto dos decks) e `pares_classes.png` (negativos difíceis casam no CMC; edhrec separa).
4. **Features (1 min)**: carta / deck / interação; popularidade só com decks de treino.
5. **Protocolo anti-vazamento (1,5 min)**: divisão por deck, Pipeline, leave-one-deck-out; a história do vazamento do denominador.
6. **Modelos (0,5 min)**: baselines + LR, árvore, k-NN, NB, MLP; grades.
7. **Resultados CV (2 min)**: tabela + `cv_boxplot.png`.
8. **Teste e aplicação (2 min)**: curvas PR e matriz de confusão; top-10 recall 0,52 vs 0,28 do baseline.
9. **O que importa (1 min)**: importância por permutação + ablação de popularidade.
10. **Regra de remoção e demo (1 min)**: teste do intruso; vídeo/print do ManaScan avaliando uma carta.
11. **Conclusões e limitações (2 min)**: resposta à pergunta, limites do rótulo, próximos passos.
