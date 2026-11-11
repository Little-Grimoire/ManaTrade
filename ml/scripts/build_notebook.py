"""Gera ml/notebooks/manatrade_tp.ipynb.

O código dos módulos (ml/manatrade_ml/*.py) é embutido no notebook com %%writefile,
para que o notebook rode sozinho no Colab e o backend use exatamente o mesmo código.
Uso: python ml/scripts/build_notebook.py
"""
from pathlib import Path
import nbformat as nbf

ROOT = Path(__file__).resolve().parents[1]
cells = []


def md(s):
    cells.append(nbf.v4.new_markdown_cell(s.strip("\n")))


def code(s):
    cells.append(nbf.v4.new_code_cell(s.strip("\n")))


def module(name):
    src = (ROOT / "manatrade_ml" / name).read_text(encoding="utf-8")
    code(f"%%writefile manatrade_ml/{name}\n{src}")


# ---------------------------------------------------------------------------
md(r"""
# ManaTrade — Adequação de cartas a decks Commander
**FS26S — Fundamentos de Sistemas Inteligentes · UTFPR-DV · Projeto Prático (TP)**

Equipe: _preencher nomes_

**Problema (≤5 linhas).** Jogadores de Magic: The Gathering trocam cartas sem saber se a carta recebida serve no deck
que estão montando. Dado um deck de Commander e uma carta candidata, queremos **prever se a carta pertenceria ao deck**
usando apenas características da carta, do deck e da interação carta×deck. A probabilidade prevista vira um *score de
adequação* usado pelo app ManaTrade para sugerir trocas ("esta carta melhora o deck; remova X").

**Tarefa de ML:** classificação binária supervisionada. Instância = par (deck, carta candidata).

**Rótulo:** 1 se a carta está na lista oficial do deck; 0 se é legal em Commander, compatível com a identidade de cor do
deck, mas ausente dele (negativo "difícil", ver Seção 4).

**Limitação central (declarada desde já):** o modelo aprende *o que os designers/jogadores costumam incluir*, não a
verdade absoluta sobre o poder de uma carta. Um 0 significa "não foi escolhida", não "seria ruim".
""")

md(r"""
## 0. Sumário
1. Configuração e reprodutibilidade
2. Carregamento dos dados (Scryfall + MTGJSON)
3. Análise exploratória (EDA)
4. Definição do rótulo e construção dos pares com negativos difíceis
5. Engenharia de features (carta, deck, interação) e EDA das features
6. Protocolo experimental e prevenção de vazamento
7. Etapa 1: baseline + regressão logística (divisão treino/teste por deck)
8. Comparação de modelos com validação cruzada agrupada (k=5)
9. Avaliação no conjunto de teste, top-k recall e visualizações
10. Importância de features e ablação da popularidade
11. Regra de remoção e teste prático
12. Exportação do modelo (joblib)
13. Análise crítica, limitações e próximos passos
""")

# ---------------------------------------------------------------------------
md(r"""
## 1. Configuração e reprodutibilidade
Usamos apenas numpy, pandas, matplotlib, seaborn e scikit-learn. Toda aleatoriedade usa `random_state=42`.

O código de features fica num pequeno pacote `manatrade_ml`, gravado pelas células `%%writefile` abaixo. Isso permite
que **o mesmo código** seja usado aqui e no backend do aplicativo (que carrega o modelo exportado), evitando divergência
entre treino e produção.
""")
code(r"""
import os, sys, time, warnings
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import sklearn

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)
warnings.filterwarnings("ignore", category=FutureWarning)
from sklearn.exceptions import UndefinedMetricWarning
warnings.filterwarnings("ignore", category=UndefinedMetricWarning)  # baseline de classe majoritária não prevê positivos (precisão indefinida = 0)
sns.set_theme(style="whitegrid", context="notebook")
pd.set_option("display.max_columns", 60)
FIG_DIR = Path("figures"); FIG_DIR.mkdir(exist_ok=True)
Path("manatrade_ml").mkdir(exist_ok=True)
print("scikit-learn", sklearn.__version__, "| pandas", pd.__version__, "| numpy", np.__version__)
""")
module("__init__.py")
module("features.py")
module("pairs.py")
module("recommend.py")
code(r"""
import importlib, manatrade_ml
for m in ["manatrade_ml.features", "manatrade_ml.pairs", "manatrade_ml.recommend"]:
    if m in sys.modules: importlib.reload(sys.modules[m])
from manatrade_ml.features import (card_features, TrainPopularityEncoder, ColumnSelector, ROLES, COLORS, TYPES, KEYWORDS, BASIC_NAMES)
from manatrade_ml.pairs import dedup_and_group, make_pairs
from manatrade_ml.recommend import make_X, score_members, score_candidates
""")

# ---------------------------------------------------------------------------
md(r"""
## 2. Carregamento dos dados
| Fonte | Conteúdo | Licença / acesso |
|---|---|---|
| [Scryfall Bulk Data — *Oracle Cards*](https://scryfall.com/docs/api/bulk-data) | 1 linha por carta (atributos, texto de regras, `edhrec_rank`, legalidades) | gratuito, sem autenticação |
| [MTGJSON — Deck files](https://mtgjson.com/downloads/all-decks/) | listas oficiais de decks pré-montados; usamos os do tipo **Commander Deck** | gratuito, sem autenticação (MIT) |

Para garantir reprodutibilidade (o Scryfall é atualizado diariamente), entregamos junto ao notebook um **snapshot
compacto** gerado por `ml/scripts/build_dataset.py` a partir desses downloads públicos (snapshot de 10/11/2026):
`cards.csv.gz` e `commander_decks.csv.gz`. Se os arquivos não estiverem ao lado do notebook, a célula abaixo os baixa do
repositório do projeto (ajuste `DATA_URL` se necessário).
""")
code(r"""
DATA_URL = "https://raw.githubusercontent.com/Little-Grimoire/ManaTrade/main/ml/data/"
candidates = [Path("data"), Path("../data"), Path("ml/data")]
DATA_DIR = next((p for p in candidates if (p / "cards.csv.gz").exists()), None)
if DATA_DIR is None:
    import urllib.request
    DATA_DIR = Path("data"); DATA_DIR.mkdir(exist_ok=True)
    for f in ["cards.csv.gz", "commander_decks.csv.gz"]:
        urllib.request.urlretrieve(DATA_URL + f, DATA_DIR / f)
cards = pd.read_csv(DATA_DIR / "cards.csv.gz")
decks_raw = pd.read_csv(DATA_DIR / "commander_decks.csv.gz")
print("cartas:", cards.shape, "| linhas de decks:", decks_raw.shape, "| decks:", decks_raw.deck_id.nunique())
cards.head(3)
""")
code(r"""
decks_raw.head(3)
""")

