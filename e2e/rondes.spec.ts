import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { playNameRound, playPointRound, realTap, selectOnly, start, tap } from './helpers';

const RIVER_IDS = ['donau', 'maas', 'po', 'rhone', 'rijn', 'schelde', 'seine', 'theems', 'volga'];

async function homeRivieren(page: Page) {
  await page.goto('/');
  await selectOnly(page, 'Rivieren');
}

async function perfectRound(page: Page, button: 'Aanwijzen' | 'Benoemen') {
  await start(page, button);
  await (button === 'Aanwijzen' ? playPointRound(page) : playNameRound(page));
  await expect(page.getByTestId('score')).toHaveText('9 van 9 goed');
  await page.getByRole('button', { name: 'Naar start' }).click();
}

test('Verkennen: tik op Rijn toont naam en markeert de rivier', async ({ page }) => {
  await homeRivieren(page);
  await start(page, 'Verkennen');
  await tap(page, 'rijn');
  await expect(page.getByTestId('verkennen-caption')).toHaveText('Rijn');
  await expect(page.getByTestId('feature-rijn')).toHaveAttribute('data-highlight', 'selected');
});

test('Aanwijzen Rivieren: 9 van 9 goed', async ({ page }) => {
  await homeRivieren(page);
  await start(page, 'Aanwijzen');
  await playPointRound(page);
  await expect(page.getByTestId('score')).toHaveText('9 van 9 goed');
});

test('Benoemen Rivieren: 9 van 9 goed, typo telt als goed', async ({ page }) => {
  await homeRivieren(page);
  await start(page, 'Benoemen');
  let sawTypo = false;
  await playNameRound(page, {
    answer: (id) => (id === 'donau' ? 'Donua' : undefined),
    onAlmost: async () => {
      sawTypo = true;
      await expect(page.getByTestId('given').locator('mark').first()).toBeVisible();
      await expect(page.getByTestId('correct').locator('mark').first()).toBeVisible();
    },
  });
  expect(sawTypo).toBe(true);
  await expect(page.getByTestId('score')).toHaveText('9 van 9 goed');
});

test('Mastery: 2x Aanwijzen + 2x Benoemen perfect, blijft na reload; Annuleer en wissen', async ({ page }) => {
  test.setTimeout(120_000); // four 9-item rounds at 800 ms per correct answer
  await homeRivieren(page);
  await perfectRound(page, 'Aanwijzen');
  await perfectRound(page, 'Aanwijzen');
  await perfectRound(page, 'Benoemen');
  await perfectRound(page, 'Benoemen');

  await page.getByRole('button', { name: 'Voortgang' }).click();
  for (const id of RIVER_IDS) await expect(page.getByTestId(`mastered-${id}`)).toBeVisible();
  await expect(page.getByText('9 van 28 geleerd')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Voortgang' }).click();
  for (const id of RIVER_IDS) await expect(page.getByTestId(`mastered-${id}`)).toBeVisible();
  await expect(page.getByText('9 van 28 geleerd')).toBeVisible();

  // Annuleer keeps progress
  await page.getByRole('button', { name: 'Wis voortgang' }).click();
  await expect(page.getByText('Weet je het zeker?')).toBeVisible();
  await page.getByRole('button', { name: 'Annuleer' }).click();
  await expect(page.getByTestId('mastered-donau')).toBeVisible();

  // Confirm wipes
  await page.getByRole('button', { name: 'Wis voortgang' }).click();
  await page.getByRole('button', { name: 'Ja, wis alles' }).click();
  await expect(page.getByTestId('mastered-donau')).toHaveCount(0);
  await expect(page.getByText('0 van 28 geleerd')).toBeVisible();
});

test('Aanwijzen: een fout staat in het resultaat en Oefen deze fouten start 1 item', async ({ page }) => {
  await homeRivieren(page);
  await start(page, 'Aanwijzen');
  await playPointRound(page, { wrongOn: 1 });
  await expect(page.getByTestId('score')).toHaveText('8 van 9 goed');
  await expect(page.getByRole('region', { name: 'Dit ging fout' }).getByRole('listitem')).toHaveCount(1);
  await page.getByRole('button', { name: 'Oefen deze fouten' }).click();
  await expect(page.getByTestId('progress')).toHaveText('0 van 1');
  await expect(page.getByTestId('prompt')).toHaveAttribute('data-mode', 'aanwijzen');
});

test('Benoemen: fout antwoord toont het goede antwoord, overtypen, 1 fout in resultaat', async ({ page }) => {
  await homeRivieren(page);
  await start(page, 'Benoemen');
  let wrongGiven = false;
  await playNameRound(page, {
    answer: (id) => {
      if (id === 'po' && !wrongGiven) {
        wrongGiven = true;
        return 'Zzzzzz';
      }
      return undefined;
    },
  });
  expect(wrongGiven).toBe(true);
  await expect(page.getByTestId('score')).toHaveText('8 van 9 goed');
  await expect(page.getByRole('region', { name: 'Dit ging fout' }).getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Dit ging fout' })).toContainText('Benoemen: Po');
});

test('Verkennen met echte coordinaten: Ardennen, Maas en Alpen zijn aan te tikken (alle categorieen)', async ({ page }) => {
  await page.goto('/');
  await start(page, 'Verkennen');
  for (const [id, name] of [['ardennen', 'Ardennen'], ['maas', 'Maas'], ['alpen', 'Alpen']]) {
    await realTap(page, id);
    await expect(page.getByTestId('verkennen-caption')).toHaveText(name);
    await expect(page.getByTestId(`feature-${id}`)).toHaveAttribute('data-highlight', 'selected');
  }
});

test('Aanwijzen met echte coordinaten: elk item is met een echte tik op zijn zichtbare vorm te raken (standaardinstellingen)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await start(page, 'Aanwijzen');
  for (;;) {
    const prompt = page.getByTestId('prompt');
    const resultaat = page.getByTestId('resultaat');
    await expect(prompt.or(resultaat)).toBeVisible();
    if (await resultaat.isVisible()) break;
    const old = await prompt.elementHandle();
    const id = (await prompt.getAttribute('data-item-id'))!;
    await realTap(page, id);
    await expect(page.getByTestId(`feature-${id}`)).toHaveAttribute('data-highlight', 'correct');
    await page.waitForFunction((el) => !el!.isConnected, old, { timeout: 10_000 });
  }
  await expect(page.getByTestId('score')).toContainText('goed');
  await expect(page.getByTestId('score')).toHaveText(/^(\d+) van \1 goed$/);
});
