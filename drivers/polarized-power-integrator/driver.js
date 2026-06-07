'use strict';

const Homey = require('homey');

module.exports = class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {

    const integrationHandler = this.updatePowerIntegration.bind(this);
    this.homey.flow.getActionCard('compute_polarized_power_integration')
      .registerRunListener(integrationHandler);
  }

  /**
   * Integrate new power reading into energy and energy today
   * @param {*} args    device, power, invertSign
   * @param {*} state 
   * @returns boolean   true
   */
  async updatePowerIntegration(args, state) {

    const integratorDevice = args.device;
    const homeyInstance = integratorDevice.homey;
    const lastTime = integratorDevice.getCapabilityValue('measure_time');
    const lastPower = integratorDevice.getCapabilityValue('measure_power') || 0;
    const thisPower = args.invertSign ? -args.power : args.power;
    const thisTime = Date.now();

    homeyInstance.log(`polarizingIntegrator: power: ${args.power}, invertSign: ${args.invertSign}`);

    const updates = [
      integratorDevice.setCapabilityValue('measure_time', thisTime),
      integratorDevice.setCapabilityValue('measure_power', thisPower),
    ];

    if (lastTime !== null) {
      const deltaTime = thisTime - lastTime;
      const deltaEnergy = Math.abs((lastPower / 1000) * (deltaTime / 3600000));
      const isNewDay = homeyInstance.app.includesMidnight(lastTime, thisTime, homeyInstance.clock.getTimezone());

      // Calculate baseline totals, resetting them to 0 if midnight was crossed
      const baseImportToday = isNewDay ? 0 : (integratorDevice.getCapabilityValue('meter_power.import_today') || 0);
      const baseExportToday = isNewDay ? 0 : (integratorDevice.getCapabilityValue('meter_power.export_today') || 0);

      // Determine active channel for this interval's accumulation
      const isActiveExport = lastPower < 0;
      const energyCapability = isActiveExport ? 'meter_power.export' : 'meter_power.import';
      const lastEnergyTotal = integratorDevice.getCapabilityValue(energyCapability) || 0;

      updates.push(
        // Update lifetime total
        integratorDevice.setCapabilityValue(energyCapability, deltaEnergy + lastEnergyTotal),

        // Update daily totals (the inactive one gets its clean base baseline, active gets the delta)
        integratorDevice.setCapabilityValue('meter_power.import_today', baseImportToday + (!isActiveExport ? deltaEnergy : 0)),
        integratorDevice.setCapabilityValue('meter_power.export_today', baseExportToday + (isActiveExport ? deltaEnergy : 0)),

        integratorDevice.setCapabilityValue('measure_interval', homeyInstance.app.formatDuration(deltaTime))
      );
    }

    await Promise.all(updates);
    return true;
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      {
        name: "Polarizing Power Integrator",
        data: {
          id: Date.now().toString(36) // Unique ID for this instance
        }
      }
    ];
  }

};