# ---------------------------------------------------------------------------
md(r"""
## 3. Análise exploratória (EDA)
### 3.1 Catálogo de cartas
Primeiro olhamos tipos, ausentes e distribuições do catálogo inteiro; depois restringimos às cartas legais em Commander,
que formam o universo de candidatas.
""")
code(r"""
print(cards.dtypes.to_string())
print("\nLegalidade em Commander:\n", cards.legal_commander.value_counts().to_string())
missing = cards.isna().mean().sort_values(ascending=False)
missing[missing > 0].round(3).to_frame("fração ausente")
""")
md(r"""
**Leitura dos ausentes.** `power`/`toughness` faltam em todas as não-criaturas e `loyalty` em tudo que não é
planeswalker: são ausências **estruturais** (o atributo não se aplica), não erros. Vamos imputá-las dentro do Pipeline e
adicionar um indicador de ausência, que por si só carrega informação de tipo. `edhrec_rank` falta em ~7% das cartas
(cartas muito novas ou nunca usadas em Commander); `mana_cost` falta em terrenos. Nenhuma linha precisa ser descartada.
""")
code(r"""
legal = cards[cards.legal_commander == "legal"].copy()
legal["main_type"] = legal.type_line.fillna("").str.extract(
    r"(Creature|Land|Instant|Sorcery|Artifact|Enchantment|Planeswalker|Battle)", expand=False).fillna("Outro")
legal["n_ci"] = legal.color_identity.fillna("").str.len()
fig, ax = plt.subplots(1, 3, figsize=(16, 4))
sns.histplot(legal.cmc.clip(upper=12), bins=13, discrete=True, ax=ax[0]); ax[0].set_title("CMC (valores >12 agrupados em 12)")
legal.main_type.value_counts().plot.barh(ax=ax[1]); ax[1].set_title("Tipo principal (cartas legais)")
sns.histplot(np.log10(legal.edhrec_rank.dropna()), bins=40, ax=ax[2]); ax[2].set_title("log10(edhrec_rank)")
plt.tight_layout(); plt.savefig(FIG_DIR / "eda_cartas.png", dpi=150); plt.show()
legal[["cmc", "edhrec_rank", "n_ci"]].describe().T
""")
code(r"""
outl = legal[legal.cmc >= 10][["name", "cmc", "type_line"]].sort_values("cmc", ascending=False)
print(f"{len(outl)} cartas com CMC >= 10 (outliers):"); outl.head(8)
""")
md(r"""
**Outliers.** Há poucas cartas com CMC ≥ 10 (ex.: Draco, CMC 16; cartas "Un-" já foram filtradas pela legalidade).
São valores **legítimos** e raros, não erros, por isso não são removidos. Para reduzir sua influência em modelos
baseados em distância (k-NN) e na regressão logística, as features passam por `StandardScaler`, e também criamos
faixas de CMC no nível do deck (Seção 5). `edhrec_rank` é muito assimétrico (cauda até ~30 mil), então usamos
`log1p(edhrec_rank)`.
""")

md(r"""
### 3.2 Decks Commander
Cada deck oficial tem 100 cartas: comandante(s) + 99. Antes de qualquer coisa verificamos **duplicatas**: o MTGJSON
lista reedições (ex.: versões *Collector's Edition*) com exatamente as mesmas cartas. Se o mesmo deck caísse no treino e
no teste, o modelo seria avaliado num deck que já viu, o que é vazamento. Removemos as cópias exatas e agrupamos decks
muito parecidos (Jaccard ≥ 0,5) no mesmo grupo de validação.
""")
code(r"""
sizes = decks_raw.groupby("deck_id")["count"].sum()
print("cartas por deck:", sizes.describe()[["min", "max"]].to_dict())
print("decks com 2 comandantes (partner):", (decks_raw.groupby("deck_id").is_commander.sum() == 2).sum())
decks, groups = dedup_and_group(decks_raw, jaccard_threshold=0.5)
print(f"decks originais: {decks_raw.deck_id.nunique()} | após remover duplicatas exatas: {decks.deck_id.nunique()} "
      f"| grupos (Jaccard>=0.5): {groups.nunique()}")
decks_main = decks[decks.is_commander == 0].copy()
cards_by_id = cards.set_index("oracle_id")
cmd = decks[decks.is_commander == 1]
deck_ci = cmd.groupby("deck_id").oracle_id.apply(lambda s: "".join(c for c in "WUBRG" if c in "".join(cards_by_id.color_identity.reindex(s).fillna(""))))
card_ci = cards_by_id.color_identity.fillna("")
deck_meta = decks.drop_duplicates("deck_id").set_index("deck_id")[["deck_name", "release_date"]].assign(ci=deck_ci)
deck_meta.head()
""")
code(r"""
m = decks_main.merge(cards[["oracle_id", "cmc", "type_line"]], on="oracle_id")
m["is_land"] = m.type_line.str.contains("Land")
m["is_creature"] = m.type_line.str.contains("Creature")
per = m.groupby("deck_id").apply(lambda g: pd.Series({
    "terrenos": (g["count"] * g.is_land).sum(), "criaturas": (g["count"] * g.is_creature).sum(),
    "cmc_medio_nao_terreno": np.average(g.cmc[~g.is_land], weights=g["count"][~g.is_land])}), include_groups=False)
fig, ax = plt.subplots(1, 4, figsize=(18, 4))
deck_meta.ci.str.len().value_counts().sort_index().plot.bar(ax=ax[0]); ax[0].set_title("Nº de cores da identidade do deck")
pd.to_datetime(deck_meta.release_date).dt.year.value_counts().sort_index().plot.bar(ax=ax[1]); ax[1].set_title("Decks por ano")
sns.histplot(per.terrenos, ax=ax[2], bins=15); ax[2].set_title("Terrenos por deck")
sns.histplot(per.cmc_medio_nao_terreno, ax=ax[3], bins=15); ax[3].set_title("CMC médio (não terrenos)")
plt.tight_layout(); plt.savefig(FIG_DIR / "eda_decks.png", dpi=150); plt.show()
per.describe().T
""")
code(r"""
freq = decks_main.groupby("oracle_id").deck_id.nunique().sort_values(ascending=False)
top = freq.head(12).rename(index=cards_by_id.name)
print(f"cartas distintas nos decks: {len(freq)} | presentes em 1 único deck: {(freq == 1).mean():.0%}")
fig, ax = plt.subplots(1, 2, figsize=(14, 4))
top.sort_values().plot.barh(ax=ax[0]); ax[0].set_title("Cartas mais frequentes (nº de decks)")
sns.histplot(freq, bins=50, log_scale=(False, True), ax=ax[1]); ax[1].set_title("Nº de decks por carta (cauda longa)")
plt.tight_layout(); plt.savefig(FIG_DIR / "eda_frequencia.png", dpi=150); plt.show()
""")
md(r"""
**Achados da EDA que guiam decisões:**
- **Duplicatas de decks** existem e foram removidas (senão haveria vazamento entre treino e teste).
- Os decks seguem um **"esqueleto"** comum (~36–38 terrenos, ~30 criaturas, CMC médio ~3), e um núcleo de cartas
  aparece em quase todos (Sol Ring, Command Tower, Arcane Signet...). Por isso a **popularidade** é um preditor forte e
  é a base do nosso *baseline*. Mas ela precisa ser calculada **só com decks de treino** (Seção 6).
- A maioria das cartas aparece em **um único deck** (cauda longa): a popularidade não resolve tudo; as features de
  interação carta×deck precisam captar "encaixe".
- As identidades de cor são variadas (1 a 5 cores), então os negativos devem ser sorteados **dentro da identidade** de cada
  deck, senão a tarefa vira trivial ("a carta é de outra cor").
""")

