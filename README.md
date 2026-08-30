# Image Scale

Image Scale est un outil web statique pour redimensionner localement une image, un lot d’images ou l’ensemble d’un dossier.

Accès : https://mwrush.github.io/Image-Scale/

## Fonctionnalités

- Sélection simultanée de plusieurs images par clic
- Glisser-déposer d’images ou de dossiers
- Conservation des sous-dossiers dans l’archive de sortie
- Facteur d’échelle global de ×1 à ×10
- Agrandissement nearest-neighbor sans lissage
- Adoucissement optionnel de 0 à 50 %
- Traitement séquentiel pour limiter l’utilisation de la mémoire
- Export PNG individuel ou groupé dans une archive ZIP
- Interface responsive entièrement en français
- Thème sombre unique avec la typographie Bricolage Grotesque
- Traitement entièrement local, sans téléversement des fichiers

## Utilisation

1. Cliquer sur la zone d’import pour sélectionner plusieurs images, ou y déposer des images ou un dossier complet.
2. Définir le facteur d’échelle et l’adoucissement communs au lot.
3. Lancer le redimensionnement.
4. Télécharger une image séparément ou récupérer toutes les sorties dans une archive ZIP.

Les chemins relatifs issus d’un dossier sont conservés. Une image située dans `catalogue/ete/photo.jpg` est par exemple exportée sous `catalogue/ete/photo_redimensionnee_x2.png`.

## Limites

- L’agrandissement nearest-neighbor duplique les pixels et ne crée pas de nouveaux détails.
- Les animations GIF et WebP sont exportées comme images PNG fixes.
- Une sortie est limitée à 16 384 pixels par côté et 40 millions de pixels afin de protéger la mémoire du navigateur.
- Le format ZIP64 n’est pas pris en charge : une archive ne peut pas dépasser 4 Go ou 65 535 fichiers.

## Développement

Le projet ne nécessite ni dépendance ni étape de compilation. Ouvrir `index.html` dans un navigateur moderne ou servir le dossier avec un serveur HTTP statique.
