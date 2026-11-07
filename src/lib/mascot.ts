import { artLineToHtml, type ColoredArt } from '@/lib/colored-art';
import { WRECKED_EVENT } from '@/lib/debris/damage-meter';
import { repairAll } from '@/lib/debris/breaker';
import { isMotionEnabled } from '@/lib/motion';
import type { FrameRow, MascotScript } from '@/data/mascot';

const LINE_DELAY_MS = 70;
const TYPE_SPEED_MS = 38;
const MOUTH_FLAP_MS = 120;
const DODGE_DISTANCE_PX = 110;
const SAFE_DISTANCE_PX = 220;

interface MascotData {
  art: ColoredArt;
  blink: FrameRow[];
  talk: FrameRow[];
  script: MascotScript;
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * The wreck mascot: appears when the page is wrecked, draws itself line by
 * line, offers another chance and repairs the page on "Yes". It is a docked,
 * non-blocking card: the page stays usable and repairing is optional.
 * "No" can never be pressed: it runs away from the pointer, touches and the keyboard.
 */
class Mascot {
  private readonly lines: HTMLElement[] = [];
  private blinkTimer = 0;
  private open = false;
  private quipIndex = 0;
  private noIsLoose = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly data: MascotData,
    private readonly els: {
      art: HTMLElement;
      message: HTMLElement;
      question: HTMLElement;
      choices: HTMLElement;
      quip: HTMLElement;
      yes: HTMLButtonElement;
      no: HTMLButtonElement;
    },
  ) {
    this.renderArt();
    window.addEventListener(WRECKED_EVENT, () => void this.show());
    this.els.yes.addEventListener('click', () => void this.accept());
    this.bindNoButton();
  }

  private renderArt(): void {
    const { lines, mask } = this.data.art;
    this.els.art.style.setProperty('--line-count', String(lines.length));
    lines.forEach((line, index) => {
      const span = document.createElement('span');
      span.className = 'mascot__line';
      span.style.setProperty('--i', String(index));
      span.innerHTML = artLineToHtml(line, mask[index] ?? '');
      this.els.art.append(span);
      this.lines.push(span);
    });
  }

  /** Swaps rows for an animation frame, or restores the base rows. */
  private applyRows(rows: FrameRow[], active: boolean): void {
    const { lines, mask } = this.data.art;
    for (const frame of rows) {
      const line = this.lines[frame.row];
      if (!line) continue;
      line.innerHTML = active
        ? artLineToHtml(frame.line, frame.mask)
        : artLineToHtml(lines[frame.row] ?? '', mask[frame.row] ?? '');
    }
  }

  private async show(): Promise<void> {
    if (this.open) return;
    this.open = true;
    const animate = isMotionEnabled();

    this.resetDialog();
    this.root.hidden = false;
    this.root.classList.remove('is-leaving');
    this.root.classList.add('is-drawing');

    if (animate) await wait(this.data.art.lines.length * LINE_DELAY_MS + 300);
    await this.say(this.data.script.message, animate);

    this.els.question.hidden = false;
    this.els.choices.hidden = false;
    this.startBlinking();
  }

  /** Types a message while the mouth flaps. */
  private async say(text: string, animate: boolean): Promise<void> {
    if (!animate) {
      this.els.message.textContent = text;
      return;
    }
    let mouthOpen = false;
    const flap = window.setInterval(() => {
      mouthOpen = !mouthOpen;
      this.applyRows(this.data.talk, mouthOpen);
    }, MOUTH_FLAP_MS);

    for (let i = 1; i <= text.length; i++) {
      this.els.message.textContent = text.slice(0, i);
      await wait(TYPE_SPEED_MS);
    }
    window.clearInterval(flap);
    this.applyRows(this.data.talk, false);
  }

  private startBlinking(): void {
    const schedule = () => {
      this.blinkTimer = window.setTimeout(() => {
        this.applyRows(this.data.blink, true);
        window.setTimeout(() => this.applyRows(this.data.blink, false), 140);
        schedule();
      }, randomBetween(2200, 4800));
    };
    schedule();
  }

