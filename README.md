# Image Scale

Image Scale est un outil web statique pour redimensionner localement des images tout en regroupant les autres fichiers dans une archive ZIP structurée.

Accès : https://mwrush.github.io/Image-Scale/

## Fonctionnalités

- Sélection simultanée de plusieurs fichiers, quel que soit leur format
- Glisser-déposer de fichiers ou de dossiers complets
- Redimensionnement des images reconnues et conservation sans modification des autres fichiers
- Conservation des noms, extensions et sous-dossiers dans l’archive de sortie
- Facteur d’échelle global de ×1 à ×10
- Agrandissement par plus proche voisin sans lissage
- Adoucissement optionnel de 0 à 50 %
- Traitement séquentiel pour limiter l’utilisation de la mémoire
- Téléchargement individuel des fichiers préparés ou export groupé dans une archive ZIP
- Interface adaptative entièrement en français
- Thème sombre harmonisé avec Image Notes, typographie Bricolage Grotesque embarquée et favicon SVG
- Traitement entièrement local, sans téléversement des fichiers

## Utilisation

1. Cliquer sur la zone d’import pour sélectionner plusieurs fichiers, ou y déposer des fichiers ou un dossier complet.
2. Définir le facteur d’échelle et l’adoucissement communs au lot.
3. Préparer l’export pour redimensionner les images et conserver les autres fichiers.
4. Télécharger un fichier séparément ou récupérer toutes les sorties dans une archive ZIP.

Les chemins relatifs issus d’un dossier sont conservés. Une image située dans `catalogue/ete/photo.jpg` est par exemple exportée sous `catalogue/ete/photo_redimensionnee_x2.png`, tandis qu’un fichier `catalogue/ete/notes.txt` reste `catalogue/ete/notes.txt` avec un contenu inchangé.

Si deux fichiers différents aboutissent exactement au même chemin, le second reçoit un suffixe numérique, par exemple `notes_2.txt`, afin d’éviter tout écrasement dans l’archive.

## Limites

- L’agrandissement par plus proche voisin duplique les pixels et ne crée pas de nouveaux détails.
- Les animations GIF et WebP sont exportées comme images PNG fixes.
- Une sortie est limitée à 16 384 pixels par côté et 40 millions de pixels afin de protéger la mémoire du navigateur.
- Le format ZIP64 n’est pas pris en charge : une archive ne peut pas dépasser 4 Go ou 65 535 fichiers.

## Développement

Le projet ne nécessite ni dépendance ni étape de compilation. Ouvrir `index.html` dans un navigateur moderne ou servir le dossier avec un serveur HTTP statique.

Le dossier local est nommé `image_scale`, avec la même convention que `image_notes`. Les deux outils utilisent des noms de fichiers et d’identifiants en anglais séparés par des underscores. La police et sa licence SIL Open Font License se trouvent dans `fonts/` ; aucune requête externe n’est nécessaire.
