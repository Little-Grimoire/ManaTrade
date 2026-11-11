# RASCUNHO — Relatório TP FS26S (para a equipe reescrever)

> Rascunho de estrutura e números tirados do notebook (execução com random_state=42). **A redação final é da equipe**
> (a rubrica penaliza texto que é só colagem de saídas e relatório gerado inteiramente por IA). Trechos `[EQUIPE: ...]`
> devem ser escritos por vocês. Limite: 4–6 páginas sem capa e referências, fonte 11–12 pt.

## 1. Introdução
- Problema: na troca de cartas, saber se a carta recebida serve no deck Commander que se está montando.
- Pergunta: dado (deck, carta), a carta pertenceria ao deck? Classificação binária; a probabilidade vira score de adequação e alimenta uma regra de troca no app ManaTrade.
- [EQUIPE: relevância e motivação em 1 parágrafo]

## 2. Dados
- Scryfall Oracle Cards: 35.353 cartas (32.643 legais em Commander), 17 atributos. MTGJSON: 206 decks "Commander Deck" (178 após remover 28 duplicatas exatas; 100 cartas cada).
- Pares: 56.848 (14.212 positivos, 25%), com negativos difíceis 1:3 (mesma identidade, |ΔCMC| ≤ 1, mesmo grupo terreno/não terreno).
- Achados da EDA: ausências estruturais (power/toughness/loyalty); `edhrec_rank` muito assimétrico (usamos log); outliers de CMC legítimos (95 cartas com CMC ≥ 10); decks com esqueleto estável (38 ± 1,6 terrenos, 28 ± 5,9 criaturas, CMC médio 3,6); 68% das cartas aparecem em um único deck (cauda longa).
- Figuras sugeridas: `ml/notebooks/figures/eda_decks.png` e `pares_classes.png`.

## 3. Metodologia
- 97 features (carta, deck, interação) + `train_pop` (dentro do Pipeline). Tabela de justificativas: notebook, Seção 5.
- Anti-vazamento: holdout de 20% dos decks (`GroupShuffleSplit`); `GroupKFold(5)` por deck; Pipeline (popularidade de treino com leave-one-deck-out → imputação → padronização → modelo); deduplicação de decks; âncora compartilhada entre o positivo e seus negativos.
- Modelos e grades: notebook, Seção 8. Seleção por PR-AUC.
- [EQUIPE: contar o vazamento do denominador encontrado pela árvore; é ótimo material para a arguição]

## 4. Resultados
Validação cruzada (5 folds agrupados por deck, média ± desvio):

| Modelo | PR-AUC | ROC-AUC | F1 | Precisão | Revocação |
|---|---|---|---|---|---|
| MLP (64), α=0,01 | 0,761 ± 0,012 | 0,886 ± 0,006 | 0,658 ± 0,014 | 0,752 ± 0,017 | 0,586 ± 0,028 |
| Regressão logística (C=1) | 0,743 ± 0,009 | 0,874 ± 0,007 | 0,627 ± 0,007 | 0,765 ± 0,006 | 0,531 ± 0,011 |
| Árvore de decisão | 0,729 ± 0,012 | 0,869 ± 0,008 | 0,651 ± 0,007 | 0,563 ± 0,008 | 0,772 ± 0,016 |
| k-NN | 0,657 ± 0,010 | 0,810 ± 0,007 | 0,475 ± 0,021 | 0,798 ± 0,011 | 0,339 ± 0,023 |
| Baseline popularidade | 0,604 ± 0,013 | 0,807 ± 0,015 | 0,454 ± 0,010 | 0,661 ± 0,018 | 0,346 ± 0,010 |
| Naive Bayes | 0,570 ± 0,018 | 0,746 ± 0,017 | 0,413 ± 0,005 | 0,267 ± 0,002 | 0,919 ± 0,019 |
| Classe majoritária | 0,250 | 0,500 | 0,000 | 0,000 | 0,000 |

- Teste (36 decks nunca vistos), MLP: PR-AUC 0,763; ROC-AUC 0,888; F1 0,673; top-10 recall 0,522 (acaso 0,043); top-1 0,195 (acaso 0,004). Baseline de popularidade: top-10 = 0,282.
- Ablação (MLP, CV): sem `log_edhrec_rank` 0,725; sem `train_pop` 0,739; sem nenhuma popularidade 0,557.
- Regra de remoção (decks de teste): intruso dentro da cor = pior carta em 36,1% (acaso 1,3%) e entre as 5 piores em 58,3%; intruso fora da cor = pior em 27,3% (corrigido no app por regra de legalidade, DA07). Decisão com δ = 0,1: acurácia balanceada 0,815.
- Figuras: `cv_boxplot.png`, `teste_curvas_confusao.png`, `importancia.png`.

## 5. Discussão
[EQUIPE] Pontos que os dados sustentam: a MLP ganha pouco da regressão logística (+0,018 de PR-AUC, ~4x o custo de treino); a árvore tem a maior revocação, mas precisão baixa e é sensível a hiperparâmetros (amplitude de 0,075 na grade); o Naive Bayes viola independência e gaussianidade (prevê quase tudo positivo); o k-NN sofre com dimensionalidade. A popularidade é o sinal dominante (a ablação derruba a PR-AUC para 0,557), mas as features de interação acrescentam valor sobre o baseline. Limitações: rótulo = escolha do designer; falsos negativos no sorteio; temporalidade; possível vazamento externo do edhrec_rank; 178 decks.

## 6. Conclusão
[EQUIPE]

## 7. Declaração de uso de IA
[EQUIPE: ferramentas, para quê, o que foi aceito/recusado. Ex.: o assistente gerou o código e o vazamento do denominador foi detectado e corrigido durante a validação; a equipe revisou X, Y.]

## Referências
Scryfall API (https://scryfall.com/docs/api); MTGJSON (https://mtgjson.com); Pedregosa et al., Scikit-learn, JMLR 12, 2011; [EQUIPE: material da disciplina].
