/**
 * The hosted policy pages (the `site/` folder, served from the `gh-pages` branch). Settings opens
 * them in the browser; there is no in-app copy to keep in step.
 */
import { Linking } from 'react-native';

export const PRIVACY_URL = 'https://mattwayles.github.io/wanderlift/privacy.html';
export const TERMS_URL = 'https://mattwayles.github.io/wanderlift/terms.html';

/** Opens one of the pages. False when the phone could not open it, so the caller can say so. */
export async function openLegalPage(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
