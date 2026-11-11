"""Montagem de X para o Pipeline e regra de remoção (usado no notebook e no backend)."""
import numpy as np
import pandas as pd
from .features import build_features, BASIC_NAMES


def color_identity_of(oracle_ids, cards_by_id):
    s = set("".join(cards_by_id["color_identity"].reindex(oracle_ids).fillna("")))
    return "".join(c for c in "WUBRG" if c in s)


def make_X(pairs, cf, decks_main, deck_ci, card_ci):
    """Features + colunas de identificação exigidas pelo TrainPopularityEncoder."""
    X = build_features(pairs, cf, decks_main, deck_ci)
    X["deck_id"] = pairs["deck_id"].values
    X["oracle_id"] = pairs["oracle_id"].values
    X["card_ci"] = card_ci.reindex(pairs["oracle_id"]).fillna("").values
    X["deck_ci"] = deck_ci.reindex(pairs["deck_id"]).fillna("").values
    return X


def score_members(model, cf, decks_main, deck_ci, card_ci, deck_ids=None, exclude=()):
    """score(x) = p(x pertence ao deck), com x avaliado 'fora' do próprio deck (leave-one-out).

    Exclui terrenos básicos e cartas travadas (`exclude`). O comandante já não está em decks_main.
    """
    dm = decks_main if deck_ids is None else decks_main[decks_main.deck_id.isin(deck_ids)]
    names = cf["name"]
    p = dm[["deck_id", "oracle_id"]].drop_duplicates()
    p = p[~names.reindex(p.oracle_id).isin(BASIC_NAMES).values & ~p.oracle_id.isin(set(exclude))]
    p = p.assign(anchor_id=p.oracle_id).reset_index(drop=True)
    X = make_X(p, cf, dm, deck_ci, card_ci)
    p["score"] = model.predict_proba(X)[:, 1]
    return p


def score_candidates(model, cf, decks_main, deck_ci, card_ci, pairs):
    """score(C) para candidatas fora do deck (sem âncora: deck completo como contexto)."""
    p = pairs[["deck_id", "oracle_id"]].reset_index(drop=True)
    X = make_X(p, cf, decks_main, deck_ci, card_ci)
    return model.predict_proba(X)[:, 1]


def removal_decision(score_c, member_scores: pd.DataFrame, delta: float):
    """Regra: pior = argmin score(x); melhora se score(C) > score(pior) + delta."""
    worst = member_scores.loc[member_scores["score"].idxmin()]
    improves = bool(score_c > worst["score"] + delta)
    return improves, worst
