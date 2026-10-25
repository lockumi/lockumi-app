// Precios de referencia para la propuesta automática SIMULADA (Términos 1.7-demo, 6.4.3 y 6.7).
// Generado desde /workspace/lockumi/diseno/envio/reclamo-final/precios-referencia.csv (consultado el 24/10/2026).
// Las filas «sin fuente» del CSV NO se usan. Con «desde» o con un rango se usa el monto menor.
// `vida`: vida útil en años para la depreciación. Es un valor SIMULADO de la demo (0 = servicio, sin depreciación).
export interface Precio { rubro: string; colones: number; unidad: string; fuente: string; url: string; fecha: string; nota: string; vida: number }
export const PRECIOS: Precio[] = [
 {
  "rubro": "Pintura interior (mano de obra)",
  "colones": 3000,
  "unidad": "m²",
  "fuente": "Propiedades.cr",
  "url": "https://propiedades.cr/es/servicios/pintura-casas-apartamentos",
  "fecha": "24/10/2026",
  "nota": "; «desde»: se usa ese monto",
  "vida": 5
 },
 {
  "rubro": "Empastado de pared (mano de obra)",
  "colones": 2500,
  "unidad": "m²",
  "fuente": "Propiedades.cr",
  "url": "https://propiedades.cr/es/servicios/pintura-casas-apartamentos",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 5
 },
 {
  "rubro": "Pintura látex SUR blanco mate",
  "colones": 13650,
  "unidad": "galón",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/pintura-latex-primera-blanco-mate-1-gal-sur.html",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 5
 },
 {
  "rubro": "Pomo con llave Yale York (dormitorio)",
  "colones": 8495,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/pomo-con-llave-york-para-dormitorio-acero-inoxidable-satinado.html",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 10
 },
 {
  "rubro": "Cerradura de entrada principal níquel satinado",
  "colones": 18350,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/cerraduras-entrada-principal.html",
  "fecha": "24/10/2026",
  "nota": "precio de la categoría",
  "vida": 10
 },
 {
  "rubro": "Tomacorriente doble 20 A Pass & Seymour",
  "colones": 1800,
  "unidad": "unidad",
  "fuente": "Novex",
  "url": "https://novex.cr/producto/149117/Tomacorriente-doble-20a-125v-blanco-pass&seymour.html",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 10
 },
 {
  "rubro": "Interruptor sencillo 15 A",
  "colones": 1200,
  "unidad": "unidad",
  "fuente": "Novex",
  "url": "https://novex.cr/producto/76006/Interruptor-sencillo-15a-125vac.html",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 10
 },
 {
  "rubro": "Grifo de lavamanos monomando (palanca)",
  "colones": 16750,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/grifo-lavamanos-monomando-cuello-bajo-cromado-manilla-tipo-palanca.html",
  "fecha": "24/10/2026",
  "nota": "liquidación; precio regular 23.950",
  "vida": 10
 },
 {
  "rubro": "Inodoro Platani dos piezas",
  "colones": 41950,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/inodoro-platani-dos-piezas-blanco-redondo-descarga-sencilla-6-l-aqua-nuova.html",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 20
 },
 {
  "rubro": "Tapa de inodoro plástica redonda",
  "colones": 8995,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/inodoros.html",
  "fecha": "24/10/2026",
  "nota": "precio de la categoría",
  "vida": 5
 },
 {
  "rubro": "Kit de accesorios para inodoro",
  "colones": 13495,
  "unidad": "kit",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/kit-de-accesorios-para-inodoro-aqua-nuova-modelos-agri-senio-dante-y-ronco.html",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 5
 },
 {
  "rubro": "Puerta entamborada plywood 70 × 210 cm",
  "colones": 21650,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/puerta-entamborada-plywood-210-x-70-cm-33-mm-acabado-madera-natural.html",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 15
 },
 {
  "rubro": "Piso cerámico 43 × 43 cm (222 marfil)",
  "colones": 5592,
  "unidad": "m²",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/en-cr/products/piso-ceramico-43-x-43-cm-222-marfil-17-m2",
  "fecha": "24/10/2026",
  "nota": "NO CONFIRMADO en el texto de la página (precio cargado con JS); dato del buscador",
  "vida": 20
 },
 {
  "rubro": "Persiana roller (eclipse semiopaca)",
  "colones": 17995,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/persianas.html",
  "fecha": "24/10/2026",
  "nota": "precio de la categoría; «desde»: se usa ese monto",
  "vida": 5
 },
 {
  "rubro": "Limpieza profunda de vivienda",
  "colones": 160000,
  "unidad": "casa de 80 m²",
  "fuente": "Mabbi",
  "url": "https://mabbi.app/precios-servicios-limpieza-costa-rica/",
  "fecha": "24/10/2026",
  "nota": "guía de precios de una plataforma",
  "vida": 0
 },
 {
  "rubro": "Limpieza profunda detallada (alternativa)",
  "colones": 990,
  "unidad": "m²",
  "fuente": "Master Clean CR",
  "url": "https://mastercleancr.com/producto/limpieza-profunda-detallada/",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 0
 },
 {
  "rubro": "Ducha eléctrica Lorenzetti Loren Shower",
  "colones": 24950,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/lorenzetti-ducha-loren-shower-electronica-127-v-5500-w.html",
  "fecha": "24/10/2026",
  "nota": "oferta hasta el 26/10; precio regular 31.950",
  "vida": 5
 },
 {
  "rubro": "Lavamanos con pedestal Colony",
  "colones": 22750,
  "unidad": "unidad",
  "fuente": "EPA",
  "url": "https://cr.epaenlinea.com/lavamanos-con-pedestal-colony-blanco.html",
  "fecha": "24/10/2026",
  "nota": "",
  "vida": 20
 },
 {
  "rubro": "Visita de diagnóstico de fontanería (GAM)",
  "colones": 15000,
  "unidad": "visita",
  "fuente": "Smart.cr",
  "url": "https://smart.cr/pages/fontaneria",
  "fecha": "24/10/2026",
  "nota": "«se abona al trabajo»",
  "vida": 0
 },
 {
  "rubro": "Visita de diagnóstico de electricista",
  "colones": 20000,
  "unidad": "visita",
  "fuente": "PuraObra",
  "url": "https://puraobra.com/servicios/electricidad",
  "fecha": "24/10/2026",
  "nota": "rango; la cifra exacta no se volvió a revisar; rango: se usa el menor",
  "vida": 0
 }
]
/** Tipo de cambio SIMULADO para pasar colones a USDC de prueba (solo para la demo; no es un dato oficial). */
export const COLONES_POR_USDC = 500