# ---------------------------------------------------------------------------
md(r"""
## 4. Rótulo e construção dos pares (deck, carta)
- **Positivos:** cartas distintas dos 99 de cada deck, exceto terrenos básicos (presença trivial) e o comandante.
- **Negativos difíceis:** para cada positivo sorteamos **3** cartas (proporção 1:3) que sejam: legais em Commander;
  dentro da identidade de cor do deck; ausentes do deck; do mesmo grupo terreno/não terreno; com |ΔCMC| ≤ 1; e,
  preferencialmente, com a mesma identidade de cor do positivo. Negativos aleatórios seriam fáceis demais (o modelo
  aprenderia só "cor errada" ou "custo absurdo").
- **Âncora:** cada negativo guarda o positivo para o qual foi sorteado (`anchor_id`). Na hora de calcular as features
  do deck, a âncora é retirada do deck **tanto para o positivo quanto para seus 3 negativos**. A situação simulada é a
  da aplicação: "o deck tem uma vaga aberta; qual candidata ocupava essa vaga?".

> **Por que a âncora importa (vazamento encontrado durante o desenvolvimento).** Na primeira versão, só os positivos
> tinham a própria carta removida do deck (98 cartas) e os negativos viam 99. A árvore de decisão aprendeu o rótulo
> pelo *denominador* das proporções do deck e alcançou F1 alto demais para a PR-AUC que tinha. Com a âncora, positivo e
> negativos compartilham exatamente o mesmo contexto de deck.
""")
code(r"""
t0 = time.time()
pairs = make_pairs(decks, cards, deck_ci, neg_ratio=3, cmc_tol=1, seed=RANDOM_STATE)
print(f"pares: {len(pairs):,} | decks: {pairs.deck_id.nunique()} | positivos: {pairs.label.sum():,} "
      f"| taxa de positivos: {pairs.label.mean():.2%} | {time.time()-t0:.0f}s")
""")
code(r"""
chk = pairs.merge(cards[["oracle_id", "cmc", "rarity", "edhrec_rank"]], on="oracle_id")
fig, ax = plt.subplots(1, 3, figsize=(16, 4))
pairs.label.value_counts().rename({0: "0 (ausente)", 1: "1 (no deck)"}).plot.bar(ax=ax[0], rot=0); ax[0].set_title("Desbalanceamento 1:3")
sns.histplot(data=chk, x="cmc", hue="label", discrete=True, stat="density", common_norm=False, ax=ax[1]); ax[1].set_xlim(-0.5, 10); ax[1].set_title("CMC por classe (negativos casados)")
sns.histplot(data=chk, x=np.log10(chk.edhrec_rank), hue="label", stat="density", common_norm=False, ax=ax[2]); ax[2].set_title("log10(edhrec_rank) por classe")
plt.tight_layout(); plt.savefig(FIG_DIR / "pares_classes.png", dpi=150); plt.show()
""")
md(r"""
Os negativos têm a **mesma distribuição de CMC** dos positivos: o sorteio "difícil" funcionou e o CMC sozinho não
separa as classes. Já o `edhrec_rank` separa bem (positivos são mais populares). Isso é esperado, mas também é um alerta:
o `edhrec_rank` é calculado pelo EDHREC a partir de decks de usuários, que **podem incluir listas inspiradas nesses
mesmos precons**. Essa é uma fonte externa de vazamento que não conseguimos eliminar, só **medir** (ablação na
Seção 10). Como a classe positiva é minoritária (25%), **acurácia não é a métrica principal**: usamos PR-AUC, ROC-AUC,
F1, precisão e revocação.
""")

