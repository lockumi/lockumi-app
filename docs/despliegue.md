# Despliegue por bloques en app.lockumi.com

Cada bloque es un PR pequeño contra `master`. Vercel publica en producción (app.lockumi.com) cada commit de `master`.

## Antes de integrar
1. CI verde en el PR (lint, pruebas unitarias e integración, `tsc`, build). Las E2E no bloquean.
2. Legal confirmó la tabla de veracidad del PR (o el PR 1, preaprobado con las condiciones a–d).
3. **Anotar el despliegue de producción anterior**: es el último estado «Vercel» del commit de `master` actual:
   ```bash
   gh api repos/lockumi/lockumi-app/commits/$(git rev-parse origin/master)/statuses \
     --jq '.[]|select(.context=="Vercel")|.state+" "+.target_url' | head -1
   ```
   El ID es la última parte de la URL (`dpl_<ID>`).

## Integrar
```bash
gh pr merge <N> --repo lockumi/lockumi-app --merge --subject "Publicar PR <N>: …"
```

## Revisión rápida después de publicar (2 minutos)
- El estado «Vercel» del nuevo commit de `master` pasa a `success`.
- https://app.lockumi.com carga, muestra «El depósito de tu alquiler, protegido» y la nota de Legal debajo.
- https://app.lockumi.com/terminos muestra la versión esperada (hoy «Versión 1.6-demo · 24 de octubre de 2026»).
- Una sesión con una versión anterior aceptada entra directo a la app (sin pantalla «Actualizamos los Términos…», desactivada el 24/10).
- Entrar con correo: «Enviar código» siempre termina en «Te enviamos un código» o en un error visible («Ese proveedor de correo aún no es compatible…» o «No pudimos enviar el código…»). Si Cavos no responde, el error sale a los 20 s (`conLimite` en `src/services/auth.ts`, 26/10).
- E2E contra producción: `BASE=https://app.lockumi.com node scripts/e2e-solo.mjs 2` (testnet, tokens sin valor) y la suite de Playwright cuando exista. Resultado en `E2E.md`.

## Volver atrás (rollback)
Si algo grave pasa en producción, primero se vuelve atrás y después se avisa.

1. **Vercel (lo más rápido)**: `vercel rollback <dpl_ID_anterior> --scope businessapplockumi-4427 --token "$VERCEL_TOKEN"` o `vercel promote <dpl_ID_anterior>`.
   - Límite actual (prueba en seco del 24/10/2026, 9:22 p. m. CR): el `VERCEL_TOKEN` existente responde 403 para el equipo `businessapplockumi-4427` («ask a team owner to grant the required access»). Con ese token **no se puede** hacer rollback por la CLI. No se crean tokens nuevos: lo puede hacer una persona dueña del equipo con «Instant Rollback» en el panel de Vercel, o se usa el paso 2.
2. **Git (siempre disponible)**: revertir el commit de integración en `master`; Vercel publica el código anterior en ~1 minuto.
   ```bash
   git fetch origin && git checkout -B revertir origin/master
   git revert -m 1 <commit-de-integración> --no-edit
   git push origin revertir && gh pr create --base master --head revertir --title "Revertir PR <N>" --body "Rollback"
   gh pr merge --merge   # solo con la autorización de publicar
   ```
   Prueba en seco: `git revert -m 1 --no-commit 429399d` sobre una copia de `master` deja el árbol igual a `051c071` (`git diff 051c071` vacío).
3. Repetir la revisión rápida y anotar el resultado en `E2E.md`.
