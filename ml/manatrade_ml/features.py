"""Features de carta, deck e interação carta×deck + codificador de popularidade."""
import re
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

RANDOM_STATE = 42
COLORS = list("WUBRG")
TYPES = ["creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker", "land", "battle"]
RARITY = {"common": 0, "uncommon": 1, "rare": 2, "special": 2, "bonus": 2, "mythic": 3}
# Palavras-chave mais frequentes no catálogo Commander (escolha fixa, independente do alvo).
KEYWORDS = ["flying", "trample", "haste", "vigilance", "deathtouch", "lifelink", "flash",
            "reach", "menace", "first strike", "ward", "equip", "scry", "mill", "landfall"]
# Tags de papel extraídas do texto de regras por expressões regulares simples.
ROLE_PATTERNS = {
    "ramp": r"add \{|search your library for (a|up to \w+) (basic )?land|put (a|that|those) land cards? onto the battlefield|additional land",
    "draw": r"draws? (a|two|three|x|\w+) cards?|draw cards? equal",
    "removal": r"destroy target|exile target (creature|artifact|enchantment|permanent|nonland)|deals? \S+ damage to (target|any target|each creature)|target creature gets -",
    "wipe": r"destroy all|exile all|all creatures get -|each creature gets -|deals? \S+ damage to each creature",
    "counter": r"counter target",
    "tutor": r"search your library for a(n)? (?!basic)(?!land)",
    "token": r"create (a|an|one|two|three|x|\w+) .*?tokens?",
    "recursion": r"return .* from (your|a) graveyard",
    "protection": r"hexproof|indestructible|protection from|phase out",
    "lifegain": r"gain \S+ life|you gain life",
    "counters": r"\+1/\+1 counter",
    "sacrifice": r"sacrifice (a|another|an)",
}
ROLES = list(ROLE_PATTERNS)
_ROLE_RE = {k: re.compile(v) for k, v in ROLE_PATTERNS.items()}
BASIC_NAMES = {"Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"}


def _num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return np.nan


def card_features(cards: pd.DataFrame) -> pd.DataFrame:
    """Uma linha por carta (indexada por oracle_id) com as features da carta."""
    c = cards.copy()
    text = c["oracle_text"].fillna("").str.lower()
    tl = c["type_line"].fillna("").str.lower()
    mc = c["mana_cost"].fillna("")
    out = pd.DataFrame(index=c["oracle_id"].values)
    out["cmc"] = c["cmc"].fillna(0).values
    for col in COLORS:
        out[f"pip_{col}"] = mc.str.count(r"\{[^}]*" + col + r"[^}]*\}").values
        out[f"ci_{col}"] = c["color_identity"].fillna("").str.contains(col).astype(int).values
    out["n_ci"] = out[[f"ci_{x}" for x in COLORS]].sum(1)
    out["pip_generic"] = mc.str.extractall(r"\{(\d+)\}")[0].astype(float).groupby(level=0).sum().reindex(range(len(c)), fill_value=0).values
    for t in TYPES:
        out[f"is_{t}"] = tl.str.contains(t).astype(int).values
    out["is_legendary"] = tl.str.contains("legendary").astype(int).values
    for name, col in (("power", "power"), ("toughness", "toughness"), ("loyalty", "loyalty")):
        v = c[col].map(_num).values
        out[name] = v  # NaN quando não se aplica / "*" -> imputado no Pipeline
    out["rarity"] = c["rarity"].map(RARITY).fillna(1).values
    kw = c["keywords"].fillna("").str.lower()
    out["n_keywords"] = kw.map(lambda s: 0 if not s else len(s.split("|"))).values
    for k in KEYWORDS:
        out[f"kw_{k.replace(' ', '_')}"] = kw.str.contains(rf"(?:^|\|){k}(?:\||$)").astype(int).values
    for r, rx in _ROLE_RE.items():
        out[f"role_{r}"] = text.map(lambda s, rx=rx: int(bool(rx.search(s)))).values
    out["text_len"] = text.str.len().values
    out["log_edhrec_rank"] = np.log1p(c["edhrec_rank"].values)  # NaN = carta sem rank (imputado)
    out["subtypes"] = c["type_line"].fillna("").map(lambda s: s.split("—")[1].strip() if "—" in s else "").values
    out["color_identity"] = c["color_identity"].fillna("").values
    out["name"] = c["name"].values
    return out


# Colunas numéricas da carta agregadas no nível do deck.
DECK_AGG_COLS = (["cmc"] + [f"pip_{x}" for x in COLORS] + [f"is_{t}" for t in TYPES]
                 + [f"role_{r}" for r in ROLES])
