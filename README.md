# Image Scale

Image Scale est un outil web statique pour redimensionner localement une image, un lot d’images ou l’ensemble d’un dossier.

Accès : https://mwrush.github.io/Image-Scale/

## Fonctionnalités

- Sélection simultanée de plusieurs images
- Sélection et glisser-déposer de dossiers
- Conservation des sous-dossiers dans l’archive de sortie
- Facteur d’échelle global de ×1 à ×10
- Agrandissement nearest-neighbor sans lissage
- Adoucissement optionnel de 0 à 50 %
- Traitement séquentiel pour limiter l’utilisation de la mémoire
- Export PNG individuel ou groupé dans une archive ZIP
- Interface responsive en français et en anglais
- Thèmes clair et sombre persistants
- Traitement entièrement local, sans téléversement des fichiers

## Utilisation

1. Sélectionner plusieurs images ou un dossier complet.
2. Définir le facteur d’échelle et l’adoucissement communs au lot.
3. Lancer le redimensionnement.
4. Télécharger une image séparément ou récupérer toutes les sorties dans une archive ZIP.

Les chemins relatifs issus d’un dossier sont conservés. Une image située dans `catalogue/ete/photo.jpg` est par exemple exportée sous `catalogue/ete/photo_scaled_x2.png`.

## Limites

- L’agrandissement nearest-neighbor duplique les pixels et ne crée pas de nouveaux détails.
- Les animations GIF et WebP sont exportées comme images PNG fixes.
- Une sortie est limitée à 16 384 pixels par côté et 40 millions de pixels afin de protéger la mémoire du navigateur.
- Le format ZIP64 n’est pas pris en charge : une archive ne peut pas dépasser 4 Go ou 65 535 fichiers.

## Développement

Le projet ne nécessite ni dépendance ni étape de compilation. Ouvrir `index.html` dans un navigateur moderne ou servir le dossier avec un serveur HTTP statique.

---

# Image Scale

Image Scale is a static web tool for locally resizing one image, a batch of images, or an entire folder.

## Features

- Multi-image selection
- Folder selection and drag and drop
- Subfolder preservation in the output archive
- Global ×1 to ×10 scale factor
- Nearest-neighbor scaling without smoothing
- Optional 0 to 50% smoothing
- Sequential processing to reduce memory usage
- Individual PNG or batch ZIP export
- Responsive French and English interface
- Persistent light and dark themes
- Fully local processing with no file uploads

## Usage

1. Select multiple images or a complete folder.
2. Choose the scale factor and smoothing level for the batch.
3. Start processing.
4. Download an individual image or every output in a ZIP archive.

Relative folder paths are preserved. For example, `catalogue/summer/photo.jpg` is exported as `catalogue/summer/photo_scaled_x2.png`.

## Limitations

- Nearest-neighbor scaling duplicates pixels and does not create new detail.
- GIF and WebP animations are exported as still PNG images.
- Each output is limited to 16,384 pixels per side and 40 million pixels to protect browser memory.
- ZIP64 is not supported, so an archive cannot exceed 4 GB or 65,535 files.

## Development

The project has no dependencies or build step. Open `index.html` in a modern browser or serve the directory with a static HTTP server.
