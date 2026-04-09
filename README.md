# 🛡️ Sonora Delictiva: Dashboard Interactivo de Inteligencia
Un sistema moderno de visualización y análisis de datos enfocados en la seguridad ciudadana e inteligencia delictiva del estado de Sonora, México. 

> [!WARNING]
> 🚧 **Aviso de Desarrollo:** Este proyecto se encuentra actualmente **en proceso** y no está terminado. El código, datos y estructura seguirán en esquema de mejora continua.

Basado en la filosofía de **Datos Abiertos**, este tablero extrae y procesa los históricos del Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública (SESNSP) mediante una canalización automatizada en Python, montando posteriormente una aplicación React con estética y responsividad de última generación.

![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Plotly](https://img.shields.io/badge/Plotly-239120?style=for-the-badge&logo=plotly&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

---

## ✨ Características Principales

*   **⚡ Arquitectura SPA de Alta Velocidad:** Interfaz desarrollada sobre ecosistema React + Vite para máxima reactividad.
*   **📊 Analítica Inteligente en Tiempo Real:** Filtros cruzados (*Año*, *Subtipo de Delito*, *Municipio*) aplicables en instantes gracias al computo por tensores en cliente.
*   **🧩 Módulos Analíticos Dedicados:** Separación de análisis por Tendencias, Patrones Municipales y Demografía/Proporcionalidad de Víctimas.
*   **🌡️ Heatmaps y Métricas (KPIs):** Detección térmica algorítmica y monitores estadísticos calculando el crecimiento o decremento (MoM %) delictivo.
*   **📥 Open Data Export:** Acceso directo a descargar el *Data Frame* tabular (.CSV) con exportaciones que respetan tu entorno de filtros dinámico.
*   **🖼️ Glassmorphism Design:** Diseño *Premium* UI/UX priorizando el modo oscuro puro, tarjetas cristalizadas translucidas sin estorbar la lectura analítica.

## 🛠️ Pipeline de Datos ETL (Backend)
El proyecto contiene un motor en Python que se encarga de estandarizar la caótica data gubernamental:

1.  Recibe sábanas horizontales oficiales del **SESNSP** `(.csv/.xlsx)`.
2.  Despivotiza (*melt*) las series a un formato columnar `long data format` compatible.
3.  Calcula los campos de índice, fusiona las claves territoriales y destila *DataFrames* minimizados.
4.  Exporta un CSV final transparente y pre-rendido directamente a `/public/data/` para ser asimilado por el Dashboard web de manera silenciosa.

```bash
# Para actualizar los datos con archivos nuevos:
python scripts/00_preparar_datos.py
```

## 🚀 Despliegue e Instalación Local (Frontend)

Ejecutar este proyecto en tu entorno local no te tomará más de dos minutos. Necesitarás [Node.js](https://nodejs.org/) instalado.

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/TU_USUARIO/sonora-delictiva.git
    cd sonora-delictiva
    ```
2.  **Instala las dependencias UI:**
    ```bash
    npm install
    ```
3.  **Inicia el Servidor Interactivo (Modo Desarrollo):**
    ```bash
    npm run dev
    ```
    Visita `http://localhost:5173/` en tu navegador.

## 🤝 Créditos y Fuentes
Datos recopilados, curados y actualizados provenientes de la institución abierta: **Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública**.

---
*Este proyecto de ingeniería de datos y desarrollo front-end es para fines demostrativos y de concientización pública.*

Link al Tablero

https://analisis-datos.github.io/sonora-delictiva/