CMC_BINS = [(0, 1), (2, 2), (3, 3), (4, 4), (5, 99)]


def _deck_sum_vectors(cf: pd.DataFrame, decks: pd.DataFrame):
    """Somas por deck (com multiplicidade) usadas para médias com exclusão da própria carta."""
    base = cf[DECK_AGG_COLS].copy()
    nonland = 1 - cf["is_land"]
    base["nonland"] = nonland
    base["cmc_nonland"] = cf["cmc"] * nonland
    for lo, hi in CMC_BINS:
        base[f"cmcbin_{lo}_{hi}"] = ((cf["cmc"] >= lo) & (cf["cmc"] <= hi) & (nonland == 1)).astype(int)
    m = decks.merge(base, left_on="oracle_id", right_index=True)
    cols = list(base.columns)
    sums = m[cols].mul(m["count"], axis=0).groupby(m["deck_id"]).sum()
    sums["n_cards"] = m.groupby("deck_id")["count"].sum()
    return base, sums


def deck_subtypes(cf, decks):
    m = decks.merge(cf[["subtypes"]], left_on="oracle_id", right_index=True)
    return m.groupby("deck_id")["subtypes"].apply(lambda s: " ".join(s).split())


def build_features(pairs: pd.DataFrame, cf: pd.DataFrame, decks: pd.DataFrame, deck_ci: pd.Series) -> pd.DataFrame:
    """Monta a matriz de features para pares (deck_id, oracle_id).

    `decks` = composição dos 99 (sem comandante) de cada deck. A carta `anchor_id`
    (se houver e pertencer ao deck) é removida dos agregados do deck. Nos positivos
    anchor = a própria carta; nos negativos, anchor = o positivo para o qual foram
    sorteados. Assim positivo e negativos veem o MESMO contexto (deck com uma vaga
    aberta); sem isso, só os positivos teriam n-1 cartas e o modelo aprenderia o
    rótulo pelo denominador (vazamento detectado na árvore de decisão).
    Na inferência sem anchor_id, uma candidata que já está no deck é removida dele.
    """
    base, sums = _deck_sum_vectors(cf, decks)
    member = decks.groupby(["deck_id", "oracle_id"])["count"].sum()
    p = pairs[["deck_id", "oracle_id"]].copy()
    anchor = pairs["anchor_id"].values if "anchor_id" in pairs else p["oracle_id"].values
    idx = pd.MultiIndex.from_arrays([p["deck_id"].values, anchor])
    cnt = member.reindex(idx).fillna(0).values
    S = sums.reindex(p["deck_id"]).values - base.reindex(anchor).reindex(columns=list(sums.columns), fill_value=0).values * cnt[:, None]
    S = pd.DataFrame(S, columns=sums.columns, index=p.index)
    # n_cards: remove as cópias da própria carta
    S["n_cards"] = sums["n_cards"].reindex(p["deck_id"]).values - cnt
    n, nl = S["n_cards"].clip(lower=1), S["nonland"].clip(lower=1)
    X = cf.reindex(p["oracle_id"]).drop(columns=["subtypes", "color_identity", "name"]).reset_index(drop=True)
    X.index = p.index
    D = pd.DataFrame(index=p.index)
    D["deck_mean_cmc"] = S["cmc_nonland"] / nl
    pip_tot = S[[f"pip_{c}" for c in COLORS]].sum(1).clip(lower=1)
    for c in COLORS:
        D[f"deck_pipshare_{c}"] = S[f"pip_{c}"] / pip_tot
    for t in TYPES:
        D[f"deck_frac_{t}"] = S[f"is_{t}"] / n
    for r in ROLES:
        D[f"deck_frac_role_{r}"] = S[f"role_{r}"] / n
    for lo, hi in CMC_BINS:
        D[f"deck_cmcbin_{lo}_{hi}"] = S[f"cmcbin_{lo}_{hi}"] / nl
    dci = deck_ci.reindex(p["deck_id"]).fillna("").values
    D["deck_n_ci"] = [len(s) for s in dci]
    # Interação carta×deck
    I = pd.DataFrame(index=p.index)
    card_pips = X[[f"pip_{c}" for c in COLORS]].values
    shares = D[[f"deck_pipshare_{c}" for c in COLORS]].values
    tot = card_pips.sum(1)
    I["int_pip_affinity"] = np.where(tot > 0, (card_pips * shares).sum(1) / np.maximum(tot, 1), np.nan)
    cci = cf["color_identity"].reindex(p["oracle_id"]).fillna("").values
    I["int_ci_fraction"] = [len(set(a)) / max(len(b), 1) for a, b in zip(cci, dci)]
    I["int_ci_outside"] = [int(not set(a) <= set(b)) for a, b in zip(cci, dci)]
    I["int_cmc_diff"] = X["cmc"].values - D["deck_mean_cmc"].values
    I["int_abs_cmc_diff"] = np.abs(I["int_cmc_diff"])
    same_type = np.zeros(len(p))
    for t in TYPES:
        same_type += X[f"is_{t}"].values * D[f"deck_frac_{t}"].values
    I["int_same_type_frac"] = same_type
    rc = X[[f"role_{r}" for r in ROLES]].values
    rd = D[[f"deck_frac_role_{r}" for r in ROLES]].values
    I["int_same_role_frac"] = (rc * rd).sum(1)
    num = (rc * rd).sum(1)
    den = np.linalg.norm(rc, axis=1) * np.linalg.norm(rd, axis=1)
    I["int_role_cosine"] = np.where(den > 0, num / np.where(den > 0, den, 1), 0)
    # sobreposição de subtipos (tribal): quantas cartas do deck compartilham subtipo com a candidata
    dsub = deck_subtypes(cf, decks)
    csub = cf["subtypes"].reindex(p["oracle_id"]).fillna("").values
    asub = cf["subtypes"].reindex(anchor).fillna("").values
    ov = []
    for d, s, a, k in zip(p["deck_id"].values, csub, asub, cnt):
        toks = s.split()
        if not toks:
            ov.append(0.0)
            continue
        pool = dsub.get(d, [])
        hits = sum(1 for t in pool if t in toks) - k * sum(1 for t in a.split() if t in toks)
        ov.append(max(hits, 0) / 99.0)
    I["int_subtype_overlap"] = ov
    return pd.concat([X, D, I], axis=1)


