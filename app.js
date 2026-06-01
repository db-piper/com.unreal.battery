'use strict';

const Homey = require('homey');

module.exports = class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('MyApp has been initialized');
  }

  /**
   * Checks if the interval between two epoch millisecond timestamps includes midnight,
   * dynamically respecting the Homey user's local timezone and DST settings.
   * @param   {number} epochMillis1 -   First timestamp
   * @param   {number} epochMillis2 -   Second timestamp
   * @param   {string} homeyTimeZone -  Timezone string set in Homey
   * @returns {boolean}                 True if the interval crosses local midnight
   */
  includesMidnight(epochMillis1, epochMillis2, homeyTimeZone) {

    const d1 = new Date(epochMillis1);
    const d2 = new Date(epochMillis2);

    // 2. Format the dates utilizing Homey's local timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: homeyTimeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });

    const dateStr1 = formatter.format(d1);
    const dateStr2 = formatter.format(d2);

    // 3. If the calendar dates match, midnight was not crossed.
    return dateStr1 !== dateStr2;
  }

  /**
   * Format milliseconds into HH:MM:SS.mmm format
   * @param   {number} ms -   Milliseconds
   * @returns {string}      Formatted duration string
   */
  formatDuration(ms) {
    const positiveMs = Math.max(0, ms);

    const hours = Math.floor(positiveMs / 3600000);
    const minutes = Math.floor((positiveMs % 3600000) / 60000);
    const seconds = Math.floor((positiveMs % 60000) / 1000);
    const milliseconds = positiveMs % 1000;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const sss = String(milliseconds).padStart(3, '0');

    return `${hh}:${mm}:${ss}.${sss}`;
  }


};