# ---------------------------------------------------------------------------
md(r"""
## 5. Engenharia de features
Todas as features abaixo são **determinísticas e não usam o rótulo**: dependem só do texto/atributos da carta e da
composição do deck (que, na aplicação, o usuário informa). Por isso podem ser calculadas antes da divisão sem vazamento.
A única feature que usa rótulos (popularidade nos decks de treino) é calculada **dentro do Pipeline**.

| Grupo | Features | Justificativa |
|---|---|---|
| Carta | `cmc`, `pip_W..G` (símbolos de mana por cor), `pip_generic`, `ci_W..G`, `n_ci` | custo e exigência de cor determinam se a carta é jogável no deck |
| Carta | `is_creature/instant/...`, `is_legendary` | decks têm proporções típicas por tipo |
| Carta | `power`, `toughness`, `loyalty` (+ indicador de ausência) | eficiência de criaturas/planeswalkers |
| Carta | `rarity` (ordinal), `n_keywords`, 15 palavras-chave binárias | raridade e habilidades evergreen indicam força/estilo |
| Carta | `role_*`: 12 papéis por regex no texto (ramp, compra, remoção, wipe, contra-mágica, tutor, tokens, recursão, proteção, ganho de vida, marcadores +1/+1, sacrifício) | todo deck Commander precisa de ramp/compra/remoção; versão leve e interpretável de "TF-IDF do texto" |
| Carta | `text_len`, `log_edhrec_rank` | complexidade; popularidade global externa (ver ablação) |
| Deck | `deck_mean_cmc`, `deck_cmcbin_*` (curva), `deck_pipshare_*` (distribuição de cores), `deck_frac_*` (tipos e papéis), `deck_n_ci` | contexto: o que o deck já tem |
| Interação | `int_pip_affinity` (símbolos da carta × cores do deck), `int_ci_fraction`, `int_ci_outside`, `int_cmc_diff`, `int_abs_cmc_diff` | encaixe de cor e de curva |
| Interação | `int_same_type_frac`, `int_same_role_frac`, `int_role_cosine` | a carta reforça o plano do deck? (similaridade de tags carta×deck) |
| Interação | `int_subtype_overlap` | sinergia tribal (ex.: Elfo num deck de Elfos) |
| Pipeline | `train_pop` | fração dos decks **de treino** compatíveis que usam a carta (leave-one-deck-out no treino) |
""")
code(r"""
t0 = time.time()
cf = card_features(cards)
X_all = make_X(pairs, cf, decks_main, deck_ci, card_ci)
y_all = pairs.label.values
g_all = pairs.deck_id.map(groups).values
ID_COLS = ["deck_id", "oracle_id", "card_ci", "deck_ci"]
FEATS = [c for c in X_all.columns if c not in ID_COLS]
print(f"X: {X_all.shape} ({len(FEATS)} features + {len(ID_COLS)} colunas de identificação) | {time.time()-t0:.0f}s")
X_all[FEATS].describe().T.head(12)
""")
code(r"""
show = ["log_edhrec_rank", "rarity", "int_pip_affinity", "int_same_role_frac", "int_role_cosine",
        "int_subtype_overlap", "int_abs_cmc_diff", "role_ramp", "role_draw", "role_removal", "n_keywords", "text_len"]
summary = X_all[show].groupby(y_all).mean().T.rename(columns={0: "média y=0", 1: "média y=1"})
summary["diferença padronizada"] = (summary["média y=1"] - summary["média y=0"]) / X_all[show].std()
display(summary.sort_values("diferença padronizada").round(3))
num = X_all[FEATS].select_dtypes("number")
corr = num.loc[:, num.std() > 0].corr()
top_feats = corr.abs().sum().sort_values(ascending=False).head(25).index
plt.figure(figsize=(12, 9)); sns.heatmap(corr.loc[top_feats, top_feats], cmap="vlag", center=0)
plt.title("Correlação entre as 25 features mais correlacionadas"); plt.tight_layout(); plt.savefig(FIG_DIR / "correlacao.png", dpi=150); plt.show()
""")
md(r"""
**Leitura.** Positivos são mais populares (menor `log_edhrec_rank`), mais raros, exercem papéis que o deck já usa
(`int_same_role_frac` e `int_role_cosine` maiores) e compartilham subtipos (tribal). Ramp e compra aparecem mais nos
positivos, o que é coerente com o "esqueleto" de Commander. A correlação mostra blocos esperados (ex.: `pip_X` × `ci_X`,
`power` × `toughness`, frações do deck entre si). São redundâncias que afetam o Naive Bayes (que supõe independência),
mas não a árvore e pouco a regressão logística regularizada.
""")

# ---------------------------------------------------------------------------
md(r"""
## 6. Protocolo experimental e prevenção de vazamento
1. **Divisão por deck, não por linha.** `GroupShuffleSplit` separa 20% dos *grupos de decks* para **teste final**
   (nunca usados em seleção de modelo). A validação cruzada usa `GroupKFold(k=5, shuffle=True)` nos 80% restantes.
   Dividir por linha poria o mesmo deck no treino e no teste, e o modelo "decoraria" o deck.
2. **Tudo que é aprendido fica dentro do `Pipeline`**: popularidade de treino → imputação (mediana + indicador) →
   padronização → modelo. Logo, médias, desvios e popularidade são recalculados em cada fold só com dados de treino.
3. **Popularidade sem decks de teste**: `TrainPopularityEncoder` conta só os decks de treino; nas linhas de treino usa
   *leave-one-deck-out* para que a feature não contenha o rótulo da própria linha.
4. `random_state=42` em divisões, sorteio de negativos e modelos.
""")
code(r"""
from sklearn.model_selection import GroupShuffleSplit, GroupKFold, GridSearchCV, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, FunctionTransformer
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (precision_score, recall_score, f1_score, roc_auc_score, average_precision_score,
                             accuracy_score, confusion_matrix, ConfusionMatrixDisplay, PrecisionRecallDisplay, RocCurveDisplay)

gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE)
tr_idx, te_idx = next(gss.split(X_all, y_all, groups=g_all))
X_tr, X_te, y_tr, y_te = X_all.iloc[tr_idx], X_all.iloc[te_idx], y_all[tr_idx], y_all[te_idx]
g_tr = g_all[tr_idx]
assert set(g_all[tr_idx]).isdisjoint(g_all[te_idx]), "deck no treino e no teste!"
print(f"treino: {len(X_tr):,} linhas / {len(set(g_tr))} decks | teste: {len(X_te):,} linhas / {len(set(g_all[te_idx]))} decks")
print(f"taxa de positivos treino={y_tr.mean():.3f} teste={y_te.mean():.3f}")

def make_pipeline(model, columns=None):
    # columns=None -> todas as features; senão, mantém só as colunas listadas (após a popularidade)
    return Pipeline([("pop", TrainPopularityEncoder()), ("select", ColumnSelector(columns)),
                     ("impute", SimpleImputer(strategy="median", add_indicator=True)),
                     ("scale", StandardScaler()), ("model", model)])

cv = GroupKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
SCORING = {"pr_auc": "average_precision", "roc_auc": "roc_auc", "f1": "f1", "precision": "precision",
           "recall": "recall", "accuracy": "accuracy"}
""")

# ---------------------------------------------------------------------------
md(r"""
## 7. Etapa 1: baseline e primeiro modelo (regressão logística)
**Baselines (referência mínima):**
- *Classe majoritária* (`DummyClassifier`): mostra por que acurácia engana (≈75% sem aprender nada).
- *Popularidade global* (opção B do planejamento): regressão logística usando **apenas** `log_edhrec_rank`, ou seja,
  "sugira as cartas mais populares". Qualquer modelo útil precisa superar esse ranking.

**Primeiro modelo:** regressão logística com todas as features. Linear, rápida e interpretável (coeficientes).
""")
code(r"""
def evaluate(model, X, y, name):
    proba = model.predict_proba(X)[:, 1]; pred = (proba >= 0.5).astype(int)
    return {"modelo": name, "PR-AUC": average_precision_score(y, proba), "ROC-AUC": roc_auc_score(y, proba),
            "F1": f1_score(y, pred, zero_division=0), "precisão": precision_score(y, pred, zero_division=0),
            "revocação": recall_score(y, pred), "acurácia": accuracy_score(y, pred)}

etapa1 = {
    "Baseline: classe majoritária": make_pipeline(DummyClassifier(strategy="most_frequent")),
    "Baseline: popularidade (edhrec_rank)": make_pipeline(LogisticRegression(), columns=["log_edhrec_rank"]),
    "Regressão logística (todas)": make_pipeline(LogisticRegression(max_iter=3000, random_state=RANDOM_STATE)),
}
rows = []
for name, pipe in etapa1.items():
    pipe.fit(X_tr, y_tr); rows.append(evaluate(pipe, X_te, y_te, name))
pd.DataFrame(rows).set_index("modelo").round(3)
""")
md(r"""
Interpretação (treino/teste simples, por deck): a classe majoritária tem acurácia ~0,75 e F1 = 0, a prova de que
acurácia é inadequada aqui. A popularidade sozinha já ordena bem as cartas (ROC-AUC alto). A regressão logística com
todas as features deve superá-la em PR-AUC; o quanto supera mede o valor das features de deck e interação. Os números
definitivos vêm da validação cruzada (Seção 8), que é menos sensível a um único sorteio de decks.
""")

