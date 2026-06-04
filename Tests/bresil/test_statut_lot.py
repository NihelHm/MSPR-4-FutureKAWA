# ==========================================================
# TESTS UNITAIRES — test_statut_lot.py
# pytest bresil/tests/test_statut_lot.py -v
# ==========================================================
# Logique testée en Python pur — AUCUNE BDD requise.
# Reflète exactement la fonction SQL calculate_statut_lot().
# ==========================================================

import pytest
from datetime import date, timedelta

# ----------------------------------------------------------
# SEUILS MÉTIER (miroir de la table seuil_pays)
# Brésil : 29°C / 55% hum  (±3°C / ±2%)
# Équateur : 31°C / 60% hum
# Colombie : 26°C / 80% hum
# ----------------------------------------------------------
SEUILS = {
    "bresil":   {"temp_ideale": 29.0, "hum_ideale": 55.0, "temp_tol": 3.0, "hum_tol": 2.0},
    "equateur": {"temp_ideale": 31.0, "hum_ideale": 60.0, "temp_tol": 3.0, "hum_tol": 2.0},
    "colombie": {"temp_ideale": 26.0, "hum_ideale": 80.0, "temp_tol": 3.0, "hum_tol": 2.0},
}


def calculer_statut(date_stockage: date, pays: str,
                    derniere_temp: float = None,
                    derniere_hum: float = None) -> str:
    """
    Miroir Python de la fonction SQL calculate_statut_lot().
    Priorité : perime > en_alerte > conforme
    """
    age_jours = (date.today() - date_stockage).days

    # Règle 1 : péremption (prioritaire)
    if age_jours > 365:
        return "perime"

    seuils = SEUILS.get(pays)
    if not seuils:
        return "conforme"

    # Règle 2 : alerte température
    if derniere_temp is not None:
        if abs(derniere_temp - seuils["temp_ideale"]) > seuils["temp_tol"]:
            return "en_alerte"

    # Règle 2 : alerte humidité
    if derniere_hum is not None:
        if abs(derniere_hum - seuils["hum_ideale"]) > seuils["hum_tol"]:
            return "en_alerte"

    return "conforme"


# ----------------------------------------------------------
# FIXTURES
# ----------------------------------------------------------
@pytest.fixture
def aujourd_hui():
    return date.today()

@pytest.fixture
def date_recente(aujourd_hui):
    return aujourd_hui - timedelta(days=10)

@pytest.fixture
def date_limite(aujourd_hui):
    return aujourd_hui - timedelta(days=365)  # exactement 365j → encore conforme

@pytest.fixture
def date_perimee(aujourd_hui):
    return aujourd_hui - timedelta(days=366)  # 366j → périmé

@pytest.fixture
def date_tres_ancienne(aujourd_hui):
    return aujourd_hui - timedelta(days=730)


# ==========================================================
# STATUT CONFORME
# ==========================================================
class TestStatutConforme:

    def test_bresil_conditions_ideales(self, date_recente):
        assert calculer_statut(date_recente, "bresil", 29.0, 55.0) == "conforme"

    def test_equateur_conditions_ideales(self, date_recente):
        assert calculer_statut(date_recente, "equateur", 31.0, 60.0) == "conforme"

    def test_colombie_conditions_ideales(self, date_recente):
        assert calculer_statut(date_recente, "colombie", 26.0, 80.0) == "conforme"

    def test_temperature_limite_haute_incluse(self, date_recente):
        # 29 + 3 = 32 exactement → conforme (tolérance incluse)
        assert calculer_statut(date_recente, "bresil", 32.0, 55.0) == "conforme"

    def test_temperature_limite_basse_incluse(self, date_recente):
        # 29 - 3 = 26 exactement → conforme
        assert calculer_statut(date_recente, "bresil", 26.0, 55.0) == "conforme"

    def test_humidite_limite_haute_incluse(self, date_recente):
        # 55 + 2 = 57 exactement → conforme
        assert calculer_statut(date_recente, "bresil", 29.0, 57.0) == "conforme"

    def test_humidite_limite_basse_incluse(self, date_recente):
        # 55 - 2 = 53 exactement → conforme
        assert calculer_statut(date_recente, "bresil", 29.0, 53.0) == "conforme"

    def test_exactement_365_jours_conforme(self, date_limite):
        # 365j pile → pas encore périmé
        assert calculer_statut(date_limite, "bresil", 29.0, 55.0) == "conforme"

    def test_sans_mesures_conforme_par_defaut(self, date_recente):
        assert calculer_statut(date_recente, "bresil") == "conforme"

    def test_pays_inconnu_conforme_par_defaut(self, date_recente):
        assert calculer_statut(date_recente, "venezuela", 99.0, 99.0) == "conforme"


