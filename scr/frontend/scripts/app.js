        // Estado de la aplicación
        const AppState = {
            currentImage: null,
            extractedText: '',
            processing: false,
            cvReady: false
        };

        // Inicialización cuando OpenCV está listo
        function onOpenCvReady() {
            AppState.cvReady = true;
            console.log('OpenCV loaded, ready for image processing');
        }

        // Preprocesamiento de imagen con OpenCV
        function preprocessImage(imageData) {
            if (!AppState.cvReady) {
                console.warn('OpenCV not ready, skipping preprocessing');
                return imageData;
            }

            try {
                // Convertir la imagen a matriz de OpenCV
                const img = cv.imread(imageData);
                
                // Convertir a escala de grises
                const gray = new cv.Mat();
                cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);
                
                // Aplicar desenfoque gaussiano para reducir ruido
                const blurred = new cv.Mat();
                cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0);
                
                // Aplicar umbral adaptativo
                const thresholded = new cv.Mat();
                cv.adaptiveThreshold(blurred, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
                
                // Mejorar el contraste con ecualización de histograma (solo para imágenes en escala de grises)
                const equalized = new cv.Mat();
                cv.equalizeHist(thresholded, equalized);
                
                // Convertir de vuelta a ImageData
                const processedImage = new ImageData(
                    new Uint8ClampedArray(equalized.data),
                    equalized.cols,
                    equalized.rows
                );
                
                // Liberar memoria
                img.delete();
                gray.delete();
                blurred.delete();
                thresholded.delete();
                equalized.delete();
                
                return processedImage;
            } catch (error) {
                console.error('Error in OpenCV processing:', error);
                return imageData;
            }
        }

        // Procesamiento de texto específico para MOBAs
        function processMobaText(text, gameType) {
            if (!text) return '';
            
            // Correcciones comunes de OCR
            let processed = text
                .replace(/[Il1]/g, match => {
                    // Contextual replacement for I, l, 1 confusion
                    if (/[0-9]/.test(text.charAt(text.indexOf(match) + 1))) return '1';
                    return match;
                })
                .replace(/[O0]/g, match => {
                    // Contextual replacement for O and 0
                    if (/[0-9]/.test(text.charAt(text.indexOf(match) - 1)) && 
                        /[0-9]/.test(text.charAt(text.indexOf(match) + 1))) return '0';
                    return match;
                })
                .replace(/\//g, ' / ') // Ensure spaces around slashes for K/D/A
                .replace(/\s+/g, ' ')   // Normalize whitespace
                .trim();
            
            // Patrones específicos para cada juego
            const patterns = {
                kda: /(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/g,
                player: /([a-zA-Z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]{2,16})/g,
                score: /(\d+\.\d+)/g,
                level: /Level\s*(\d+)/gi
            };
            
            // Aplicar procesamiento específico según el tipo de juego
            switch (gameType) {
                case 'onmyoji':
                    // Onmyoji Arena tiene nombres de personajes y jugadores en CJK
                    processed = processed.replace(/([\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+)\s*([a-zA-Z0-9])/g, '$1 $2');
                    break;
                case 'honor':
                    // Honor of Kings tiene formato específico
                    processed = processed.replace(/(\d+)\/(\d+)\/(\d+)/g, '$1/$2/$3');
                    break;
                case 'wildrift':
                    // Wild Rift tiene formato occidental
                    processed = processed.replace(/([a-zA-Z])(\d)/g, '$1 $2');
                    break;
                case 'ml':
                    // Mobile Legends
                    processed = processed.replace(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/g, '$1/$2/$3');
                    break;
            }
            
            return processed;
        }

        // Analizar texto para extraer datos estructurados
        function parseMatchData(text) {
            const result = {
                date: '',
                duration: '',
                type: 'Normal',
                players: [],
                teams: {
                    team1: { kills: 0, deaths: 0, assists: 0 },
                    team2: { kills: 0, deaths: 0, assists: 0 }
                }
            };
            
            // Expresiones regulares para buscar información
            const datePattern = /\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/;
            const timePattern = /\b(\d{1,2}:\d{2})\b/;
            const rankedPattern = /ranked|clasificatoria|clasificatorias/gi;
            const kdaPattern = /(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/g;
            const scorePattern = /\b(\d+\.\d+)\b/g;
            
            // Buscar fecha
            const dateMatch = text.match(datePattern);
            if (dateMatch) result.date = dateMatch[1];
            
            // Buscar duración
            const timeMatch = text.match(timePattern);
            if (timeMatch) result.duration = timeMatch[1];
            
            // Buscar tipo de partida
            if (rankedPattern.test(text)) result.type = 'Ranked';
            
            // Buscar K/D/A y puntuaciones (ejemplo simplificado)
            let kdaMatch;
            while ((kdaMatch = kdaPattern.exec(text)) !== null) {
                const kills = parseInt(kdaMatch[1]);
                const deaths = parseInt(kdaMatch[2]);
                const assists = parseInt(kdaMatch[3]);
                
                // Aquí iría lógica más compleja para asociar K/D/A con jugadores
                // Esto es solo un ejemplo simplificado
                result.players.push({
                    kda: `${kills}/${deaths}/${assists}`,
                    kills,
                    deaths,
                    assists
                });
            }
            
            return result;
        }

        // Inicializar la aplicación cuando el DOM esté listo
        document.addEventListener('DOMContentLoaded', () => {
            // Referencias a elementos DOM
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
                analysisSection: document.getElementById('analysisSection'),
                processingOverlay: document.getElementById('processingOverlay'),
                overlayProgressBar: document.getElementById('overlayProgressBar'),
                overlayStatus: document.getElementById('overlayStatus'),
                imagePreview: document.getElementById('imagePreview'),
                uploadPlaceholder: document.getElementById('uploadPlaceholder'),
                gameSelect: document.getElementById('gameSelect'),
                processingMode: document.getElementById('processingMode')
            };
            
            // Funciones de utilidad
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
            
            DOM.dropZone.addEventListener('click', () => {
                DOM.fileInput.click();
            });
            
            DOM.fileInput.addEventListener('change', (e) => {
                handleFiles(e.target.files);
            });
            
            function handleFiles(files) {
                if (files.length > 0 && files[0].type.match('image.*')) {
                    const file = files[0];
                    const reader = new FileReader();
                    
                    reader.onload = (e) => {
                        AppState.currentImage = e.target.result;
                        
                        // Mostrar vista previa
                        hide(DOM.uploadPlaceholder);
                        show(DOM.imagePreview);
                        DOM.imagePreview.querySelector('img').src = AppState.currentImage;
                        
                        setBtnState(true);
                    };
                    
                    reader.readAsDataURL(file);
                }
            }
            
            // Evento para procesar la imagen
            DOM.processBtn.addEventListener('click', async () => {
                if (!AppState.currentImage) {
                    alert('Por favor, sube una imagen primero.');
                    return;
                }
                
                const gameType = DOM.gameSelect.value === 'auto' ? 'auto' : DOM.gameSelect.value;
                const processingMode = DOM.processingMode.value;
                
                // Preparar interfaz
                hide(DOM.resultContainer);
                hide(DOM.placeholder);
                show(DOM.progressContainer);
                setBtnState(false);
                showProcessingOverlay(true);
                
                try {
                    if (processingMode === 'frontend') {
                        // Procesamiento con Tesseract en el frontend
                        const result = await Tesseract.recognize(
                            AppState.currentImage,
                            gameType === 'onmyoji' ? 'jpn+eng' : 'eng',
                            { 
                                logger: message => updateProgress(message, DOM.overlayProgressBar, DOM.overlayStatus),
                                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                                tessedit_char_whitelist: gameType === 'onmyoji' ? 
                                    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ/-:.%()KDA/ あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン一二三四五六七八九十' :
                                    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ/-:.%()KDA/ '
                            }
                        );
                        
                        AppState.extractedText = processMobaText(result.data.text, gameType);
                        DOM.ocrResult.textContent = AppState.extractedText;
                        
                        // Parsear y mostrar análisis
                        const matchData = parseMatchData(AppState.extractedText);
                        updateAnalysisUI(matchData);
                        
                    } else if (processingMode === 'backend') {
                        // Aquí iría la lógica para enviar al backend con PaddleOCR
                        alert('Modo backend no disponible en esta versión. Usando Tesseract.js en su lugar.');
                        DOM.processingMode.value = 'frontend';
                        DOM.processBtn.click();
                        return;
                    }
                    
                    // Mostrar resultados
                    show(DOM.resultContainer);
                    show(DOM.analysisSection);
                    setBtnState(true);
                    
                } catch (err) {
                    console.error(err);
                    alert('Error al procesar la imagen: ' + err.message);
                } finally {
                    hide(DOM.progressContainer);
                    showProcessingOverlay(false);
                    DOM.processBtn.disabled = false;
                }
            });
            
            function updateProgress(message, progressBar, statusElement) {
                if (message.status === 'recognizing text' && message.progress > 0) {
                    const progress = Math.round(message.progress * 100);
                    progressBar.style.width = `${progress}%`;
                    
                    if (progress < 25) {
                        statusElement.textContent = 'Inicializando motor OCR...';
                    } else if (progress < 50) {
                        statusElement.textContent = 'Analizando estructura de imagen...';
                    } else if (progress < 75) {
                        statusElement.textContent = 'Extrayendo texto...';
                    } else if (progress < 90) {
                        statusElement.textContent = 'Procesando datos de partida...';
                    } else {
                        statusElement.textContent = 'Finalizando...';
                    }
                }
            }
            
            function updateAnalysisUI(matchData) {
                // Actualizar la UI con los datos analizados
                // Esta es una implementación simplificada
                document.getElementById('matchDate').textContent = matchData.date || '25/09/01';
                document.getElementById('matchDuration').textContent = matchData.duration || '12:32';
                document.getElementById('matchType').textContent = matchData.type;
                
                // Calcular totales de equipos (simplificado)
                let team1Kills = 0, team1Deaths = 0, team1Assists = 0;
                let team2Kills = 0, team2Deaths = 0, team2Assists = 0;
                
                // Asignar primeros 5 jugadores al equipo 1, últimos 5 al equipo 2
                matchData.players.forEach((player, index) => {
                    if (index < 5) {
                        team1Kills += player.kills;
                        team1Deaths += player.deaths;
                        team1Assists += player.assists;
                    } else {
                        team2Kills += player.kills;
                        team2Deaths += player.deaths;
                        team2Assists += player.assists;
                    }
                });
                
                // Actualizar estadísticas de equipos
                document.getElementById('team1Kills').textContent = team1Kills;
                document.getElementById('team1Deaths').textContent = team1Deaths;
                document.getElementById('team1Assists').textContent = team1Assists;
                document.getElementById('team1KdRatio').textContent = (team1Kills / Math.max(team1Deaths, 1)).toFixed(2);
                
                document.getElementById('team2Kills').textContent = team2Kills;
                document.getElementById('team2Deaths').textContent = team2Deaths;
                document.getElementById('team2Assists').textContent = team2Assists;
                document.getElementById('team2KdRatio').textContent = (team2Kills / Math.max(team2Deaths, 1)).toFixed(2);
                
                // Encontrar MVP (jugador con mejor KDA)
                let mvp = {kda: '0/0/0'};
                if (matchData.players.length > 0) {
                    mvp = matchData.players.reduce((best, player) => {
                        const bestKda = best.kills + best.assists - best.deaths;
                        const playerKda = player.kills + player.assists - player.deaths;
                        return playerKda > bestKda ? player : best;
                    });
                }
                
                document.getElementById('matchKda').textContent = mvp.kda;
                document.getElementById('mvpKda').textContent = mvp.kda;
                
                // Animación de barras de estadísticas
                setTimeout(() => {
                    document.querySelectorAll('.stats-bar').forEach(bar => {
                        bar.style.width = bar.style.width;
                    });
                }, 100);
            }
            
            // Evento para limpiar la interfaz
            DOM.clearBtn.addEventListener('click', () => {
                DOM.fileInput.value = '';
                AppState.currentImage = null;
                AppState.extractedText = '';
                
                // Restaurar vista inicial
                show(DOM.uploadPlaceholder);
                hide(DOM.imagePreview);
                hide(DOM.progressContainer);
                hide(DOM.resultContainer);
                hide(DOM.analysisSection);
                show(DOM.placeholder);
                setBtnState(false);
            });
            
            // Evento para copiar texto
            DOM.copyBtn.addEventListener('click', () => {
                if (!AppState.extractedText) return;
                
                navigator.clipboard.writeText(AppState.extractedText)
                    .then(() => {
                        const originalText = DOM.copyBtn.innerHTML;
                        DOM.copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> ¡Copiado!';
                        setTimeout(() => DOM.copyBtn.innerHTML = originalText, 2000);
                    })
                    .catch(err => console.error('Error al copiar: ', err));
            });
            
            // Evento para descargar texto
            DOM.downloadBtn.addEventListener('click', () => {
                if (!AppState.extractedText) return;
                
                const blob = new Blob([AppState.extractedText], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'resultado-ocr.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            });
            
            // Inicializar estado de los botones
            setBtnState(false);
        })
</html>