# ---------------------------------------------------------------------------
md(r"""
## 8. Comparação de modelos com validação cruzada agrupada (k=5)
Modelos: **3+ clássicos vistos em aula** (regressão logística, árvore de decisão, k-NN, Naive Bayes) + **MLP**, mais os
baselines. Cada modelo tem uma grade pequena de hiperparâmetros escolhida por `GridSearchCV` com o **mesmo**
`GroupKFold(5)` (critério: PR-AUC). Reportamos média ± desvio-padrão nos 5 folds para a melhor configuração.

| Modelo | Hiperparâmetros explorados | Por quê |
|---|---|---|
| Regressão logística | `C` ∈ {0,01; 0,1; 1; 10}, `class_weight` ∈ {None, balanced} | regularização; peso de classe para o desbalanceamento |
| Árvore de decisão | `max_depth` ∈ {4, 6, 8, 12}, `min_samples_leaf` ∈ {20, 100}, `class_weight` | controle de sobreajuste |
| k-NN | `n_neighbors` ∈ {15, 51, 101}, `weights` ∈ {uniform, distance} | vizinhanças maiores suavizam ruído |
| Naive Bayes (Gaussiano) | `var_smoothing` ∈ {1e-9, 1e-6, 1e-3} | estabilidade numérica |
| MLP | `hidden_layer_sizes` ∈ {(64,), (64, 32)}, `alpha` ∈ {1e-4, 1e-2}; `early_stopping` | capacidade × regularização |

Random Forest **não** é usado (não visto em aula / sem confirmação do professor). SVM ficou fora por custo
(kernel RBF é O(n²) com ~45 mil linhas) e prazo.
""")
code(r"""
models = {
    "Regressão logística": (LogisticRegression(max_iter=3000, random_state=RANDOM_STATE),
                            {"model__C": [0.01, 0.1, 1, 10], "model__class_weight": [None, "balanced"]}),
    "Árvore de decisão": (DecisionTreeClassifier(random_state=RANDOM_STATE),
                          {"model__max_depth": [4, 6, 8, 12], "model__min_samples_leaf": [20, 100], "model__class_weight": [None, "balanced"]}),
    "k-NN": (KNeighborsClassifier(), {"model__n_neighbors": [15, 51, 101], "model__weights": ["uniform", "distance"]}),
    "Naive Bayes": (GaussianNB(), {"model__var_smoothing": [1e-9, 1e-6, 1e-3]}),
    "MLP": (MLPClassifier(early_stopping=True, max_iter=300, random_state=RANDOM_STATE),
            {"model__hidden_layer_sizes": [(64,), (64, 32)], "model__alpha": [1e-4, 1e-2]}),
}
searches, cv_rows = {}, []
for name, (est, grid) in models.items():
    t0 = time.time()
    gs = GridSearchCV(make_pipeline(est), grid, scoring=SCORING, refit="pr_auc", cv=cv, n_jobs=-1)
    gs.fit(X_tr, y_tr, groups=g_tr)
    searches[name] = gs
    i = gs.best_index_; r = gs.cv_results_
    row = {"modelo": name, "melhores hiperparâmetros": {k.replace("model__", ""): v for k, v in gs.best_params_.items()},
           "tempo médio de treino (s)": r["mean_fit_time"][i]}
    for k in SCORING:
        row[k] = f'{r[f"mean_test_{k}"][i]:.3f} ± {r[f"std_test_{k}"][i]:.3f}'
        row["_" + k] = r[f"mean_test_{k}"][i]
    cv_rows.append(row); print(f"{name}: {time.time()-t0:.0f}s")

for name, pipe in [("Baseline: classe majoritária", etapa1["Baseline: classe majoritária"]),
                   ("Baseline: popularidade (edhrec_rank)", etapa1["Baseline: popularidade (edhrec_rank)"])]:
    r = cross_validate(pipe, X_tr, y_tr, groups=g_tr, cv=cv, scoring=SCORING, n_jobs=-1)
    row = {"modelo": name, "melhores hiperparâmetros": "-", "tempo médio de treino (s)": r["fit_time"].mean()}
    for k in SCORING:
        row[k] = f'{r[f"test_{k}"].mean():.3f} ± {r[f"test_{k}"].std():.3f}'; row["_" + k] = r[f"test_{k}"].mean()
    cv_rows.append(row)
cv_table = pd.DataFrame(cv_rows).set_index("modelo").sort_values("_pr_auc", ascending=False)
cv_table.to_csv(FIG_DIR / "tabela_cv.csv")
cv_table[["pr_auc", "roc_auc", "f1", "precision", "recall", "accuracy", "tempo médio de treino (s)", "melhores hiperparâmetros"]]
""")
code(r"""
long = []
for name, gs in searches.items():
    i = gs.best_index_
    for f in range(5):
        long.append({"modelo": name, "PR-AUC": gs.cv_results_[f"split{f}_test_pr_auc"][i]})
long = pd.DataFrame(long)
plt.figure(figsize=(9, 4))
sns.boxplot(data=long, x="PR-AUC", y="modelo", order=long.groupby("modelo")["PR-AUC"].mean().sort_values(ascending=False).index)
pop_cv = cv_table.loc["Baseline: popularidade (edhrec_rank)", "_pr_auc"]
plt.axvline(pop_cv, ls="--", c="k", label=f"baseline popularidade ({pop_cv:.3f})"); plt.axvline(0.25, ls=":", c="gray", label="acaso (taxa de positivos)")
plt.legend(loc="lower left"); plt.title("PR-AUC nos 5 folds agrupados por deck"); plt.tight_layout()
plt.savefig(FIG_DIR / "cv_boxplot.png", dpi=150); plt.show()
""")
code(r"""
# Sensibilidade a hiperparâmetros: variação de PR-AUC média entre as configurações da grade
sens = pd.DataFrame([{"modelo": n, "PR-AUC mínima na grade": gs.cv_results_["mean_test_pr_auc"].min(),
                      "PR-AUC máxima na grade": gs.cv_results_["mean_test_pr_auc"].max()} for n, gs in searches.items()])
sens["amplitude"] = sens["PR-AUC máxima na grade"] - sens["PR-AUC mínima na grade"]
sens.set_index("modelo").round(3)
""")