# ==========================================================
# STATUT EN_ALERTE
# ==========================================================
class TestStatutEnAlerte:

    def test_temperature_trop_haute_bresil(self, date_recente):
        # 29 + 3.1 = 32.1 → hors tolérance
        assert calculer_statut(date_recente, "bresil", 32.1, 55.0) == "en_alerte"

    def test_temperature_trop_basse_bresil(self, date_recente):
        # 29 - 3.1 = 25.9 → hors tolérance
        assert calculer_statut(date_recente, "bresil", 25.9, 55.0) == "en_alerte"

    def test_humidite_trop_haute_bresil(self, date_recente):
        # 55 + 2.1 = 57.1 → hors tolérance
        assert calculer_statut(date_recente, "bresil", 29.0, 57.1) == "en_alerte"

    def test_humidite_trop_basse_bresil(self, date_recente):
        # 55 - 2.1 = 52.9 → hors tolérance
        assert calculer_statut(date_recente, "bresil", 29.0, 52.9) == "en_alerte"

    def test_temperature_trop_haute_equateur(self, date_recente):
        assert calculer_statut(date_recente, "equateur", 34.1, 60.0) == "en_alerte"

    def test_humidite_trop_basse_colombie(self, date_recente):
        assert calculer_statut(date_recente, "colombie", 26.0, 77.9) == "en_alerte"

    def test_temperature_tres_haute(self, date_recente):
        assert calculer_statut(date_recente, "bresil", 40.0, 55.0) == "en_alerte"

    def test_seulement_temp_hors_seuil(self, date_recente):
        assert calculer_statut(date_recente, "bresil", 33.5, 55.0) == "en_alerte"

    def test_seulement_hum_hors_seuil(self, date_recente):
        assert calculer_statut(date_recente, "bresil", 29.0, 58.5) == "en_alerte"


# ==========================================================
# STATUT PERIME (> 365 jours)
# ==========================================================
class TestStatutPerime:

    def test_366_jours_perime(self, date_perimee):
        assert calculer_statut(date_perimee, "bresil", 29.0, 55.0) == "perime"

    def test_2_ans_perime(self, date_tres_ancienne):
        assert calculer_statut(date_tres_ancienne, "bresil", 29.0, 55.0) == "perime"

    def test_perime_prioritaire_sur_alerte(self, date_perimee):
        # Même si conditions mauvaises, périmé est prioritaire
        assert calculer_statut(date_perimee, "bresil", 40.0, 80.0) == "perime"

    def test_perime_sans_mesures(self, date_perimee):
        assert calculer_statut(date_perimee, "bresil") == "perime"

    def test_perime_equateur(self, date_perimee):
        assert calculer_statut(date_perimee, "equateur", 31.0, 60.0) == "perime"

    def test_perime_colombie(self, date_perimee):
        assert calculer_statut(date_perimee, "colombie", 26.0, 80.0) == "perime"


# ==========================================================
# VÉRIFICATION DES SEUILS (constantes du cahier des charges)
# ==========================================================
class TestSeuilsParPays:

    def test_seuils_bresil(self):
        assert SEUILS["bresil"]["temp_ideale"] == 29.0
        assert SEUILS["bresil"]["hum_ideale"]  == 55.0
        assert SEUILS["bresil"]["temp_tol"]    == 3.0
        assert SEUILS["bresil"]["hum_tol"]     == 2.0

    def test_seuils_equateur(self):
        assert SEUILS["equateur"]["temp_ideale"] == 31.0
        assert SEUILS["equateur"]["hum_ideale"]  == 60.0

    def test_seuils_colombie(self):
        assert SEUILS["colombie"]["temp_ideale"] == 26.0
        assert SEUILS["colombie"]["hum_ideale"]  == 80.0

    def test_frontiere_temp_juste_au_dessus_alerte(self, date_recente):
        # 29 + 3 = 32 → conforme, 32.001 → alerte
        assert calculer_statut(date_recente, "bresil", 32.001, 55.0) == "en_alerte"

    def test_frontiere_hum_juste_au_dessus_alerte(self, date_recente):
        assert calculer_statut(date_recente, "bresil", 29.0, 57.001) == "en_alerte"
