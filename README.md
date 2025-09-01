# Mizu-OCR 🕵️‍♂️📄

> **OCR especializado en capturas de resultados de juegos MOBA**  
> Desarrollado por *Mizu Legends Studios*  
> Extrae texto, estadísticas y números de tus partidas en **Mobile Legends, Wild Rift, Honor of Kings y Onmyoji Arena**.

![Mizu-OCR Screenshot](https://i.imgur.com/placeholder-screenshot.png)  
*(Reemplaza con captura real de la interfaz)*

---

## 🎯 ¿Qué es Mizu-OCR?

**Mizu-OCR** es una herramienta web ligera y privada que permite extraer **todo el texto y números** de tus capturas de pantalla de partidas en juegos MOBA. Ideal para jugadores, analistas y creadores de contenido que necesitan convertir resultados visuales en datos textuales para análisis, registros o estadísticas.

✅ Funciona directamente en tu navegador  
✅ **Sin subida de imágenes** — todo se procesa localmente  
✅ Compatible con múltiples juegos MOBA  
✅ Privacidad garantizada: tus datos nunca salen de tu dispositivo

---

## 🎮 Juegos compatibles

- **Mobile Legends: Bang Bang**
- **League of Legends: Wild Rift**
- **Honor of Kings** (Reino de Honor)
- **Onmyoji Arena**

> ✅ Optimizado para reconocer nombres, K/D/A, oro, objetos, tiempos y más.

---

## ⚙️ Tecnología utilizada

- **Tesseract.js**: Motor OCR de código abierto, ejecutado en el navegador
- **Tailwind CSS**: Estilo moderno, responsive y minimalista
- **HTML5 + JavaScript (vanilla)**: Sin frameworks pesados, rápido y eficiente
- **Web Workers (opcional)**: Para mejorar rendimiento en móviles

---

## 💻 Cómo usarlo

1. **Abre el archivo `index.html` en tu navegador** (Chrome, Firefox, Edge recomendados)
2. **Arrastra o selecciona** una captura de pantalla de tu partida
3. Haz clic en **"Procesar imagen"**
4. Espera unos segundos mientras el OCR analiza la imagen
5. **Copia o descarga** el texto extraído

---

## 📥 Resultados

El OCR extrae:
- Nombres de jugadores y campeones
- Estadísticas: **Kills / Muertes / Asistencias (K/D/A)**
- Oro, daño, curación, objetos
- Tiempo de partida, resultado (Victoria/Derrota)
- Porcentajes, niveles y ratios

---

## 🔐 Privacidad y seguridad

🔒 **100% en el cliente**:  
Tus imágenes **nunca se suben a ningún servidor**. Todo el procesamiento ocurre en tu navegador gracias a Tesseract.js.

🛡️ Recomendado para usuarios que valoran su privacidad y no desean enviar datos sensibles a terceros.

---

## 🛠️ Personalización y mejora

¿Quieres adaptar Mizu-OCR a tu juego o mejorar su precisión?

### ✅ Ajustes recomendados

| Archivo | Qué puedes cambiar |
|--------|---------------------|
| `index.html` | Juegos soportados, colores, estilos (Tailwind) |
| `tessedit_char_whitelist` | Añade caracteres específicos (ej: símbolos de oro, íconos) |
| `PSM mode` | Usa `PSM.SINGLE_BLOCK` si el texto es denso |
| `idiomas` | Añade `chi_sim`, `jpn`, `kor` si necesitas otros idiomas |

### Estructura del Repositorio
📁 (raíz)
├── 📄 README.md            ← qué es y cómo usarlo
├── 📄 .gitignore           ← qué no sube a Git
│
├── 📂 src/                 ← todo el código fuente
│   ├── 📂 backend/         ← servidor + IA
│   │   ├── api.py          ← FastAPI
│   │   ├── ocr_model/      ← red neuronal
│   │   └── requirements.txt← pip install -r …
│   │
│   ├── 📂 frontend/        ← web
│   │   ├── index.html
│   │   ├── styles/         ← Tailwind
│   │   └── scripts/        ← JS
│   │
│   └── 📂 mobile/          ← app Android (Kotlin)
│       └── res/            ← XML layouts, imgs
│
├── 📂 data/                ← capturas + etiquetas
│
└── 📂 models/              ← modelos entrenados

### 🧪 Ejemplo: Mejorar precisión para Honor of Kings
```js
Tesseract.recognize(
  currentImage,
  'chi_sim+eng', // Chino simplificado + inglés
  { 
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz击杀/死亡/助攻金钱英雄等级%',
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT
  }
)