# ---------------------------------------------------------------------------
md(r"""
## 9. Avaliação no conjunto de teste (decks nunca vistos)
Cada melhor configuração é re-treinada em todo o treino e avaliada uma única vez nos decks de teste.

**Métrica de aplicação: top-k recall.** Para cada deck de teste e cada carta real escondida (positivo), ordenamos
essa carta junto com **todos os negativos do mesmo deck**; acerto se ela ficar entre as *k* melhores. Isso simula "o
usuário pergunta o que falta no deck e o app sugere *k* cartas". Comparamos com o acaso, que é *k*/(nº de candidatas).
""")
code(r"""
best_models = {n: gs.best_estimator_ for n, gs in searches.items()}
best_models["Baseline: popularidade (edhrec_rank)"] = etapa1["Baseline: popularidade (edhrec_rank)"]
test_proba = {n: m.predict_proba(X_te)[:, 1] for n, m in best_models.items()}

def topk_recall(proba, y, decks_ids, k=10):
    df = pd.DataFrame({"p": proba, "y": y, "d": decks_ids}); hits = []; chance = []
    for _, g in df.groupby("d"):
        negs = np.sort(g.p[g.y == 0].values)[::-1]
        for p in g.p[g.y == 1]:
            rank = 1 + np.searchsorted(-negs, -p, side="left")  # nº de negativos com score maior + 1
            hits.append(rank <= k); chance.append(min(k / (len(negs) + 1), 1))
    return np.mean(hits), np.mean(chance)

deck_te = X_te.deck_id.values
rows = []
for n, p in test_proba.items():
    r = evaluate(best_models[n], X_te, y_te, n)
    for k in (1, 10, 25):
        r[f"top-{k} recall"], ch = topk_recall(p, y_te, deck_te, k); r[f"acaso top-{k}"] = ch
    rows.append(r)
test_table = pd.DataFrame(rows).set_index("modelo").sort_values("PR-AUC", ascending=False)
test_table.round(3).to_csv(FIG_DIR / "tabela_teste.csv")
test_table.round(3)
""")
code(r"""
best_name = cv_table.drop(index=[i for i in cv_table.index if i.startswith("Baseline")])["_pr_auc"].idxmax()
print("Melhor modelo pela PR-AUC da validação cruzada:", best_name)
fig, ax = plt.subplots(1, 3, figsize=(18, 5))
for n, p in test_proba.items():
    PrecisionRecallDisplay.from_predictions(y_te, p, name=n, ax=ax[0])
    RocCurveDisplay.from_predictions(y_te, p, name=n, ax=ax[1])
ax[0].axhline(y_te.mean(), ls=":", c="gray"); ax[0].set_title("Curva precisão-revocação (teste)"); ax[1].set_title("Curva ROC (teste)")
ConfusionMatrixDisplay.from_predictions(y_te, (test_proba[best_name] >= 0.5).astype(int), ax=ax[2],
                                        display_labels=["fora", "no deck"], cmap="Blues")
ax[2].set_title(f"Matriz de confusão — {best_name} (limiar 0,5)")
plt.tight_layout(); plt.savefig(FIG_DIR / "teste_curvas_confusao.png", dpi=150); plt.show()
""")

# ---------------------------------------------------------------------------
md(r"""
## 10. Importância de features e ablação da popularidade
- **Importância por permutação** (no conjunto de teste) para o melhor modelo: quanto a PR-AUC cai ao embaralhar cada
  feature. Vale para qualquer modelo, inclusive a MLP.
- **Ablação:** re-treinamos o melhor modelo **sem** `log_edhrec_rank` (popularidade externa, potencialmente
  contaminada pelos próprios precons) e **sem** `train_pop`, para medir quanto do resultado depende de popularidade e
  quanto vem do "encaixe" carta×deck.
""")
code(r"""
from sklearn.inspection import permutation_importance
best = best_models[best_name]
# a permutação é feita após o encoder de popularidade, sobre a matriz de features já com train_pop
Xt_te = best.named_steps["pop"].transform(X_te)
rest = Pipeline(best.steps[1:])
pi = permutation_importance(rest, Xt_te, y_te, scoring="average_precision", n_repeats=5, random_state=RANDOM_STATE, n_jobs=-1)
imp = pd.Series(pi.importances_mean, index=Xt_te.columns).sort_values(ascending=False).head(15)
plt.figure(figsize=(8, 5)); imp.sort_values().plot.barh(); plt.xlabel("queda média de PR-AUC")
plt.title(f"Importância por permutação — {best_name} (teste)"); plt.tight_layout(); plt.savefig(FIG_DIR / "importancia.png", dpi=150); plt.show()
""")
code(r"""
lr_best = best_models["Regressão logística"]
coef = pd.Series(lr_best.named_steps["model"].coef_[0],
                 index=lr_best.named_steps["impute"].get_feature_names_out(Xt_te.columns))
print("Regressão logística: maiores coeficientes (features padronizadas)")
pd.concat([coef.sort_values().head(8), coef.sort_values().tail(8)]).round(3).to_frame("coef")
""")
code(r"""
abl_rows = []
all_cols = list(best.named_steps["pop"].transform(X_tr.head(5)).columns)
variants = {"todas as features": None,
            "sem log_edhrec_rank": [c for c in all_cols if c != "log_edhrec_rank"],
            "sem train_pop": [c for c in all_cols if c != "train_pop"],
            "sem nenhuma popularidade": [c for c in all_cols if c not in ("log_edhrec_rank", "train_pop")]}
best_est = best.named_steps["model"]
for v, cols in variants.items():
    from sklearn.base import clone
    pipe = make_pipeline(clone(best_est), columns=cols)
    r = cross_validate(pipe, X_tr, y_tr, groups=g_tr, cv=cv, scoring={"pr_auc": "average_precision", "roc_auc": "roc_auc"}, n_jobs=-1)
    abl_rows.append({"variante": v, "PR-AUC (CV)": f'{r["test_pr_auc"].mean():.3f} ± {r["test_pr_auc"].std():.3f}',
                     "ROC-AUC (CV)": f'{r["test_roc_auc"].mean():.3f} ± {r["test_roc_auc"].std():.3f}'})
pd.DataFrame(abl_rows).set_index("variante")
""")

