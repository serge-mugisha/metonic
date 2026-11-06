import { daysUntil, formatMoney, formatRecurring, nextChargeOn, toIsoDate } from '@metonic/core';
import { dismissDetection, recordDetection, trackDetection } from '../src/actions';
import type { DetectedReply, Message } from '../src/messages';
import { detectionAccess, detectorMatches } from '../src/permissions';
import { pendingDetections, sentReminders, settings, subscriptions } from '../src/storage';

const DETECTOR_ID = 'metonic-checkout-detector';
const REMINDER_ALARM = 'metonic-reminders';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    void setup();
    // Site access is optional, so first-run explains detection and asks for it.
    if (reason === 'install') void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
  });
  browser.runtime.onStartup.addListener(() => void setup());

  browser.permissions.onAdded.addListener(() => void registerDetector());
  browser.permissions.onRemoved.addListener(() => void registerDetector());

  browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (message.type === 'checkout-detected') {
      void onCheckoutDetected(message).then(sendResponse);
      return true; // keep the channel open for the async reply
    }
    if (message.type === 'decide-detection') {
      void decide(message.key, message.track).then(() => sendResponse());
      return true;
    }
    return undefined;
  });

  browser.notifications.onButtonClicked.addListener((id, buttonIndex) => void onNotificationButton(id, buttonIndex));

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REMINDER_ALARM) void sendReminders();
  });

  pendingDetections.watch((pending) => void updateBadge(pending?.length ?? 0));
});

async function setup() {
  await registerDetector();
  await browser.alarms.create(REMINDER_ALARM, { periodInMinutes: 12 * 60, delayInMinutes: 1 });
  await updateBadge((await pendingDetections.getValue()).length);
}

/** (Re)register the checkout detector on the sites the user has allowed, or remove it if there are none. */
async function registerDetector() {
  const matches = detectorMatches(await detectionAccess());
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [DETECTOR_ID] });

  if (matches.length === 0) {
    if (existing.length > 0) await browser.scripting.unregisterContentScripts({ ids: [DETECTOR_ID] });
    return;
  }
  const script = {
    id: DETECTOR_ID,
    js: ['content-scripts/checkout.js'],
    matches,
    runAt: 'document_idle' as const,
  };
  if (existing.length > 0) await browser.scripting.updateContentScripts([script]);
  else await browser.scripting.registerContentScripts([script]);
}

async function onCheckoutDetected(message: Extract<Message, { type: 'checkout-detected' }>): Promise<DetectedReply> {
  const entry = await recordDetection(message.page, message.detection);
  if (!entry) return {};

  const price = entry.detection.recurring;
  const trial = entry.detection.trial;
  const details = [
    price && formatRecurring(price.price, price.cycle),
    trial && (trial.days ? `${trial.days}-day free trial` : 'free trial'),
  ]
    .filter(Boolean)
    .join(' · ');

  const { prompt } = await settings.getValue();
  if (prompt !== 'page') {
    await browser.notifications.create(`detect:${entry.key}`, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: `Subscribing to ${entry.name}?`,
      message: details ? `${details}. Track it in Metonic?` : 'Track it in Metonic?',
      buttons: [{ title: 'Track it' }, { title: 'Not now' }],
      requireInteraction: true,
    });
  }
  return prompt === 'notification' ? {} : { prompt: { key: entry.key, name: entry.name, details } };
}

/** Track or dismiss a detection, from the page prompt or the notification. */
async function decide(key: string, track: boolean) {
  if (track) await trackDetection(key);
  else await dismissDetection(key);
  await browser.notifications.clear(`detect:${key}`);
}

async function onNotificationButton(notificationId: string, buttonIndex: number) {
  if (!notificationId.startsWith('detect:')) return;
  await decide(notificationId.slice('detect:'.length), buttonIndex === 0);
}

async function sendReminders() {
  const { reminderDays } = await settings.getValue();
  const today = toIsoDate(new Date());
  const sent = { ...(await sentReminders.getValue()) };

  for (const sub of await subscriptions.getValue()) {
    const chargeOn = nextChargeOn(sub, today);
    if (!chargeOn) continue;
    const days = daysUntil(chargeOn);
    if (days < 0 || days > reminderDays) continue;

    const key = `${sub.id}:${chargeOn}`;
    if (sent[key]) continue;
    sent[key] = true;

    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    const what = sub.status === 'trial' ? 'Free trial ends' : 'Renews';
    await browser.notifications.create(`reminder:${key}`, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: `${sub.name}: ${what} ${when}`,
      message:
        sub.price.amountMinor > 0
          ? `You'll be charged ${formatMoney(sub.price)} on ${chargeOn}.`
          : `Next charge on ${chargeOn}.`,
    });
  }

  await sentReminders.setValue(sent);
}

async function updateBadge(count: number) {
  await browser.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  await browser.action.setBadgeBackgroundColor({ color: '#4f46e5' });
}
