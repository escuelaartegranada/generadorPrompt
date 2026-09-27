/* Generador de prompts multiplataforma — lógica de la interfaz y construcción del prompt. */
(function () {
  'use strict';

  const D = window.PG_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (list, id) => list.find((x) => x.id === id) || list[0];

  const STORAGE_KEY = 'pg-state-v1';
  const DETAIL_RANK = { concise: 0, complete: 1, exhaustive: 2 };
  const LEVEL_RANK = { none: 0, subtle: 1, moderate: 2, immersive: 3 };

  const TEXT_FIELDS = ['projectType', 'stack', 'projectName', 'siteLang', 'description', 'audience', 'cta', 'sections',
    'style', 'palette', 'fonts', 'references', 'keyword', 'keywords2', 'location', 'domain', 'gsapCustom', 'detail', 'scope'];
  const CHECK_FIELDS = ['darkMode', 'mobileFirst', 'a11y', 'seoSchema', 'seoSocial', 'seoSitemap', 'seoCwv', 'seoLocal',
    'seoI18n', 'seoContent', 'askQuestions', 'rulesFile'];
  const LANG_NAMES = { es: 'español', en: 'inglés', 'es,en': 'español e inglés', fr: 'francés', de: 'alemán', it: 'italiano', pt: 'portugués' };

  let activeTab = 0;
  let lastBlocks = [];

  /* ---------- Construcción de la interfaz ---------- */

  function renderControls() {
    $('#platformList').innerHTML = D.platforms.map((p, i) => `
      <label class="platform">
        <input type="radio" name="platform" value="${p.id}" ${i === 0 ? 'checked' : ''}>
        <span class="platform__card">
          <span class="platform__icon" aria-hidden="true">${p.icon}</span>
          <span class="platform__name">${p.name}</span>
          <span class="platform__badge">${p.badge}</span>
        </span>
      </label>`).join('');

    $('#projectType').innerHTML = D.projectTypes.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
    $('#stack').innerHTML = D.stacks.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    $('#gsapPlugins').innerHTML = D.gsapPlugins.map((g) => `
      <label class="check" title="${g.desc.replace(/`/g, '')}">
        <input type="checkbox" name="gsapPlugin" value="${g.id}"> ${g.label}
      </label>`).join('');
  }

  /* ---------- Estado ---------- */

  function readState() {
    const s = {
      platform: ($('input[name="platform"]:checked') || {}).value,
      seoLevel: ($('input[name="seoLevel"]:checked') || {}).value,
      gsapLevel: ($('input[name="gsapLevel"]:checked') || {}).value,
      gsapPlugins: $$('input[name="gsapPlugin"]:checked').map((c) => c.value),
    };
    TEXT_FIELDS.forEach((id) => { s[id] = $('#' + id).value.trim(); });
    CHECK_FIELDS.forEach((id) => { s[id] = $('#' + id).checked; });
    return s;
  }

  function applyState(s) {
    if (!s) return;
    const setRadio = (name, val) => {
      const el = $(`input[name="${name}"][value="${val}"]`);
      if (el) el.checked = true;
    };
    setRadio('platform', s.platform);
    setRadio('seoLevel', s.seoLevel);
    setRadio('gsapLevel', s.gsapLevel);
    TEXT_FIELDS.forEach((id) => { if (typeof s[id] === 'string') $('#' + id).value = s[id]; });
    CHECK_FIELDS.forEach((id) => { if (typeof s[id] === 'boolean') $('#' + id).checked = s[id]; });
    if (Array.isArray(s.gsapPlugins)) {
      $$('input[name="gsapPlugin"]').forEach((c) => { c.checked = s.gsapPlugins.includes(c.value); });
    }
  }

  function save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* almacenamiento no disponible */ }
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }

  function encodeShare(s) {
    const bytes = new TextEncoder().encode(JSON.stringify(s));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeShare(str) {
    try {
      const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }

  function setDefaultPlugins(level) {
    $$('input[name="gsapPlugin"]').forEach((c) => {
      const plugin = byId(D.gsapPlugins, c.value);
      c.checked = level !== 'none' && LEVEL_RANK[plugin.level] <= LEVEL_RANK[level];
    });
  }

  /* ---------- Construcción del prompt ---------- */

  // Un ítem puede ser texto o [nivelMinimo, texto]; se filtra según el nivel de detalle.
  function pick(items, detail) {
    const rank = DETAIL_RANK[detail];
    return items
      .filter(Boolean)
      .filter((it) => !Array.isArray(it) || DETAIL_RANK[it[0]] <= rank)
      .map((it) => (Array.isArray(it) ? it[1] : it));
  }

  function section(key, title, items, s, intro) {
    const lines = pick(items, s.detail);
    if (!lines.length && !intro) return null;
    return { key, title, intro, lines };
  }

  function format(sections, style) {
    return sections.filter(Boolean).map((sec) => {
      const body = [sec.intro, ...sec.lines.map((l) => '- ' + l)].filter(Boolean).join('\n');
      return style === 'xml' ? `<${sec.key}>\n${body}\n</${sec.key}>` : `## ${sec.title}\n${body}`;
    }).join('\n\n');
  }

  function list(str) {
    return str.split(',').map((x) => x.trim()).filter(Boolean);
  }

  function buildSections(s) {
    const P = byId(D.platforms, s.platform);
    const T = byId(D.projectTypes, s.projectType);
    const S = byId(D.stacks, s.stack);
    const name = s.projectName || 'el proyecto';
    const lang = LANG_NAMES[s.siteLang] || s.siteLang;
    const seoOn = s.seoLevel !== 'none';
    const gsapOn = s.gsapLevel !== 'none';
    const multiLang = s.siteLang.includes(',');

    const scopeText = {
      prototype: 'un prototipo visual navegable',
      mvp: 'un MVP funcional',
      production: 'una web completa lista para producción',
    }[s.scope];

    const role = section('rol', 'Rol', [], s, P.role);

    const context = section('contexto', 'Contexto del proyecto', [
      `Proyecto: ${s.projectName || '(sin nombre definido: propón uno provisional)'}`,
      `Tipo: ${T.name}`,
      s.description && `Descripción y objetivo: ${s.description}`,
      `Objetivo de negocio: ${T.goals}`,
      s.audience && `Público objetivo: ${s.audience}`,
      s.cta && `Llamada a la acción principal: «${s.cta}»`,
      `Idioma del contenido: ${lang}`,
    ], s);

    const sectionList = list(s.sections.length ? s.sections : T.sections);
    const task = section('tarea', 'Tarea', [
      `Estructura / secciones: ${sectionList.join(' · ')}.`,
      ...T.features.map((f) => ['complete', `Funcionalidad: ${f}.`]),
      s.scope === 'prototype' && 'Prioriza el acabado visual; usa datos simulados cuando haga falta.',
      s.scope === 'mvp' && 'Prioriza las funcionalidades clave; deja anotados con `TODO` los elementos pospuestos.',
      s.scope === 'production' && ['complete', 'Incluye página 404, estados de carga/vacío/error y un README con instalación y despliegue.'],
      s.seoContent
        ? `Redacta textos reales en ${lang} orientados a la intención de búsqueda; nada de lorem ipsum.`
        : `Usa textos provisionales realistas en ${lang} y marca con \`TODO:\` los que deba revisar el cliente.`,
    ], s, `Diseña y desarrolla ${scopeText} para «${name}» (${T.name.toLowerCase()}) con ${S.name}.`);

    const design = section('diseno', 'Diseño visual', [
      `Estilo: ${s.style}.`,
      s.palette ? `Paleta: ${s.palette}.` : 'Paleta: propón una paleta coherente con el sector y verifica el contraste.',
      s.fonts ? `Tipografía: ${s.fonts}.` : ['complete', 'Tipografía: propón una combinación de dos familias (títulos + texto) de Google Fonts con escala tipográfica fluida (`clamp()`).'],
      s.references && `Referencias: ${s.references}.`,
      'Define tokens de diseño (colores, espaciados, radios, sombras, tipografía) como variables CSS y úsalos en todo el proyecto.',
      s.darkMode && 'Modo claro y oscuro con `prefers-color-scheme` y conmutador manual persistente.',
      ['complete', 'Evita el aspecto de plantilla genérica: composición con intención, jerarquía tipográfica marcada y espacio en blanco generoso.'],
      ['exhaustive', 'Documenta el sistema de diseño (tokens y componentes) en una sección del README.'],
    ], s);

    const standards = section('estandares', 'Estándares de calidad', [
      'HTML5 semántico (`header`, `nav`, `main`, `section`, `article`, `footer`) con un único `h1` por página y jerarquía de encabezados sin saltos.',
      s.mobileFirst && 'Diseño mobile-first y responsive (360, 768, 1024, 1440 px) sin scroll horizontal.',
      s.a11y && 'Accesibilidad WCAG 2.2 AA: contraste suficiente, foco visible, navegación completa por teclado, `alt` descriptivo, etiquetas en formularios y ARIA solo cuando sea necesario.',
      ['complete', 'Rendimiento: imágenes AVIF/WebP con `width`/`height`, `loading="lazy"` salvo la imagen LCP (`fetchpriority="high"`), fuentes con `font-display: swap` y precarga, JavaScript diferido.'],
      ['complete', 'Código limpio y modular: componentes reutilizables, nombres descriptivos, sin dependencias innecesarias ni código muerto.'],
      ['exhaustive', 'Seguridad: sin secretos en el cliente, cabeceras de seguridad recomendadas (CSP, HSTS) y validación de formularios en cliente y servidor.'],
      `Stack: ${S.name}. ${S.seo}`,
    ], s);

    // SEO
    let seo = null;
    if (seoOn) {
      const adv = LEVEL_RANK[{ basic: 'subtle', advanced: 'moderate', technical: 'immersive' }[s.seoLevel]];
      const items = [
        s.keyword && `Palabra clave principal: «${s.keyword}». Inclúyela de forma natural en el \`title\`, el \`h1\`, el primer párrafo, la URL y el \`alt\` de la imagen principal, sin sobreoptimizar.`,
        s.keywords2 && `Palabras clave secundarias: ${s.keywords2}. Distribúyelas en \`h2\`/\`h3\` y en el contenido según la intención de búsqueda.`,
        'Etiqueta `title` única por página (50–60 caracteres) y `meta description` persuasiva (140–160 caracteres).',
        'URLs limpias y descriptivas, `link rel="canonical"`, atributo `lang` correcto y `alt` en todas las imágenes relevantes.',
        adv >= 2 && T.seo,
        adv >= 2 && ['complete', 'Enlazado interno con anclas descriptivas y navegación con breadcrumbs donde aplique.'],
        s.seoSchema && `Datos estructurados JSON-LD (schema.org): ${T.schema.join(', ')}. Deben validar sin errores en la Prueba de resultados enriquecidos de Google.`,
        s.seoSocial && 'Open Graph y Twitter Cards completos (título, descripción, imagen 1200×630, `og:url`, `og:locale`).',
        s.seoSitemap && '`sitemap.xml` generado automáticamente y `robots.txt` que lo referencie.',
        s.seoCwv && 'Core Web Vitals en verde: LCP < 2,5 s, INP < 200 ms y CLS < 0,1 (reserva espacio a imágenes, fuentes y contenido animado).',
        (s.seoLocal || s.location) && `SEO local${s.location ? ' para ' + s.location : ''}: NAP (nombre, dirección, teléfono) coherente en toda la web, marcado LocalBusiness, mapa con carga diferida y enlace a Google Business Profile.`,
        (s.seoI18n || multiLang) && `Versión multilingüe (${lang}) con URLs por idioma (\`/es/\`, \`/en/\`), etiquetas \`hreflang\` recíprocas y \`x-default\`.`,
        s.domain && `Dominio de producción: ${s.domain} (úsalo en canonical, \`og:url\` y sitemap).`,
        adv >= 3 && 'SEO técnico: página 404 útil, redirecciones 301 planificadas, `noindex` en páginas privadas, de filtros o duplicadas, sitemap de imágenes y cabeceras de caché correctas.',
        adv >= 3 && ['complete', 'Optimización para buscadores con IA (AI Overviews, ChatGPT Search): respuestas directas y concisas bajo encabezados en forma de pregunta, FAQ y datos citables.'],
        adv >= 3 && ['exhaustive', 'Entrega una checklist SEO final con cada punto verificado (Lighthouse SEO ≥ 95).'],
      ];
      seo = section('seo', 'SEO', items, s, `Nivel de SEO: ${{ basic: 'básico', advanced: 'avanzado', technical: 'técnico completo' }[s.seoLevel]}.`);
    }

    // GSAP
    let gsapBrief = null;
    let gsapRules = null;
    if (gsapOn) {
      const plugins = s.gsapPlugins.map((id) => byId(D.gsapPlugins, id));
      gsapBrief = section('animaciones_gsap', 'Animaciones con GSAP', [
        `Ideas para este tipo de proyecto: ${T.gsap}`,
        s.gsapCustom && `Animaciones solicitadas expresamente: ${s.gsapCustom}`,
        plugins.length
          ? `Plugins a utilizar: ${plugins.map((p) => `${p.label} (${p.desc})`).join('; ')}.`
          : 'Usa solo el núcleo de GSAP (timelines y tweens), sin plugins.',
        plugins.length && ['complete', 'GSAP 3.13+ es 100 % gratuito, incluidos los plugins antes «Club» (SplitText, ScrollSmoother, MorphSVG, DrawSVG, Inertia…): no uses alternativas de pago.'],
      ], s, `Intensidad: ${D.gsapLevels[s.gsapLevel]}`);

      const has = (id) => s.gsapPlugins.includes(id);
      gsapRules = section('reglas_gsap', 'Reglas técnicas de animación', [
        S.gsap,
        'Anima solo `transform` y `opacity` (`x`, `y`, `scale`, `rotation`, `autoAlpha`); nunca propiedades de layout (`top`, `width`, `margin`…).',
        'Respeta `prefers-reduced-motion` con `gsap.matchMedia()`: desactiva o simplifica las animaciones (sin parallax, sin scrub, fundidos cortos).',
        'Mejora progresiva: el contenido debe ser visible y legible sin JavaScript. Establece los estados iniciales ocultos desde JS (o bajo una clase `.js` en `<html>`), nunca con CSS que deje el contenido invisible a buscadores.',
        seoOn && 'No retrases el elemento LCP (h1 o imagen principal del hero): debe pintarse de inmediato; anima los elementos secundarios o parte de un estado visible.',
        ['complete', 'Evita saltos de layout (CLS): reserva el espacio de los elementos animados y no cambies sus dimensiones.'],
        ['complete', 'Centraliza las animaciones en un módulo propio con timelines nombradas y `gsap.defaults({ ease: "power3.out", duration: 0.8 })` coherentes con la marca.'],
        has('ScrollTrigger') && ['complete', 'ScrollTrigger: usa `markers` solo en desarrollo, `invalidateOnRefresh` en valores responsive, `ScrollTrigger.refresh()` tras cargar imágenes/fuentes y elimina los triggers al desmontar o cambiar de ruta.'],
        has('SplitText') && ['complete', 'SplitText: usa `autoSplit: true` con `onSplit()` para recalcular al cambiar el ancho o cargar fuentes, `mask: "lines"` para revelados limpios, y conserva la accesibilidad (`aria`) que aplica el plugin.'],
        has('ScrollSmoother') && ['complete', 'ScrollSmoother: estructura `#smooth-wrapper > #smooth-content`, deja los elementos `position: fixed` fuera del contenido y usa `smoothTouch` bajo (≈ 0.1) o desactivado en táctil.'],
        has('Flip') && ['exhaustive', 'Flip: captura el estado con `Flip.getState()` antes del cambio de DOM y anima con `Flip.from()` usando `absolute: true` en listas que cambian de tamaño.'],
        ['exhaustive', 'Presupuesto de rendimiento: 60 fps en un móvil de gama media, `will-change` solo durante la animación y sin animar cientos de elementos a la vez.'],
      ], s);
    }

    const agentFlow = P.agent ? section('flujo', 'Flujo de trabajo', [
      '1. Explora el repositorio (o crea la estructura inicial si está vacío) e identifica convenciones existentes.',
      '2. Redacta un plan breve con archivos a crear/modificar y decisiones técnicas.',
      '3. Implementa por partes: layout y sistema de diseño → secciones → SEO → animaciones.',
      `4. Verifica: ${S.commands}. Corrige errores de consola, lint y build.`,
      '5. Resume lo realizado, las suposiciones y los siguientes pasos.',
    ], s) : null;

    const acceptance = section('criterios_aceptacion', 'Criterios de aceptación', [
      `Lighthouse (móvil): Rendimiento ≥ 90, Accesibilidad ≥ 95, Buenas prácticas ≥ 95${seoOn ? ', SEO ≥ 95' : ''}.`,
      'Sin errores ni advertencias en la consola del navegador.',
      'Responsive de 360 a 1920 px sin desbordamientos.',
      gsapOn && 'Animaciones fluidas y desactivadas/simplificadas con `prefers-reduced-motion`.',
      gsapOn && ['complete', 'El contenido es visible si JavaScript o GSAP fallan en cargar.'],
      seoOn && s.seoSchema && ['complete', 'JSON-LD válido y metadatos presentes en el HTML servido (ver código fuente).'],
      ['complete', 'HTML válido (W3C) y navegación completa con teclado.'],
    ], s);

    const questions = s.askQuestions
      ? 'Antes de empezar, hazme como máximo 5 preguntas clave sobre lo que falte o sea ambiguo y espera mis respuestas.'
      : 'Si falta información, toma decisiones razonables y enuméralas como «Suposiciones» al principio de tu respuesta.';

    const deliverables = section('formato_respuesta', P.agent ? 'Entrega' : 'Formato de respuesta', [
      questions,
      `Estructura de archivos sugerida: ${S.structure}.`,
      ...P.delivery,
      ['complete', 'Explica brevemente las decisiones de diseño, SEO y animación más importantes.'],
    ], s);

    return { P, T, S, role, context, task, design, standards, seo, gsapBrief, gsapRules, agentFlow, acceptance, deliverables };
  }

  function buildRulesFile(s, x) {
    const { P, S, T } = x;
    const title = s.projectName || T.name;
    const md = (heading, lines) => lines.length ? `## ${heading}\n${lines.map((l) => '- ' + l).join('\n')}` : '';
    const parts = [
      `# ${P.rulesName === 'AGENTS.md' ? 'AGENTS.md' : 'Reglas del workspace'} — ${title}`,
      `Guía persistente para agentes de IA que trabajen en este proyecto (${T.name.toLowerCase()}).`,
      md('Stack', [S.name, `Estructura: ${S.structure}`]),
      md('Comandos', S.commands.split(' · ')),
      x.standards ? md('Estándares de código', x.standards.lines) : '',
      x.gsapRules ? md('Animaciones (GSAP)', x.gsapRules.lines) : '',
      md('Definición de terminado', [
        ...x.acceptance.lines,
        s.stack === 'html' ? 'HTML y JSON-LD validados sin errores.' : 'Lint, build y comprobación de tipos sin errores.',
        'Commits pequeños y descriptivos (Conventional Commits).',
      ]),
    ];
    return parts.filter(Boolean).join('\n\n');
  }

  function build(s) {
    const x = buildSections(s);
    const { P } = x;
    const blocks = [];

    if (P.split) {
      blocks.push({
        label: 'Instrucciones del sistema',
        content: format([x.role, x.standards, x.gsapRules, x.deliverables], P.format),
      });
      blocks.push({
        label: 'Prompt',
        content: format([x.context, x.task, x.design, x.seo, x.gsapBrief, x.acceptance], P.format),
      });
    } else if (P.agent) {
      const withRules = s.rulesFile;
      const head = withRules
        ? section('reglas', 'Reglas', [], s, `Sigue las convenciones de \`${P.rulesFile}\` (stack, estándares, animación y definición de terminado).`)
        : null;
      blocks.push({
        label: 'Prompt de tarea',
        content: format([x.role, head, x.context, x.task, x.design, x.seo, x.gsapBrief,
          withRules ? null : x.standards, withRules ? null : x.gsapRules,
          x.agentFlow, x.acceptance, x.deliverables], P.format),
      });
      if (withRules) {
        blocks.push({ label: P.rulesName, filename: P.rulesFile, content: buildRulesFile(s, x) });
      }
    } else {
      blocks.push({
        label: 'Prompt',
        content: x.role.intro + '\n\n' + format([x.context, x.task, x.design, x.standards, x.seo, x.gsapBrief, x.gsapRules, x.acceptance, x.deliverables], P.format),
      });
    }
    return { blocks, platform: P };
  }

  function completeness(s) {
    const checks = [
      s.projectName, s.description, s.audience, s.cta, s.sections, s.palette, s.fonts,
    ];
    if (s.seoLevel !== 'none') checks.push(s.keyword, s.keywords2);
    if (s.seoLocal) checks.push(s.location);
    if (s.gsapLevel !== 'none') checks.push(s.gsapCustom);
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  /* ---------- Renderizado de la salida ---------- */

  function escapeHtml(str) {
    return str.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function renderOutput(result, s) {
    const changedShape = result.blocks.length !== lastBlocks.length ||
      result.blocks.some((b, i) => !lastBlocks[i] || lastBlocks[i].label !== b.label);
    if (activeTab >= result.blocks.length) activeTab = 0;
    lastBlocks = result.blocks;

    $('#tabs').innerHTML = result.blocks.length > 1
      ? result.blocks.map((b, i) => `<button type="button" role="tab" class="tab" aria-selected="${i === activeTab}" data-tab="${i}">${escapeHtml(b.label)}</button>`).join('')
      : '';

    const block = result.blocks[activeTab];
    $('#outputBlocks').innerHTML = `
      <div class="block">
        <button type="button" class="btn btn--small block__copy" data-copy="${activeTab}">Copiar</button>
        <pre class="block__code" tabindex="0"><code>${escapeHtml(block.content)}</code></pre>
      </div>`;

    const total = result.blocks.reduce((n, b) => n + b.content.length, 0);
    $('#meta').textContent = `${result.platform.name} · ${total.toLocaleString('es-ES')} caracteres · ≈ ${Math.round(total / 4).toLocaleString('es-ES')} tokens`;
    $('#platformHint').textContent = result.platform.hint;
    $('#tips').innerHTML = `<strong>Consejo:</strong> ${escapeHtml(result.platform.tips)}`;

    const score = completeness(s);
    $('#scoreValue').textContent = score + '%';
    $('#scoreRing').style.strokeDasharray = `${score} 100`;
    $('#score').dataset.level = score >= 75 ? 'high' : score >= 40 ? 'mid' : 'low';

    $('#seoOptions').hidden = s.seoLevel === 'none';
    $('#gsapOptions').hidden = s.gsapLevel === 'none';

    if (changedShape) Anim.swap($('#outputBlocks'));
  }

  function allText() {
    return lastBlocks.length === 1
      ? lastBlocks[0].content
      : lastBlocks.map((b) => `===== ${b.label}${b.filename ? ' (' + b.filename + ')' : ''} =====\n\n${b.content}`).join('\n\n');
  }

  /* ---------- Utilidades ---------- */

  async function copy(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(msg || 'Copiado al portapapeles');
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    Anim.toast(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      el.removeAttribute('style');
    }, 2200);
  }

  function slug(str) {
    return (str || 'prompt').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prompt';
  }

  /* ---------- Animaciones de la propia interfaz (GSAP opcional) ---------- */

  const Anim = {
    ok: () => typeof window.gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    intro() {
      if (!this.ok()) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-anim="hero"]', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.1 })
        .from('[data-anim="step"]', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.06 }, '-=0.4')
        .from('.output', { x: 24, autoAlpha: 0, duration: 0.7 }, '<0.1');
    },
    swap(el) {
      if (!this.ok()) return;
      gsap.fromTo(el, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    },
    pop(el) {
      if (!this.ok() || !el) return;
      gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    },
    toast(el) {
      if (!this.ok()) return;
      gsap.fromTo(el, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    },
  };

  /* ---------- Inicialización ---------- */

  function update() {
    const s = readState();
    save(s);
    renderOutput(build(s), s);
  }

  function init() {
    renderControls();

    const fromHash = location.hash.startsWith('#s=') ? decodeShare(location.hash.slice(3)) : null;
    const initial = fromHash || load();
    if (initial) {
      applyState(initial);
    } else {
      setDefaultPlugins('moderate');
    }
    if (!$('#sections').value) $('#sections').value = byId(D.projectTypes, $('#projectType').value).sections;
    if (fromHash) history.replaceState(null, '', location.pathname);

    let prevType = $('#projectType').value;
    let timer;
    const form = $('#promptForm');

    form.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(update, 120);
    });

    form.addEventListener('change', (e) => {
      const t = e.target;
      if (t.id === 'projectType') {
        // Sustituye las secciones solo si el usuario no las ha personalizado.
        const prevDefault = byId(D.projectTypes, prevType).sections;
        if (!$('#sections').value.trim() || $('#sections').value.trim() === prevDefault) {
          $('#sections').value = byId(D.projectTypes, t.value).sections;
        }
        prevType = t.value;
      }
      if (t.name === 'gsapLevel') setDefaultPlugins(t.value);
      if (t.name === 'platform') {
        activeTab = 0;
        Anim.pop(t.nextElementSibling);
      }
      update();
    });

    $('#tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      activeTab = Number(btn.dataset.tab);
      lastBlocks = [];
      update();
    });

    $('#outputBlocks').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-copy]');
      if (btn) copy(lastBlocks[Number(btn.dataset.copy)].content, `«${lastBlocks[Number(btn.dataset.copy)].label}» copiado`);
    });

    $('#copyAll').addEventListener('click', () => copy(allText(), 'Prompt completo copiado'));

    $('#download').addEventListener('click', () => {
      const s = readState();
      const blob = new Blob([allText()], { type: 'text/markdown;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `prompt-${slug(s.projectName)}-${s.platform}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Archivo descargado');
    });

    $('#share').addEventListener('click', () => {
      const url = `${location.origin}${location.pathname}#s=${encodeShare(readState())}`;
      copy(url, 'Enlace con la configuración copiado');
    });

    $('#reset').addEventListener('click', () => {
      if (!confirm('¿Restablecer todos los campos?')) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* sin almacenamiento */ }
      form.reset();
      setDefaultPlugins('moderate');
      prevType = $('#projectType').value;
      $('#sections').value = byId(D.projectTypes, prevType).sections;
      activeTab = 0;
      update();
    });

    update();
    Anim.intro();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