# ---------------------------------------------------------------------------
md(r"""
## 11. Regra de remoção e teste prático
**Regra:** score(c) = p(c pertence ao deck). Dada a candidata *C* e o deck *D*:
calcula-se score(*x*) para cada *x* ∈ *D*, excluindo terrenos básicos, o comandante e cartas travadas pelo usuário.
Cada *x* é avaliado com o deck **sem ele mesmo** (mesma situação do treino). Seja pior = argmin score(*x*):
se score(*C*) > score(pior) + δ → "Melhora o deck. Remova: pior"; senão → "Não melhora".

**Teste prático (decks de teste, nunca vistos):** em cada deck retiramos uma carta não-terreno real *r* e colocamos um
**intruso** *i*, de dois tipos: (a) **fora da identidade de cor** do deck; (b) **dentro da cor**, carta legal
qualquer ausente do deck (intruso mais sutil). Medimos:
1. **Detecção do intruso:** taxa de vezes em que o pior do deck é o intruso (top-1) ou está entre os 5 piores
   (top-5), comparada ao acaso.
2. **Decisão de troca com δ:** oferecer *r* de volta ao deck com intruso deveria resultar em "Melhora" (positivo);
   oferecer uma carta aleatória dentro da cor ao deck original deveria resultar em "Não melhora" (negativo).

**Escolha de δ:** feita **sem tocar nos decks de teste**. Separamos 20% dos grupos de treino como validação,
re-treinamos o melhor modelo nos 80% restantes, simulamos as trocas na validação e escolhemos o δ que maximiza a
acurácia balanceada da decisão. Um δ > 0 exige margem mínima antes de recomendar uma troca, porque uma troca tem custo
real para o usuário e o score tem ruído.
""")
code(r"""
from sklearn.base import clone
legal_nonland = cards[(cards.legal_commander == "legal") & ~cards.type_line.fillna("").str.contains("Land")].copy()
legal_nonland["ci"] = legal_nonland.color_identity.fillna("")
is_land = cf["is_land"]

def simulate(model, deck_ids, seed=RANDOM_STATE):
    rng = np.random.default_rng(seed)
    mods, info, cand_rows = [], [], []
    for d in deck_ids:
        dm = decks_main[decks_main.deck_id == d]
        ci_d = set(deck_ci[d]); in_deck = set(dm.oracle_id)
        members = [o for o in dm.oracle_id.unique() if is_land.get(o, 1) == 0]
        r = members[rng.integers(len(members))]
        inside = legal_nonland[legal_nonland.ci.map(lambda s: set(s) <= ci_d) & ~legal_nonland.oracle_id.isin(in_deck)]
        outside = legal_nonland[~legal_nonland.ci.map(lambda s: set(s) <= ci_d)]
        control = inside.oracle_id.values[rng.integers(len(inside))]
        cand_rows.append({"deck_id": d, "oracle_id": control, "kind": "controle"})
        for kind, pool in (("fora_da_cor", outside), ("dentro_da_cor", inside)):
            if len(pool) == 0: continue  # deck de 5 cores não tem intruso "fora da cor"
            i = pool.oracle_id.values[rng.integers(len(pool))]
            nd = f"{d}__{kind}"
            mod = pd.concat([dm[dm.oracle_id != r], pd.DataFrame({"deck_id": [d], "oracle_id": [i], "count": [1]})]).assign(deck_id=nd)
            mods.append(mod); info.append({"deck": nd, "orig": d, "kind": kind, "removed": r, "intruder": i})
            cand_rows.append({"deck_id": nd, "oracle_id": r, "kind": "real_de_volta"})
    mods = pd.concat(mods); info = pd.DataFrame(info)
    dci = pd.concat([deck_ci, pd.Series({row.deck: deck_ci[row.orig] for row in info.itertuples()})])
    all_decks = pd.concat([decks_main[decks_main.deck_id.isin(deck_ids)], mods])
    members_sc = score_members(model, cf, all_decks, dci, card_ci)
    cands = pd.DataFrame(cand_rows)
    cands["score"] = score_candidates(model, cf, all_decks, dci, card_ci, cands)
    worst = members_sc.loc[members_sc.groupby("deck_id").score.idxmin()].set_index("deck_id")
    ranks = members_sc.assign(r=members_sc.groupby("deck_id").score.rank(method="first")).set_index(["deck_id", "oracle_id"]).r
    info["rank_intruso"] = [ranks[(row.deck, row.intruder)] for row in info.itertuples()]
    info["n_avaliadas"] = info.deck.map(members_sc.groupby("deck_id").size())
    cands["pior_score"] = cands.deck_id.map(worst.score)
    return info, cands

def decide(cands, delta):
    improves = cands.score > cands.pior_score + delta
    should = cands.kind == "real_de_volta"
    tpr = improves[should].mean(); tnr = (~improves[~should]).mean()
    return (tpr + tnr) / 2, tpr, tnr

# --- escolha de delta: validação dentro do treino ---
inner = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE)
fit_i, val_i = next(inner.split(X_tr, y_tr, groups=g_tr))
model_fit = clone(best).fit(X_tr.iloc[fit_i], y_tr[fit_i])
val_decks = sorted(set(X_tr.deck_id.values[val_i]))
_, cands_val = simulate(model_fit, val_decks)
deltas = np.round(np.arange(-0.2, 0.41, 0.02), 2)
dres = pd.DataFrame([dict(zip(["delta", "acurácia balanceada", "taxa 'melhora' (real de volta)", "taxa 'não melhora' (controle)"], (d, *decide(cands_val, d)))) for d in deltas])
DELTA = float(dres.loc[dres["acurácia balanceada"].idxmax(), "delta"])
print(f"δ escolhido na validação: {DELTA}")
plt.figure(figsize=(7, 3.5)); plt.plot(dres.delta, dres.iloc[:, 1:], marker="o", ms=3); plt.legend(dres.columns[1:], fontsize=8)
plt.axvline(DELTA, ls="--", c="k"); plt.xlabel("δ"); plt.title("Escolha de δ (decks de validação)"); plt.tight_layout()
plt.savefig(FIG_DIR / "delta.png", dpi=150); plt.show()
""")
code(r"""
test_decks = sorted(set(deck_te))
info_te, cands_te = simulate(best, test_decks)
rows = []
for kind, g in info_te.groupby("kind"):
    rows.append({"intruso": kind, "decks": len(g), "intruso = pior (top-1)": (g.rank_intruso == 1).mean(),
                 "intruso entre 5 piores": (g.rank_intruso <= 5).mean(),
                 "acaso top-1": (1 / g.n_avaliadas).mean(), "acaso top-5": (5 / g.n_avaliadas).mean(),
                 "posição mediana do intruso": g.rank_intruso.median()})
display(pd.DataFrame(rows).set_index("intruso").round(3))
ba, tpr, tnr = decide(cands_te, DELTA)
print(f"Decisão com δ={DELTA} nos decks de teste: acurácia balanceada={ba:.3f} | "
      f"'melhora' quando a carta real volta={tpr:.3f} | 'não melhora' para carta aleatória={tnr:.3f}")
""")
md(r"""
**Leitura do teste prático.** O intruso *fora da cor* é, de forma contraintuitiva, detectado **pior** que o intruso
*dentro da cor*. A explicação vem dos dados: por construção, **nenhuma** linha de treino tem carta fora da identidade
do deck (positivos são legais e negativos foram sorteados dentro da cor). As features `int_ci_outside` e
`int_ci_fraction` ficam constantes ou quase constantes no treino, e o modelo nunca aprendeu o que fazer com elas. É um
caso clássico de **entrada fora da distribuição**. Em Commander uma carta fora da identidade é **ilegal**, então isso
não deve ser decidido por ML: no backend aplicamos uma **regra determinística de legalidade antes do modelo** (carta
ilegal → "não pode entrar"; carta ilegal já no deck → é a primeira a sair). O ML fica para o que é de fato incerto:
escolher entre cartas legais.
""")
code(r"""
# Exemplo legível de recomendação (primeiro deck de teste, intruso dentro da cor)
ex = info_te[info_te.kind == "dentro_da_cor"].iloc[0]
c = cands_te[(cands_te.deck_id == ex.deck)].iloc[0]
print(f"Deck: {deck_meta.deck_name[ex.orig]} | intruso: {cf.name[ex.intruder]} | carta real removida: {cf.name[ex.removed]}")
print(f"score(candidata '{cf.name[c.oracle_id]}') = {c.score:.3f} | score(pior) = {c.pior_score:.3f} | δ = {DELTA}")
print("→", "Melhora o deck." if c.score > c.pior_score + DELTA else "Não melhora.")
""")

