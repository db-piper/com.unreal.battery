'use strict';

const Homey = require('homey');

module.exports = class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {

    this.homey.flow.getActionCard('compute_unreal_battery_update')
      .registerRunListener(async (args, state) => {

        // args: device, soh, soc, temp, power, time_base

        const batteryDevice = args.device;
        const isMidnight = await this.checkLocalMidnight(args.time_base);

        await Promise.all([
          batteryDevice.setCapabilityValue('measure_percent.health', args.soh),
          batteryDevice.setCapabilityValue('measure_percent.soc', args.soc),
          batteryDevice.setCapabilityValue('measure_temperature', args.temp),
          batteryDevice.setCapabilityValue('measure_power', args.power),
          batteryDevice.setCapabilityValue('measure_battery', args.soc)
        ]);

        const energy = Math.abs((args.power / 1000) * (args.time_base / 3600));  // (W -> kW) * (seconds -> hours) ==> W -> kWh
        const isCharging  = args.power > 0
        const energyInTotal  = batteryDevice.getCapabilityValue('meter_power.charged')          || 0;
        const energyOutTotal = batteryDevice.getCapabilityValue('meter_power.discharged')       || 0;
        const energyInToday  = batteryDevice.getCapabilityValue('meter_power.charged_today')    || 0;
        const energyOutToday = batteryDevice.getCapabilityValue('meter_power.discharged_today') || 0;

        const newTotalEnergyIn  =                                               (energyInTotal  + (isCharging ? energy : 0));
        const newTotalEnergyOut =                                               (energyOutTotal + (isCharging ? 0      : energy));
        const newEnergyInToday  = isMidnight ? (isCharging ? energy : 0)      : (energyInToday  + (isCharging ? energy : 0));
        const newEnergyOutToday = isMidnight ? (isCharging ? 0      : energy) : (energyOutToday + (isCharging ? 0      : energy));
        let roundTripEfficiency = batteryDevice.getCapabilityValue('measure_percent.round_trip_efficiency') || null;
        if (args.soc >= 98 && newTotalEnergyIn > 0) {
          roundTripEfficiency = 100 * newTotalEnergyOut / newTotalEnergyIn;
        }

        await Promise.all([
          batteryDevice.setCapabilityValue('meter_power.charged', newTotalEnergyIn),
          batteryDevice.setCapabilityValue('meter_power.discharged', newTotalEnergyOut),
          batteryDevice.setCapabilityValue('meter_power.charged_today', newEnergyInToday),
          batteryDevice.setCapabilityValue('meter_power.discharged_today', newEnergyOutToday),
          batteryDevice.setCapabilityValue('measure_percent.round_trip_efficiency', roundTripEfficiency)
        ]);
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
        name: "Unreal Battery",
        data: {
          id: Date.now().toString(36) // Unique ID for this instance
        }
      }
    ];
  }

  async checkLocalMidnight(windowSeconds = 30) {
    // 1. Get the timezone string from Homey settings (e.g., "Europe/London")
    const tz = await this.homey.clock.getTimezone();
    const now = new Date();

    // 2. Format the current time to the local parts
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    const minute = parseInt(parts.find(p => p.type === 'minute').value);
    const second = parseInt(parts.find(p => p.type === 'second').value);

    // 3. Calculate seconds passed since local midnight
    const secondsSinceMidnight = (hour * 3600) + (minute * 60) + second;

    // Return true if we are within the reset window
    return secondsSinceMidnight >= 0 && secondsSinceMidnight <= windowSeconds;
  }

};
