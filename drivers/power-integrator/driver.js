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
        const homeyInstance = integratorDevice.homey
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
          const isNewDay = homeyInstance.app.includesMidnight(lastTime, thisTime, homeyInstance.clock.getTimezone());
          updates.push(
            integratorDevice.setCapabilityValue('meter_power', deltaEnergy + lastEnergyTotal),
            integratorDevice.setCapabilityValue('meter_power.today', deltaEnergy + (isNewDay ? 0 : lastEnergyToday)),
            integratorDevice.setCapabilityValue('measure_interval', homeyInstance.app.formatDuration(deltaTime))
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

};