# ---------------------------------------------------------------------------
md(r"""
## 12. Exportação do modelo
O melhor modelo (pela PR-AUC na validação cruzada) é re-treinado com **todos** os decks (treino + teste), já que a
avaliação terminou, e exportado com `joblib` junto com δ e metadados. O backend (`backend-ml/`) carrega este arquivo e
usa o mesmo pacote `manatrade_ml` para montar as features.
""")
code(r"""
import joblib, json
final = clone(best).fit(X_all, y_all)
OUT = Path("../models") if Path("../models").exists() else Path("models"); OUT.mkdir(exist_ok=True)
bundle = {"pipeline": final, "delta": DELTA, "model_name": best_name, "sklearn_version": sklearn.__version__,
          "features": FEATS, "n_decks_train": int(pairs.deck_id.nunique()), "random_state": RANDOM_STATE}
joblib.dump(bundle, OUT / "best_model.joblib", compress=3)
meta = {k: v for k, v in bundle.items() if k not in ("pipeline", "features")}
meta["cv_pr_auc"] = float(cv_table.loc[best_name, "_pr_auc"]); meta["test_pr_auc"] = float(test_table.loc[best_name, "PR-AUC"])
(OUT / "model_meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
print(OUT / "best_model.joblib", f"{(OUT / 'best_model.joblib').stat().st_size/1e6:.1f} MB"); meta
""")

# ---------------------------------------------------------------------------
md(r"""
## 13. Análise crítica, limitações e próximos passos
> As afirmações abaixo devem ser conferidas contra as tabelas geradas acima a cada execução. A redação final do
> relatório é da equipe.

**Comparação dos modelos (ver tabela da Seção 8 e boxplot):**
- **Baseline de popularidade:** forte porque Commander tem um núcleo de cartas onipresentes, mas não sabe nada do deck:
  sugere as mesmas cartas para todo deck da mesma cor.
- **Regressão logística:** fronteira linear sobre features padronizadas; barata e interpretável (coeficientes da
  Seção 10). Captura bem "popular + mesmo papel + mesma tribo", mas não interações não lineares (ex.: "ramp só importa
  se o deck tem pouco ramp").
- **Árvore de decisão:** captura interações e limiares, mas é instável (alta variância entre folds) e as probabilidades
  são "em degraus" (poucas folhas), o que prejudica PR-AUC/ranking. Foi o modelo que **expôs o vazamento do
  denominador** (Seção 4): árvores exploram qualquer artefato exato nos dados.
- **k-NN:** sofre com ~100 dimensões heterogêneas (maldição da dimensionalidade). Todas as features pesam igual na
  distância, então dezenas de features do deck "diluem" as da carta. Também é o mais caro na predição.
- **Naive Bayes:** supõe independência condicional e distribuições gaussianas; as features são binárias, muito
  assimétricas e correlacionadas (pips × identidade, frações do deck), o que viola as duas suposições e explica o pior
  desempenho entre os modelos.
- **MLP:** modela interações não lineares carta×deck. Ganho modesto sobre a regressão logística em troca de custo de
  treino maior, menos interpretabilidade e sensibilidade a `alpha`/arquitetura (ver tabela de sensibilidade).

**Limitações:**
1. **Rótulo = escolha de designer**, não "carta ótima". Precons são montados pela Wizards com restrições de produto
   (reimpressões, cartas novas para vender a coleção). Um 0 pode ser uma carta excelente que só não foi incluída.
2. **Negativos sorteados** podem conter cartas que *caberiam* no deck (falsos negativos), o que reduz o teto das métricas.
3. **Temporalidade:** um deck de 2011 é comparado com cartas lançadas depois dele (não temos a data da primeira
   impressão no snapshot Oracle). O modelo pode aprender "cartas antigas e populares" em parte por isso.
4. **`edhrec_rank`** vem de decks de usuários que podem copiar precons, um possível vazamento externo, medido pela
   ablação.
5. **Amostra pequena de decks** (~178 após deduplicação): o desvio-padrão entre folds é relevante; conclusões
   de diferenças pequenas entre modelos devem ser cautelosas.
6. Tags de papel por regex são aproximadas (falsos positivos/negativos na leitura do texto).

**Próximos passos:** datas de primeira impressão para negativos temporais; decks de jogadores (ex.: listas públicas
do Archidekt/Moxfield, se a licença permitir) para rótulos menos enviesados; TF-IDF/embeddings do texto; calibração de
probabilidades (importante para o δ); ajuste do limiar de decisão por F1.

### Status para a Etapa 1 (o que falta)
- [x] EDA, preparação e features justificadas; baseline + regressão logística com divisão treino/teste por deck.
- [x] 4 clássicos + MLP com CV agrupada, tabela comparativa, figuras, regra de remoção, exportação.
- [ ] Revisar a redação das conclusões contra os números finais; relatório (4–6 p.) e slides.
""")

nb = nbf.v4.new_notebook()
nb["cells"] = cells
nb["metadata"] = {"kernelspec": {"name": "python3", "display_name": "Python 3", "language": "python"},
                  "language_info": {"name": "python"}, "colab": {"provenance": []}}
out = ROOT / "notebooks" / "manatrade_tp.ipynb"
out.parent.mkdir(exist_ok=True)
nbf.write(nb, out)
print("escrito", out)
