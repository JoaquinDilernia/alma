# ALMA — Setup

## Requisitos
- Node.js 20+
- Acceso a la consola de Firebase del proyecto `pedidos-lett-2`

## Desarrollo local

1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar con los valores reales de Firebase (pedirlos si no los tenés a mano).
3. `npm run dev` → http://localhost:3000

## Usuario admin

Ya existe un superadmin bootstrapeado:
- Email: `admin@alma.com.ar`
- Contraseña: `alma2026`

Desde `/admin/usuarios` (logueado como superadmin) se pueden crear el resto de los usuarios admin sin volver a tocar la consola de Firebase. **Recomendado:** cambiar esta contraseña por una definitiva una vez que el equipo confirme el acceso.

## Reglas de seguridad (Firestore y Storage)

**Importante:** el proyecto de Firebase es compartido con otra app (LETT). Antes de aplicar `firestore.rules` o `storage.rules`:

1. Abrir Firebase Console → Firestore/Storage → pestaña "Rules" y copiar las reglas actuales que ya están en producción.
2. Fusionar manualmente esas reglas con el contenido de `firestore.rules` / `storage.rules` de este repo (agregar los bloques `alma_*` / `alma/site/*` sin borrar los bloques existentes de la otra app).
3. Recién ahí pegar el resultado combinado en la consola y publicar. No usar `firebase deploy` con los archivos de este repo tal cual, porque sobrescribirían las reglas de la otra app.

Este archivo ya incluye las reglas de `alma_categorias`, `alma_productos`, `alma_zonas_envio` y `alma_pedidos` del ecommerce, además de las del sub-proyecto 1 (`alma_site_content`, `alma_admins`, `alma_leads_empresas`) — son todas locales hasta que se fusionen y publiquen a mano. Las fotos de producto se suben bajo `alma/site/productos/...` (reutilizan el mismo componente de subida del sub-proyecto 1), así que ya están cubiertas por la regla existente de `alma/site/**` en `storage.rules` — no hace falta agregar un bloque nuevo ahí.

Hasta que esas reglas se publiquen formalmente, el proyecto está funcionando con las reglas por defecto/existentes del proyecto compartido (lo suficientemente permisivas como para que los formularios y el editor de contenido ya funcionen en desarrollo) — pero conviene cerrar esto antes de ir a producción para que quede protegido correctamente.

## Deploy de la landing (Hostinger)

1. `npm run build` → genera la carpeta `out/`.
2. Subir el contenido de `out/` por el File Manager o FTP de Hostinger a la carpeta pública del dominio.
3. Los cambios de contenido (textos, testimonios, FAQ, imágenes) hechos desde `/admin/contenido` **no requieren repetir este paso** — se leen en vivo desde Firestore/Storage. Solo hace falta repetir el build+upload si se cambia código (nuevas secciones, textos fijos, etc).

## WhatsApp e Instagram

Reemplazar en `.env.local` (y en Hostinger, si se define de otra forma en producción):
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: número real de WhatsApp Business de ALMA, formato `54911XXXXXXXX`.
- `NEXT_PUBLIC_INSTAGRAM_HANDLE`: usuario real de Instagram, sin `@`.
