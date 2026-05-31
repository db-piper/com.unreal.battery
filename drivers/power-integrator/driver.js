'use strict';

const Homey = require('homey');

module.exports = class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.homey.flow.getActionCard('compute_power_integration')
      .registerRunListener(async (args, state) => {

        // args: device, power

        const integratorDevice = args.device;
        const lastTime = integratorDevice.getCapabilityValue('measure_time');
        const firstTime = lastTime === null;
        const thisTime = Date.now();

        const updates = [
          integratorDevice.setCapabilityValue('measure_time', thisTime),
          integratorDevice.setCapabilityValue('measure_power', args.power),
        ];

        if (!firstTime) {
          const lastEnergyTotal = integratorDevice.getCapabilityValue('meter_power') || 0;
          const lastEnergyToday = integratorDevice.getCapabilityValue('meter_power.today') || 0;
          const deltaTime = thisTime - lastTime;
          const deltaEnergy = (args.power / 1000) * (deltaTime / 3600000);
          const isNewDay = this.includesMidnight(lastTime, thisTime, this.homey.clock.getTimezone());
          updates.push(
            integratorDevice.setCapabilityValue('meter_power', deltaEnergy + lastEnergyTotal),
            integratorDevice.setCapabilityValue('meter_power.today', deltaEnergy + (isNewDay ? 0 : lastEnergyToday)),
            integratorDevice.setCapabilityValue('measure_interval', this.formatDuration(deltaTime))
          )
        }

        await Promise.all(updates);
        return true;

      });
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      {
        name: "Power Integrator",
        data: {
          id: Date.now().toString(36) // Unique ID for this instance
        }
      }
    ];
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
