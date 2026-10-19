---
description: Elimina un worktree de .worktrees/ y su rama local
agent: build
subagent: false
alias:
  - wtr
  - wt:remove
---

# Elimina un worktree de .worktrees/ y su rama local

El argumento completo es: $ARGUMENTS

Tu única tarea es eliminar el worktree indicado y su rama local. Sigue este orden exacto y detente en el primer error.

1. Normaliza `<nombre>` a partir del argumento:
   - Recorta espacios y, si empieza por `.worktrees/`, quita ese prefijo.
   - Si queda vacío, pide un nombre y no ejecutes nada.
   - Aborta si contiene `/`, `\`, `..`, `"`, `'`, `` ` ``, `$`, `;`, `&`, `|`, `<`, `>` o saltos de línea.
   - Se permiten letras (incluidas acentuadas), números, espacios, `.`, `_` y `-`.

2. Obtén la rama del worktree:
   git -C ".worktrees/<nombre>" branch --show-current
   - Si el comando falla, el worktree no existe: aborta y repórtalo.
   - Si no devuelve ninguna rama (HEAD desacoplado), aborta sin borrar nada.

3. Verifica que la rama local existe:
   git show-ref --verify --quiet "refs/heads/<rama>"
   - Si no existe, aborta sin borrar nada.

4. Elimina el worktree (sin `--force`):
   git worktree remove ".worktrees/<nombre>"
   - Si falla, detente y reporta el error; no borres la rama.

5. Elimina la rama (sin `-D`):
   git branch -d "<rama>"
   - Si falla, reporta el error; no reintentes, no fuerces y no hagas nada más.

Reglas estrictas:

- No cambies de directorio.
- No ejecutes ningún otro comando fuera de los indicados.
- No leas, crees ni edites archivos.
- No hagas commits, merges, pushes ni muevas la sesión.
- No uses `--force` ni `-D`.
- No pidas confirmación.
- Responde solo con lo eliminado y el resultado (o el error exacto y el paso donde falló).
