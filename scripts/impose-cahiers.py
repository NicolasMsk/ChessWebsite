# -*- coding: utf-8 -*-
"""Impose le corps A4 en cahiers pretes a plier et relier.

Geometrie reconstituee depuis GRANDE-EDITION-cahiers-BORD-LONG.pdf du 21 aout
2026, dont le script d'origine a ete perdu :

  - feuille A4 paysage (842 x 595 pt) ;
  - chaque page A4 du corps reduite de 0.7070505679 (A4 -> A5) ;
  - moitie gauche a x = 0.139, moitie droite a x = 421.084, y = 0 ;
  - cahiers de 16 pages, le dernier reduit a 8 si besoin ;
  - pages blanches ajoutees pour completer le dernier cahier ;
  - variante BORD-LONG : les feuilles de rang pair tournees a 180 degres,
    pour une imprimante qui retourne sur le bord long. BORD-COURT : aucune
    rotation.

Le fichier de travail vit dans edition-raffinee/, qui est gitignore pour que
le livre paye ne soit jamais telechargeable. Cette copie est la reference
versionnee : la recopier dans edition-raffinee/ avant de s en servir.

Usage :
    py impose-cahiers.py --input grande-edition-corps-NOUVEAU.pdf \
        --output-long GRANDE-EDITION-cahiers-BORD-LONG.pdf \
        --output-court GRANDE-EDITION-cahiers-BORD-COURT.pdf
"""
from argparse import ArgumentParser
from pathlib import Path

import pymupdf

ECHELLE = 0.7070505679173927
X_GAUCHE = 0.13911119694535046
X_DROITE = 421.08411119694534
CAHIER = 16


def ordre_cahier(premiere, taille):
    """Ordre d'imposition d'un cahier : (gauche, droite) pour chaque feuille.

    Pour un cahier de N pages commencant a `premiere`, la feuille k porte
    la derniere page puis la premiere, puis on progresse vers le centre.
    """
    pages = list(range(premiere, premiere + taille))
    feuilles = []
    while pages:
        # recto : derniere | premiere
        feuilles.append((pages[-1], pages[0]))
        # verso : deuxieme | avant-derniere
        feuilles.append((pages[1], pages[-2]))
        pages = pages[2:-2]
    return feuilles


def plan(nb_pages):
    """Decoupe le corps en cahiers et renvoie la liste des feuilles."""
    feuilles = []
    restant = nb_pages
    debut = 1
    while restant > 0:
        taille = CAHIER if restant > CAHIER else ((restant + 3) // 4) * 4
        feuilles += ordre_cahier(debut, taille)
        debut += taille
        restant -= taille
    return feuilles


def impose(source, destination, bord_long):
    corps = pymupdf.open(source)
    largeur = corps[0].rect.width
    hauteur = corps[0].rect.height
    # A4 paysage : on derive la feuille du corps lui-meme
    feuille_l, feuille_h = hauteur, largeur

    feuilles = plan(corps.page_count)
    sortie = pymupdf.open()
    for index, (gauche, droite) in enumerate(feuilles):
        page = sortie.new_page(width=feuille_l, height=feuille_h)
        for x, numero in ((X_GAUCHE, gauche), (X_DROITE, droite)):
            if numero is None or numero > corps.page_count:
                continue  # page blanche de bourrage
            rect = pymupdf.Rect(x, 0, x + largeur * ECHELLE, hauteur * ECHELLE)
            page.show_pdf_page(rect, corps, numero - 1)
        if bord_long and index % 2 == 1:
            page.set_rotation(180)

    sortie.save(destination, garbage=3, deflate=True)
    n = sortie.page_count
    sortie.close()
    corps.close()
    return n


def main():
    p = ArgumentParser()
    p.add_argument("--input", default="grande-edition-corps-NOUVEAU.pdf")
    p.add_argument("--output-long", default="GRANDE-EDITION-cahiers-BORD-LONG.pdf")
    p.add_argument("--output-court", default="GRANDE-EDITION-cahiers-BORD-COURT.pdf")
    a = p.parse_args()

    racine = Path(__file__).parent
    src = racine / a.input
    for sortie, bord_long in ((a.output_long, True), (a.output_court, False)):
        n = impose(str(src), str(racine / sortie), bord_long)
        print(f"{sortie} : {n} feuilles")


if __name__ == "__main__":
    main()
