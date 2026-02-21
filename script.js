const translations = {
    fr: {
        title: 'Redimensionnement d\'Image',
        upload: 'Choisir une image',
        scaleLabel: 'Échelle (x)',
        lossLabel: 'Intensité de la perte',
        resizeBtn: 'Redimensionner',
        result: 'Résultat',
        resultSize: 'Dimensions',
        download: 'Télécharger',
        newImage: 'Nouvelle image',
        filename: 'image_redimensionnee'
    },
    en: {
        title: 'Image Scale',
        upload: 'Choose an image',
        scaleLabel: 'Scale (x)',
        lossLabel: 'Loss intensity',
        resizeBtn: 'Resize',
        result: 'Result',
        resultSize: 'Dimensions',
        download: 'Download',
        newImage: 'New image',
        filename: 'scaled_image'
    }
};

let currentLang = localStorage.getItem('lang') || 'fr';
let currentTheme = localStorage.getItem('theme') || 'light';

const fileInput = document.getElementById('fileInput');
const settingsSection = document.getElementById('settingsSection');
const resultsSection = document.getElementById('resultsSection');
const previewCanvas = document.getElementById('previewCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const scaleSlider = document.getElementById('scaleSlider');
const scaleValue = document.getElementById('scaleValue');
const lossSlider = document.getElementById('lossSlider');
const lossValue = document.getElementById('lossValue');
const scaleBtn = document.getElementById('scaleBtn');
const resultSizeLabel = document.getElementById('resultSizeLabel');
const resultSizeValue = document.getElementById('resultSizeValue');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const themeToggle = document.getElementById('themeToggle');
const langToggle = document.getElementById('langToggle');

let originalImage = null;

function init() {
    setTheme(currentTheme);
    setLang(currentLang);
    settingsSection.style.display = 'none';
    resultsSection.style.display = 'none';
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function setLang(lang) {
    currentLang = lang;
    langToggle.textContent = lang === 'fr' ? 'EN' : 'FR';
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
}

themeToggle.addEventListener('click', () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
});

langToggle.addEventListener('click', () => {
    setLang(currentLang === 'fr' ? 'en' : 'fr');
});

scaleSlider.addEventListener('input', () => {
    scaleValue.textContent = scaleSlider.value;
});

lossSlider.addEventListener('input', () => {
    lossValue.textContent = lossSlider.value + '%';
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                drawPreview();
                settingsSection.style.display = 'block';
                resultsSection.style.display = 'none';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

function drawPreview() {
    if (!originalImage) return;

    const maxWidth = Math.min(800, window.innerWidth - 80);
    const scale = Math.min(1, maxWidth / originalImage.width);
    previewCanvas.width = originalImage.width * scale;
    previewCanvas.height = originalImage.height * scale;

    const ctx = previewCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(originalImage, 0, 0, previewCanvas.width, previewCanvas.height);
}

scaleBtn.addEventListener('click', () => {
    if (!originalImage) return;

    const scaleFactor = parseFloat(scaleSlider.value) || 2;
    const lossPercent = parseInt(lossSlider.value) || 0;

    const newWidth = Math.round(originalImage.width * scaleFactor);
    const newHeight = Math.round(originalImage.height * scaleFactor);

    resultCanvas.width = newWidth;
    resultCanvas.height = newHeight;

    const ctx = resultCanvas.getContext('2d');

    if (lossPercent > 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(originalImage, 0, 0, newWidth, newHeight);

        const shrinkFactor = 1 - (lossPercent / 100);
        const smallWidth = Math.max(1, Math.floor(newWidth * shrinkFactor));
        const smallHeight = Math.max(1, Math.floor(newHeight * shrinkFactor));

        const shrinkCanvas = document.createElement('canvas');
        shrinkCanvas.width = smallWidth;
        shrinkCanvas.height = smallHeight;
        const shrinkCtx = shrinkCanvas.getContext('2d');
        shrinkCtx.imageSmoothingEnabled = true;
        shrinkCtx.imageSmoothingQuality = 'medium';
        shrinkCtx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight);

        ctx.drawImage(shrinkCanvas, 0, 0, smallWidth, smallHeight, 0, 0, newWidth, newHeight);
    } else {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);
    }

    resultSizeValue.textContent = `${newWidth} x ${newHeight} px`;
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = translations[currentLang].filename + '.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
});

resetBtn.addEventListener('click', () => {
    originalImage = null;
    fileInput.value = '';
    settingsSection.style.display = 'none';
    resultsSection.style.display = 'none';
});

window.addEventListener('resize', () => {
    if (originalImage) {
        drawPreview();
    }
});

init();
