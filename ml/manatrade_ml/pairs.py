"""Construção do dataset de pares (deck, carta) com negativos difíceis."""
import numpy as np
import pandas as pd
from .features import BASIC_NAMES, RANDOM_STATE


def dedup_and_group(decks: pd.DataFrame, jaccard_threshold: float = 0.5):
    """Remove decks idênticos (reimpressões) e agrupa decks muito parecidos.

    Retorna (decks_filtrados, group_id por deck_id). Decks com Jaccard >= limiar
    caem no mesmo grupo e, portanto, sempre no mesmo lado da divisão treino/teste.
    """
    main = decks[decks.is_commander == 0]
    sets = main.groupby("deck_id")["oracle_id"].apply(frozenset)
    keep = sets[~sets.duplicated()].index
    sets = sets.loc[keep]
    ids = list(sets.index)
    parent = {d: d for d in ids}

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = sets[ids[i]], sets[ids[j]]
            if len(a & b) / len(a | b) >= jaccard_threshold:
                parent[find(ids[i])] = find(ids[j])
    groups = pd.Series({d: find(d) for d in ids})
    groups = groups.map({g: k for k, g in enumerate(sorted(groups.unique()))})
    return decks[decks.deck_id.isin(keep)].copy(), groups


def make_pairs(decks, cards, deck_ci, neg_ratio=3, cmc_tol=1, seed=RANDOM_STATE):
    """Positivos: cartas não-básicas dos 99 de cada deck (sem o comandante).

    Negativos difíceis: para cada positivo, `neg_ratio` cartas legais em Commander,
    dentro da identidade de cor do deck, ausentes dele, do mesmo grupo terreno/não
    terreno, com |CMC - CMC do positivo| <= cmc_tol e preferindo a mesma identidade
    de cor do positivo. Relaxa a restrição de cor se faltar candidato.
    """
    rng = np.random.default_rng(seed)
    pool = cards[(cards.legal_commander == "legal") & (~cards.name.isin(BASIC_NAMES))
                 & (~cards.type_line.fillna("").str.contains("Basic Land"))].copy()
    pool["ci"] = pool.color_identity.fillna("")
    pool["is_land"] = pool.type_line.fillna("").str.contains("Land") & ~pool.type_line.fillna("").str.contains("//")
    info = pool.set_index("oracle_id")
    rows = []
    for d, g in decks[decks.is_commander == 0].groupby("deck_id"):
        dci = set(deck_ci[d])
        in_deck = set(g.oracle_id)
        allowed = pool[pool.ci.map(lambda s: set(s) <= dci) & ~pool.oracle_id.isin(in_deck)]
        used = set()
        pos = [o for o in g.oracle_id.unique() if o in info.index]
        for o in pos:
            rows.append((d, o, 1, o))
            pc = info.loc[o]
            cand = allowed[(allowed.is_land == pc.is_land) & ((allowed.cmc - pc.cmc).abs() <= cmc_tol)]
            pref = cand[cand.ci == pc.ci]
            for src in (pref, cand, allowed):
                src = src[~src.oracle_id.isin(used)]
                if len(src) >= neg_ratio:
                    break
            pick = src.oracle_id.values[rng.choice(len(src), size=min(neg_ratio, len(src)), replace=False)]
            used.update(pick)
            rows += [(d, n, 0, o) for n in pick]
    # anchor_id: positivo "escondido" do deck; os 3 negativos sorteados para ele
    # competem pela mesma vaga e veem exatamente o mesmo contexto de deck.
    return pd.DataFrame(rows, columns=["deck_id", "oracle_id", "label", "anchor_id"])
