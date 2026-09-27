# Generador de prompts web multiplataforma

Aplicación web (HTML + CSS + JavaScript, sin build) que genera prompts profesionales en dos modos:

- **Desarrollo web**: Google AI Studio, Google Cloud Studio (Vertex AI / Firebase Studio), ChatGPT, Antigravity y Codex.
- **Diseño UI**: Google Stitch, Claude Design, Figma Make y v0.

Ambos se adaptan a:

- **Tipo de proyecto**: landing, corporativa, portfolio, e-commerce, blog, SaaS, escuela/academia, restaurante, evento y negocio local.
- **SEO**: de básico a técnico completo (palabras clave, JSON-LD específico por tipo de proyecto, Open Graph, sitemap, Core Web Vitals, SEO local, hreflang, búsqueda con IA).
- **Animaciones GSAP**: intensidad (sutil → inmersiva), plugins (ScrollTrigger, SplitText, Flip, ScrollSmoother…) y reglas técnicas (reduced motion, mejora progresiva, sin penalizar LCP/CLS).
- **Stack**: HTML vanilla, Astro, Next.js, React + Vite, Nuxt o SvelteKit.

## Cómo se adapta a cada plataforma

| Plataforma | Formato | Salida |
|---|---|---|
| Google AI Studio | Secciones con etiquetas XML | Instrucciones del sistema + prompt |
| Google Cloud Studio | Etiquetas XML + despliegue en Cloud Run / Firebase Hosting | Instrucciones del sistema + prompt |
| ChatGPT | Markdown, trabajo por fases | Prompt único |
| Antigravity | Markdown con flujo plan → implementación → verificación en navegador | Prompt de tarea + reglas del workspace |
| Codex | Markdown con flujo de agente, commits y verificación | Prompt de tarea + `AGENTS.md` |
| Google Stitch | Prompt inicial compacto + un prompt por pantalla y prompts de ajuste | Prompt inicial + pantallas + especificación de movimiento |
| Claude Design | Brief completo: sistema de diseño primero, variantes y entrega a desarrollo | Prompt de diseño |
| Figma Make | Brief orientado a prototipo con Auto Layout, variables y componentes | Prompt de diseño |
| v0 | Brief de UI en React + Tailwind + shadcn/ui | Prompt de diseño |

En el modo **Diseño UI** se configuran además el dispositivo, la fidelidad (wireframe, alta fidelidad o prototipo), la base del sistema de diseño, las variantes y los estados. El SEO se traduce en jerarquía de contenido y las animaciones en una especificación de movimiento lista para implementarse con GSAP.

## Funciones

- Vista previa en vivo, indicador de completitud del briefing y recuento aproximado de tokens.
- Copiar por bloque o todo, descargar como `.md` y compartir la configuración mediante enlace.
- La configuración se guarda en `localStorage` (solo en tu navegador).
- La interfaz usa GSAP para sus propias animaciones, respeta `prefers-reduced-motion` y funciona aunque GSAP no cargue.

## Uso

Abre `index.html` en el navegador o sírvelo en local:

```bash
python3 -m http.server 8000
# o
npx serve .
```

Publicada en **https://generador-prompt.vercel.app**. También se puede publicar tal cual en GitHub Pages.

### Despliegue en Vercel

No requiere build: `vercel.json` sirve los archivos estáticos con cabeceras de seguridad y caché.

- **Desde el panel**: *Add New › Project*, importa este repositorio, deja *Framework Preset* en «Other» y sin comando de build, y pulsa *Deploy*. Cada push a la rama de producción se despliega automáticamente.
- **Desde la terminal**: `npx vercel` (vista previa) y `npx vercel --prod` (producción).

## Estructura

- `index.html` — interfaz y metadatos SEO de la propia app.
- `styles.css` — estilos con tokens, modo claro/oscuro y diseño responsive.
- `data.js` — plataformas, stacks, tipos de proyecto y plugins GSAP (fácil de ampliar).
- `app.js` — estado, construcción del prompt por plataforma y renderizado.
