# Destructible page

Objective: clicking any part of the page (except controls) breaks the clicked characters off and sends them flying with per-object weight.
Branch: none (folder is not a git repository yet; no work-unit commits possible). Delivery: single change. Test runner: none configured; verification by type check, build and in-browser checks.

## Specs

- **S1** Click destroys the clicked part: "donde hagamos click se destruya esa parte de la pagina por ejemplo si le doy click a una nube o la parte de la flor principal o la luna los caracteres que le dimos click salgan volando".
- **S2** Name letters: "si le damos click a mi nombre Alex Alvarado salga volando la letra que tocamos".
- **S3** Weight: "cada cosa tiene su peso asi que depende".
- **S4** Exceptions: "todo se puede romper menos los botones". Assumption: links, form fields and other interactive controls count as buttons; React-managed live text (clock, typewriter) and the hover monogram are excluded to avoid breaking their updates.
- **S5** Moon: "cosas como la luna no quiero que caiga de una sino que salgan volando los pedazos pero si hace 5 click si caiga lo que queda de luna". Changed by L6: "que sea con 3 click".
- **S6** Persistence: "se queda todo destruido hasta que recargamos y mas adelante agregaremos una funcion de arreglar todo pero despues". Repair is out of scope.

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1, S3 | inline | done | Real click on hero name: letter flew and fell; debris canvas spawns and clears |
| T2 | S2, S4 | inline | done | Name letter broke, text intact; buttons, links, toggle and typewriter excluded (0 breaks); paragraph broke 1 char |
| T3 | S1, S3, S6 | inline | done | Scene probe: stem cut dropped 215 cells, meadow petals and cloud broke, damage identical after resize |
| T4 | S5 | inline | done | Reopened by L5/L6. Scene probe: same-spot clicks 500>411>330>255>179, fall now on 3rd click; real browser: 3 clicks on the same spot, scene reported clicks=3 fallen=true and the moon's spot emptied |
| T5 | S1-S6 | inline | done | astro check 0 errors; astro build complete; no git repo, so no commits |

T1 debris layer, click dispatcher, weight table. T2 DOM text breaking. T3 garden canvases (owner map, object-space damage that survives resize). T4 moon craters by raycast, fall on fifth click. T5 browser verification and build.

Route evidence: one understood feature with sequential dependent units (each builds on T1), so no Writer trigger applies; work inline.

## Log

- **L1** (2026-11-07) Original request: "Ahora necesito hacer un función muy grande, quiero que donde hagamos click se destruya esa parte de la pagina por ejemplo si le doy click a una nube o la parte de la flor principal o la luna los caracteres que le dimos click salgan volando y si le damos click a mi nombre Alex Alvarado salga volando la letra que tocamos cada cosa tiene su peso asi que depende, todo se puede romper menos los botones analiza como hariamos esto"
- **L2** (2026-11-07) Correction: "me gusta solo que cosas como la luna no quiero que caiga de una sino que salgan volando los pedazos pero si hace 5 click si caiga lo que queda de luna, y se queda todo destruido hasta que recargamos y mas adelante agregaremos una funcion de arreglar todo pero despues"
- **L3** Design: a fixed debris canvas with custom physics (no physics library: debris does not collide with each other). DOM characters located with caretPositionFromPoint and hidden with transparent color so layout and screen readers stay intact. ASCII grids record an owner id per cell; scenes store damage in each object's own coordinates, keyed by stable entity keys so it survives resize.
- **L4** (2026-11-07) All tasks verified. Clicks on empty canvas cells do not count towards the moon's five clicks. Known limitation: when the window width changes, meadow plants and grass re-layout, so their damage follows entity index rather than exact position; height-only resizes keep it exact. Next: repair-all feature (out of scope per L2).
- **L5** (2026-11-07) User report: "La luna no se esta cayendo". Reproduced: repeated clicks on the same spot landed in the first crater (no cells) and were not counted. Fix: count clicks by raycasting the sphere (holes do not stop the ray) and widen the crater on each click.
- **L6** (2026-11-07) Correction: "que sea con 3 click". S5 now falls on the third click; T4 reopened and re-verified.
