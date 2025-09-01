document.addEventListener('DOMContentLoaded', () => {
    // 1. Centralizar la gestión de elementos del DOM
    const DOM = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        processBtn: document.getElementById('processBtn'),
        clearBtn: document.getElementById('clearBtn'),
        copyBtn: document.getElementById('copyBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        progressContainer: document.getElementById('progressContainer'),
        progressBar: document.getElementById('progressBar'),
        progressStatus: document.getElementById('progressStatus'),
        progressValue: document.getElementById('progressValue'),
        resultContainer: document.getElementById('resultContainer'),
        ocrResult: document.getElementById('ocrResult'),
        placeholder: document.getElementById('placeholder'),
    };
    
    // 2. Gestionar el estado de la aplicación
    let currentImage = null;
    let extractedText = '';

    // 3. Funciones de ayuda
    const hide = (el) => el.classList.add('hidden');
    const show = (el) => el.classList.remove('hidden');
    const toggleOpacity = (el, enable) => el.classList.toggle('opacity-50', !enable);
    const setBtnState = (enable) => {
        DOM.processBtn.disabled = !enable;
        DOM.copyBtn.disabled = !enable;
        DOM.downloadBtn.disabled = !enable;
        toggleOpacity(DOM.copyBtn, enable);
        toggleOpacity(DOM.downloadBtn, enable);
    };

    // 4. Lógica de Drag & Drop y selección de archivo
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        DOM.dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        DOM.dropZone.addEventListener(eventName, () => {
            DOM.dropZone.classList.add('border-blue-500');
            DOM.dropZone.classList.remove('border-blue-400');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        DOM.dropZone.addEventListener(eventName, () => {
            DOM.dropZone.classList.remove('border-blue-500');
            DOM.dropZone.classList.add('border-blue-400');
        }, false);
    });

    DOM.dropZone.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    }, false);

    DOM.fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    const handleFiles = (files) => {
        if (files.length > 0 && files[0].type.match('image.*')) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImage = e.target.result;
                DOM.dropZone.innerHTML = `
                    <img src="${currentImage}" class="max-h-48 mx-auto mb-2 rounded" alt="Vista previa">
                    <p class="text-gray-300 text-sm">${file.name}</p>
                `;
                setBtnState(true);
            };
            reader.readAsDataURL(file);
        }
    };

    // 5. Procesamiento con Tesseract
    const updateProgress = (message) => {
        if (message.status === 'recognizing text' && message.progress > 0) {
            const progress = Math.round(message.progress * 100);
            DOM.progressBar.style.width = `${progress}%`;
            DOM.progressValue.textContent = `${progress}%`;
            DOM.progressStatus.textContent = 
                progress < 30 ? 'Analizando estructura...' :
                progress < 70 ? 'Extrayendo texto...' :
                'Finalizando...';
        }
    };
    
    DOM.processBtn.addEventListener('click', async () => {
        if (!currentImage) {
            alert('Por favor, sube una imagen primero.');
            return;
        }

        hide(DOM.resultContainer);
        hide(DOM.placeholder);
        show(DOM.progressContainer);
        setBtnState(false);
        DOM.processBtn.disabled = true;

        try {
            const result = await Tesseract.recognize(currentImage, 'eng+spa', { logger: updateProgress });
            extractedText = result.data.text;
            DOM.ocrResult.textContent = extractedText;
            
            show(DOM.resultContainer);
            hide(DOM.progressContainer);
            setBtnState(true);
        } catch (err) {
            console.error(err);
            alert('Error al procesar la imagen: ' + err.message);
        } finally {
            DOM.processBtn.disabled = false;
        }
    });

    // 6. Funcionalidad de Copiar y Descargar
    DOM.copyBtn.addEventListener('click', () => {
        if (!extractedText) return;
        navigator.clipboard.writeText(extractedText)
            .then(() => {
                const originalText = DOM.copyBtn.innerHTML;
                DOM.copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> ¡Copiado!';
                setTimeout(() => DOM.copyBtn.innerHTML = originalText, 2000);
            })
            .catch(err => console.error('Error al copiar: ', err));
    });

    DOM.downloadBtn.addEventListener('click', () => {
        if (!extractedText) return;
        const blob = new Blob([extractedText], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'resultado-ocr.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

    // 7. Limpiar la interfaz
    DOM.clearBtn.addEventListener('click', () => {
        DOM.fileInput.value = '';
        currentImage = null;
        extractedText = '';
        
        DOM.dropZone.innerHTML = `
            <i class="fas fa-cloud-upload-alt text-blue-400 text-5xl mb-4"></i>
            <p class="text-gray-300">Arrastra tu imagen aquí o</p>
            <label for="fileInput" class="cursor-pointer mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-300 inline-block">
                <i class="fas fa-search mr-2"></i> Seleccionar archivo
            </label>
        `;
        hide(DOM.progressContainer);
        hide(DOM.resultContainer);
        show(DOM.placeholder);
        setBtnState(false);
    });
});
