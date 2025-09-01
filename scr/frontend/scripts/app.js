// Estado de la aplicación
const AppState = {
    currentImage: null,
    extractedText: '',
    processing: false,
    cvReady: false
};

// Referencias al DOM
const DOM = {
    fileInput: document.getElementById('fileInput'),
    imagePreview: document.getElementById('previewImg'),
    uploadPlaceholder: document.getElementById('placeholder'),
    gameSelect: document.getElementById('gameSelect'),
    processingMode: document.getElementById('processingMode'),
    processBtn: document.getElementById('processBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressStatus: document.getElementById('progressStatus'),
    progressValue: document.getElementById('progressValue'),
    resultsContent: document.getElementById('resultsContent'),
    ocrResult: document.getElementById('ocrResult'),
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    clearBtn: document.getElementById('clearBtn'),
    analysisSection: document.getElementById('analysisSection'),
    playersTable: document.getElementById('playersTable'),
    playersTableBody: document.getElementById('playersTableBody'),
    processingOverlay: document.getElementById('processingOverlay'),
    overlayProgressBar: document.getElementById('overlayProgressBar'),
    overlayStatus: document.getElementById('overlayStatus'),
    matchDate: document.getElementById('matchDate'),
    matchDuration: document.getElementById('matchDuration'),
    matchType: document.getElementById('matchType'),
    mvpKda: document.getElementById('mvpKda'),
    matchKda: document.getElementById('matchKda')
};

// Funciones de utilidad
const hide = (el) => el?.classList.add('hidden');
const show = (el) => el?.classList.remove('hidden');
const toggleOpacity = (el, enable) => el?.classList.toggle('opacity-50', !enable);
const setBtnState = (enable) => {
    DOM.processBtn.disabled = !enable;
    DOM.copyBtn.disabled = !enable;
    DOM.downloadBtn.disabled = !enable;
    toggleOpacity(DOM.copyBtn, enable);
    toggleOpacity(DOM.downloadBtn, enable);
};
const showProcessingOverlay = (show) => {
    DOM.processingOverlay.style.display = show ? 'flex' : 'none';
    AppState.processing = show;
};

// Configurar eventos de drag and drop
const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
};

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    document.addEventListener(eventName, () => {
        document.body.style.opacity = '0.8';
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, () => {
        document.body.style.opacity = '1';
    }, false);
});

document.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    }
}, false);

DOM.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

// Manejar archivo
function handleFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
        AppState.currentImage = e.target.result;
        DOM.imagePreview.src = AppState.currentImage;
        show(DOM.imagePreview);
        hide(DOM.uploadPlaceholder);
        processImage();
    };
    reader.readAsDataURL(file);
}

// Preprocesamiento con OpenCV.js
async function preprocessImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            try {
                const mat = cv.imread(canvas);
                
                // Convertir a escala de grises
                const gray = new cv.Mat();
                cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);
                
                // Desenfocar para reducir ruido
                const blurred = new cv.Mat();
                cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0, 0);
                
                // Aplicar umbral adaptativo
                const thresholded = new cv.Mat();
                cv.adaptiveThreshold(blurred, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
                
                // Mejorar el contraste con ecualización de histograma
                const equalized = new cv.Mat();
                cv.equalizeHist(thresholded, equalized);
                
                // Convertir de vuelta a ImageData
                const processedImage = new ImageData(new Uint8ClampedArray(equalized.data), equalized.cols, equalized.rows);
                
                // Liberar memoria
                mat.delete(); gray.delete(); blurred.delete(); thresholded.delete(); equalized.delete();
                
                resolve(processedImage);
            } catch (error) {
                reject(error);
            }
        };
        img.src = imageSrc;
    });
}

// Actualizar barra de progreso
function updateProgress(message, progressBar, statusElement) {
    if (message.status === 'recognizing text') {
        const progress = Math.round(message.progress * 100);
        progressBar.style.width = `${progress}%`;
        statusElement.textContent = `${progress}%`;
        
        DOM.progressStatus.textContent = 
            progress < 30 ? 'Cargando modelo...' :
            progress < 70 ? 'Reconociendo texto...' : 'Finalizando';
    }
}

// Procesar imagen
async function processImage() {
    if (!AppState.currentImage) return;
    
    const gameType = DOM.gameSelect.value === 'auto' ? 'auto' : DOM.gameSelect.value;
    const processingMode = DOM.processingMode.value;

    hide(DOM.resultsContent);
    hide(DOM.analysisSection);
    hide(DOM.uploadPlaceholder);
    show(DOM.progressContainer);
    setBtnState(false);
    showProcessingOverlay(true);

    try {
        let rawText = '';

        if (processingMode === 'frontend') {
            // Esperar a que OpenCV esté listo
            await new Promise(resolve => {
                if (cv.getBuildInformation) resolve();
                else window.onOpenCvReady = resolve;
            });

            // Preprocesar imagen
            const processedImage = await preprocessImage(AppState.currentImage);
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = processedImage.width;
            tempCanvas.height = processedImage.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(processedImage, 0, 0);

            // Detectar juego para elegir idioma
            const lang = gameType === 'onmyoji' ? 'jpn+eng' : 
                       gameType === 'honor' ? 'chi_sim+eng' : 'eng+spa';

            // OCR con Tesseract.js
            const result = await Tesseract.recognize(
                tempCanvas,
                lang,
                {
                    logger: message => updateProgress(message, DOM.progressBar, DOM.progressStatus),
                    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ/-:.%()KDA '
                }
            );
            rawText = result.data.text;
        } else if (processingMode === 'backend') {
            alert('Modo backend no disponible. Usa Tesseract.js.');
            return;
        }

        // Post-procesar texto
        const cleanedText = postProcessText(rawText, gameType);
        AppState.extractedText = cleanedText;

        // Mostrar resultados
        DOM.ocrResult.textContent = cleanedText;
        
        // Analizar datos
        const matchData = parseMatchData(cleanedText);
        displayMatchData(matchData);
        
        show(DOM.resultsContent);
        show(DOM.analysisSection);
        setBtnState(true);
        
    } catch (err) {
        console.error('Error:', err);
        alert('Error al procesar la imagen: ' + err.message);
    } finally {
        hide(DOM.progressContainer);
        showProcessingOverlay(false);
        setBtnState(true);
    }
}

