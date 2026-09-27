# Generador de prompts web multiplataforma

Aplicación web (HTML + CSS + JavaScript, sin build) que genera prompts profesionales para crear sitios web con IA, adaptados a:

- **Plataforma**: Google AI Studio, Google Cloud Studio (Vertex AI / Firebase Studio), ChatGPT, Antigravity y Codex.
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

Se puede publicar tal cual en GitHub Pages.

## Estructura

- `index.html` — interfaz y metadatos SEO de la propia app.
- `styles.css` — estilos con tokens, modo claro/oscuro y diseño responsive.
- `data.js` — plataformas, stacks, tipos de proyecto y plugins GSAP (fácil de ampliar).
- `app.js` — estado, construcción del prompt por plataforma y renderizado.