class TrainPopularityEncoder(BaseEstimator, TransformerMixin):
    """Popularidade da carta calculada SOMENTE com os decks de treino.

    pop(c) = nº de decks de treino que contêm c / nº de decks de treino cuja
    identidade de cor permite c. Em fit_transform (linhas de treino) usa
    leave-one-deck-out: o deck da própria linha não conta, evitando que o rótulo
    vaze pela feature. Recebe DataFrame com colunas deck_id, oracle_id,
    card_ci, deck_ci; devolve as demais colunas + 'train_pop'.
    """

    id_cols = ["deck_id", "oracle_id", "card_ci", "deck_ci"]

    def __init__(self, prior: float = 1.0):
        self.prior = prior

    def fit(self, X, y=None):
        X = X.reset_index(drop=True)
        y = np.asarray(y)
        pos = X.loc[y == 1, ["deck_id", "oracle_id"]].drop_duplicates()
        self.contain_ = pos.groupby("oracle_id").size().to_dict()
        self.deck_cis_ = X.drop_duplicates("deck_id").set_index("deck_id")["deck_ci"].to_dict()
        ci_counts = pd.Series(list(self.deck_cis_.values())).value_counts().to_dict()
        self.ci_counts_ = ci_counts
        self.pos_pairs_ = set(map(tuple, pos.values))
        return self

    def _eligible(self, card_ci):
        s = set(card_ci)
        return sum(n for ci, n in self.ci_counts_.items() if s <= set(ci))

    def _pop(self, X, loo):
        cache = {}
        vals = np.empty(len(X))
        for i, (d, o, cci) in enumerate(zip(X["deck_id"].values, X["oracle_id"].values, X["card_ci"].fillna("").values)):
            if cci not in cache:
                cache[cci] = self._eligible(cci)
            n_el = cache[cci]
            k = self.contain_.get(o, 0)
            if loo and d in self.deck_cis_:
                n_el -= int(set(cci) <= set(self.deck_cis_[d]))
                k -= int((d, o) in self.pos_pairs_)
            vals[i] = (k + 0.0) / (n_el + self.prior)
        return vals

    def _out(self, X, loo):
        out = X.drop(columns=self.id_cols).copy()
        out["train_pop"] = self._pop(X, loo)
        return out

    def transform(self, X):
        return self._out(X, loo=False)

    def fit_transform(self, X, y=None, **kw):
        return self.fit(X, y)._out(X, loo=True)


class ColumnSelector(BaseEstimator, TransformerMixin):
    """Mantém apenas `columns` (None = todas). Usado nas ablações; serializável com joblib."""

    def __init__(self, columns=None):
        self.columns = columns

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        return X if self.columns is None else X[list(self.columns)]