// Post-procesar texto por juego
function postProcessText(text, gameType) {
    let processed = text.replace(/\s+/g, ' ').trim();
    
    switch (gameType) {
        case 'onmyoji':
            // Manejar caracteres CJK
            processed = processed.replace(/([\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+)\s*([a-zA-Z0-9])/g, '$1 $2');
            break;
        case 'honor':
            processed = processed.replace(/(\d+)\/(\d+)\/(\d+)/g, '$1/$2/$3');
            break;
        case 'wildrift':
            processed = processed.replace(/([a-zA-Z])(\d)/g, '$1 $2');
            break;
        case 'ml':
            processed = processed.replace(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/g, '$1/$2/$3');
            break;
    }
    return processed;
}

// Analizar datos de la partida
function parseMatchData(text) {
    const result = {
        date: '',
        duration: '',
        type: 'Normal',
        players: []
    };

    // Detectar tipo de partida
    if (/ranked|clasificatoria|rank/i.test(text)) result.type = 'Ranked';
    if (/normal|matchmaking/i.test(text)) result.type = 'Normal';

    // Detectar fecha
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{2})/);
    if (dateMatch) result.date = dateMatch[1];

    // Detectar duración
    const durationMatch = text.match(/(\d+:\d+)/);
    if (durationMatch) result.duration = durationMatch[1];

    // Detectar K/D/A
    const kdaMatches = [...text.matchAll(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/g)];
    const scores = [...text.matchAll(/\b(\d+\.\d+)\b/g)].map(m => parseFloat(m[1]));

    // Crear lista de jugadores
    kdaMatches.forEach((match, index) => {
        const [kills, deaths, assists] = match.slice(1).map(Number);
        const score = scores[index] || 0;
        const playerName = `Jugador ${index + 1}`;
        const champion = 'Desconocido';
        const level = 15;

        result.players.push({
            name: playerName,
            champion,
            level,
            kda: `${kills}/${deaths}/${assists}`,
            kills,
            deaths,
            assists,
            score
        });
    });

    // Determinar MVP
    if (result.players.length > 0) {
        const mvp = result.players.reduce((a, b) => (a.score > b.score ? a : b));
        mvp.isMVP = true;
        result.mvp = mvp;
    }

    return result;
}

// Mostrar datos analizados
function displayMatchData(matchData) {
    DOM.matchDate.textContent = matchData.date || '--/--/--';
    DOM.matchDuration.textContent = matchData.duration || '--:--';
    DOM.matchType.textContent = matchData.type;
    
    if (matchData.mvp) {
        DOM.mvpKda.textContent = matchData.mvp.kda;
        DOM.matchKda.textContent = matchData.mvp.score || '--';
    }

    // Rellenar tabla
    DOM.playersTableBody.innerHTML = matchData.players.map(player => `
        <tr>
            <td class="p-3 font-semibold">${player.name}</td>
            <td class="p-3">${player.champion}</td>
            <td class="p-3">${player.level}</td>
            <td class="p-3 text-green-400">${player.kda}</td>
            <td class="p-3 font-bold ${player.score > 10 ? 'text-yellow-400' : 'text-gray-400'}">${player.score || '--'}</td>
            <td class="p-3">${player.isMVP ? '<i class="fas fa-crown text-yellow-500"></i>' : ''}</td>
        </tr>
    `).join('');

    show(DOM.playersTable);
    
    // Animar barras
    setTimeout(() => {
        document.querySelectorAll('.stats-bar').forEach(bar => {
            bar.style.width = bar.style.width;
        });
    }, 100);
}

// Eventos de botones
DOM.copyBtn.addEventListener('click', () => {
    if (!AppState.extractedText) return;
    navigator.clipboard.writeText(AppState.extractedText)
        .then(() => {
            const originalText = DOM.copyBtn.innerHTML;
            DOM.copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> ¡Copiado!';
            setTimeout(() => DOM.copyBtn.innerHTML = originalText, 2000);
        })
        .catch(err => console.error('Error al copiar:', err));
});

DOM.downloadBtn.addEventListener('click', () => {
    if (!AppState.extractedText) return;
    const blob = new Blob([AppState.extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mizu-ocr-resultado.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

DOM.clearBtn.addEventListener('click', () => {
    DOM.fileInput.value = '';
    AppState.currentImage = null;
    AppState.extractedText = '';
    
    hide(DOM.imagePreview);
    hide(DOM.resultsContent);
    hide(DOM.analysisSection);
    hide(DOM.progressContainer);
    show(DOM.uploadPlaceholder);
    setBtnState(false);
});

// Inicializar estado de los botones
setBtnState(false);

// OpenCV listo
window.onOpenCvReady = () => {
    console.log('OpenCV.js está listo');
    AppState.cvReady = true;
};
