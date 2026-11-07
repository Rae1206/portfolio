# Wreck mascot

Objective: when the page is wrecked enough, an ASCII mascot draws itself, cannot be broken, comforts the visitor and offers another chance; "No" always runs away, "Yes" repairs the whole page and the mascot leaves.
Branch: none (folder is not a git repository; no work-unit commits possible). Delivery: single change. Test runner: none configured; verification by type check, build and in-browser checks.

## Specs

- **S1** Trigger: "se dibuje solo al momento que hemos hecho daño a la pagina sea superior". Agreed threshold: about 150 broken characters, or the moon falling, whichever comes first ("si").
- **S2** Unbreakable: "no podamos dañarla". Changed by L5: the page keeps breaking while the mascot is shown; only the mascot is unbreakable. Non-blocking per L4: "que el cuadro de la mascota no tape toda la pantalla osea es opcional repararla podemos seguir viendo la pagina ignorando lo que nos dice la mascota".
- **S3** Message: "nos diga: vaya desastre... pero no importa todo se puede arreglar y nos de la opcion de: otra oportunidad? Si o no", with the dialogue in English ("si pero el dialogo en ingles"): "What a mess... but it doesn't matter, everything can be fixed." / "Another chance?" / Yes / No.
- **S4** No button: "el botón de no nunca funcionara y se movera en toda la pagina para que nunca lo presionemos".
- **S5** Yes button: "si le damos si la pagina se arreglara toda y la mascota desaparece".
- **S6** Look: "la mascota tiene que ser parecida a esta pero hecha en ASCII" (reference image: spiky black silhouette, green mask, big blue eyes, white toothy grin, purple edges). Assumption: an original character inspired by that style, not a copy.

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1, S2 | inline | done | Meter: unlocked at 100, locked at 160, critical hit locks at once; while locked a click on text broke 0 chars |
| T2 | S5 | inline | done | Text: HTML identical after repair (7 nodes back to 1); garden 701>482>701; moon 500>0>500; real cloud break repaired via page breaker |
| T3 | S6 | inline | done | Original spiky mascot (green mask, azure eyes, white grin) generated with a tone rule; draws line by line, blinks, mouth flaps while talking |
| T4 | S3, S4, S5 | inline | done | Real browser: dialog in English, Yes focused; hover and real click on No made it jump with quips; real click on Yes repaired the page, mascot left, damage unlocked |
| T5 | S1-S6 | inline | done | astro check 0 errors; astro build complete; no git repo, so no commits |

T1 damage meter + lock. T2 repair for DOM text, gardens, moon and debris. T3 mascot art, draw-in, idle animation. T4 dialog, dodging No, Yes repairs and mascot leaves. T5 end-to-end verification and build.

Route evidence: sequential dependent units of one feature; no Writer trigger applies; work inline.

## Log

- **L1** (2026-11-07) Original request: "Bien ahora se viene el feature más grande: Una mascota virtual que sea ASCII y se dibuje solo al momento que hemos hecho daño a la página sea superior y no podamos dañarla  y nos diga: vaya desastre... pero no importa todo se puede arreglar y nos de la opcion de: otra oportunidad? Si o no pero el botón de no nunca funcionara y se movera en toda la pagina para que nunca lo presionemos. y si le damos si la pagina se arreglara toda y la mascota desaparece. la mascota tiene que ser parecida a esta pero hecha en ASCII. Analiza y dime que tan factible es y el plan"
- **L2** (2026-11-07) Decision: "si pero el dialogo en ingles." (accepts the 150 characters or moon-falls trigger; dialogue in English).
- **L3** (2026-11-07) Found while verifying: a moon not yet revealed could be "broken" with zero visible cells, so its critical fall carried no pieces and never fired the event. Fix: the moon only breaks once fully revealed, and a critical hit counts even with zero pieces. In this browser pane the moon reveals very slowly (background tab), so the end-to-end check triggered the wreck through the page's real damage meter; the moon-to-event path is covered by the scene probe (critical cells) plus the meter test.
- **L4** (2026-11-07) Correction: "Me gusta pero que el cuadro de la mascota no tape toda la pantalla osea es opcional repararla podemos seguir viendo la pagina ignorando lo que nos dice la mascota". Mascot became a docked bottom-right card: no backdrop, no scroll lock, no focus trap or focus steal. Verified in browser: with the mascot shown, the Projects link navigated (scrollY 2017), html overflow visible; Yes still repaired (0 broken spans, unlocked). Breaking stays locked while the mascot is out (kept assumption).
- **L5** (2026-11-07) Correction: "pero si quiero que se siga rompiendo". Breaker no longer ignores clicks while the mascot shows; the meter stops counting once wrecked so the event fires only once until Yes repairs.
- **L6** (2026-11-07) User report: "el boton de no ahora desaparece por completo no se mueve por toda la pantalla". Reproduced: style left 818px rendered at 1310px (off a 1024px viewport) because the card's backdrop-filter makes it the containing block for position: fixed. Fix: the No button moves to <body> when it starts running and returns to the card on reset. Also fixed: choices were visible while typing (display:flex overrode [hidden]).
- **L7** (2026-11-07) Request: "Haz la tarjeta de la mascota mas pequeña y ponele de nombre Capri y un badge de nombre tambien abajo de ella". Mascot named Capri (script.name, label, prompt "capri@portfolio:~$ ./fix"), "✦ CAPRI" badge under the art, card shrunk from 506x282 to 371x211 px. Verified in browser: badge shown, No jumps to the top of the page (parent BODY, quip "nope"), Yes repairs and returns No to the card.