  private async accept(): Promise<void> {
    if (!this.open) return;
    window.clearTimeout(this.blinkTimer);
    this.els.choices.hidden = true;
    this.els.question.hidden = true;
    this.els.quip.textContent = '';
    this.resetNoButton();

    repairAll();
    const animate = isMotionEnabled();
    await this.say(this.data.script.farewell, animate);
    if (animate) await wait(500);

    this.root.classList.remove('is-drawing');
    this.root.classList.add('is-leaving');
    if (animate) await wait(this.data.art.lines.length * 50 + 300);

    this.root.hidden = true;
    this.root.classList.remove('is-leaving');
    this.open = false;
  }

  private resetDialog(): void {
    this.els.message.textContent = '';
    this.els.quip.textContent = '';
    this.els.question.hidden = true;
    this.els.choices.hidden = true;
    this.els.yes.disabled = false;
    this.resetNoButton();
  }

  // --------------------------------------------------------------- the No

  private bindNoButton(): void {
    const { no } = this.els;
    const dodgeFrom = (x: number, y: number) => {
      this.dodge(x, y);
      this.sayQuip();
    };

    // Getting close is enough to scare it away.
    document.addEventListener('pointermove', (event) => {
      if (!this.open || this.els.choices.hidden) return;
      const rect = no.getBoundingClientRect();
      const distance = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2));
      if (distance < DODGE_DISTANCE_PX) dodgeFrom(event.clientX, event.clientY);
    });

    // Touch and fast clicks: move before the press can land.
    no.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      dodgeFrom(event.clientX, event.clientY);
    });

    // It never actually works, from any input.
    no.addEventListener('click', (event) => {
      event.preventDefault();
      const rect = no.getBoundingClientRect();
      dodgeFrom(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }

  /** Jumps to a random spot of the viewport, far from the pointer. */
  private dodge(fromX: number, fromY: number): void {
    const { no } = this.els;
    const rect = no.getBoundingClientRect();
    const margin = 16;

    if (!this.noIsLoose) {
      // Move it to <body>: an ancestor with a filter or transform (the card has
      // backdrop-filter) would make `position: fixed` relative to it, not the viewport.
      document.body.append(no);
      // Pin it where it was first, so the jump animates from there.
      no.classList.add('is-loose');
      no.style.left = `${rect.left}px`;
      no.style.top = `${rect.top}px`;
      this.noIsLoose = true;
      void no.offsetWidth;
    }

    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 20; attempt++) {
      x = randomBetween(margin, window.innerWidth - rect.width - margin);
      y = randomBetween(margin, window.innerHeight - rect.height - margin);
      if (Math.hypot(x + rect.width / 2 - fromX, y + rect.height / 2 - fromY) > SAFE_DISTANCE_PX) break;
    }
    no.style.left = `${x}px`;
    no.style.top = `${y}px`;
  }

  private sayQuip(): void {
    const { quips } = this.data.script;
    this.els.quip.textContent = quips[this.quipIndex % quips.length] ?? '';
    this.quipIndex += 1;
  }

  private resetNoButton(): void {
    const { no } = this.els;
    no.classList.remove('is-loose');
    no.style.left = '';
    no.style.top = '';
    this.els.choices.append(no);
    this.noIsLoose = false;
  }
}

export function initMascot(): void {
  const root = document.querySelector<HTMLElement>('[data-mascot]');
  if (!root) return;
  const query = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;

  new Mascot(root, JSON.parse(root.dataset.mascot ?? '{}') as MascotData, {
    art: query('[data-mascot-art]'),
    message: query('[data-mascot-message]'),
    question: query('[data-mascot-question]'),
    choices: query('[data-mascot-choices]'),
    quip: query('[data-mascot-quip]'),
    yes: query<HTMLButtonElement>('[data-mascot-yes]'),
    no: query<HTMLButtonElement>('[data-mascot-no]'),
  });
}
