'use strict';

const Homey = require('homey');

module.exports = class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {

    const sharedBatteryHandler = this.updateUnrealBattery.bind(this);

    this.homey.flow.getActionCard('compute_unreal_battery_update')
      .registerRunListener(sharedBatteryHandler);

    this.homey.flow.getActionCard('unreal_battery_update')
      .registerRunListener(sharedBatteryHandler);

  }

  async updateUnrealBattery(args, state) {
    // args: device, soh, soc, temp, power [,time_base] - time_base is no longer used

    const batteryDevice = args.device;
    const homeyInstance = batteryDevice.homey;
    const lastTime = batteryDevice.getCapabilityValue('measure_time');
    const firstTime = lastTime === null;
    const thisTime = Date.now();
    homeyInstance.log(`unrealBatteryDriver:updateUnrealBattery: soc: ${args.soc}, soh: ${args.soh}, temp: ${args.temp}, power: ${args.power}`);

    const updates = [
      batteryDevice.setCapabilityValue('measure_percent.health', args.soh),
      batteryDevice.setCapabilityValue('measure_percent.soc', args.soc),
      batteryDevice.setCapabilityValue('measure_temperature', args.temp),
      batteryDevice.setCapabilityValue('measure_power', args.power),
      batteryDevice.setCapabilityValue('measure_battery', args.soc),
      batteryDevice.setCapabilityValue('measure_time', thisTime),
    ];

    if (!firstTime) {
      const deltaTime = thisTime - lastTime;

      const energy = Math.abs((args.power / 1000) * (deltaTime / 3600000));  // (W -> kW) * (ms -> hours) ==> W -> kWh
      const isCharging = args.power > 0;
      const energyInTotal = batteryDevice.getCapabilityValue('meter_power.charged') || 0;
      const energyOutTotal = batteryDevice.getCapabilityValue('meter_power.discharged') || 0;
      const energyInToday = batteryDevice.getCapabilityValue('meter_power.charged_today') || 0;
      const energyOutToday = batteryDevice.getCapabilityValue('meter_power.discharged_today') || 0;

      const isNewDay = homeyInstance.app.includesMidnight(lastTime, thisTime, homeyInstance.clock.getTimezone());
      const newTotalEnergyIn = (energyInTotal + (isCharging ? energy : 0));
      const newTotalEnergyOut = (energyOutTotal + (isCharging ? 0 : energy));
      const newEnergyInToday = isNewDay ? (isCharging ? energy : 0) : (energyInToday + (isCharging ? energy : 0));
      const newEnergyOutToday = isNewDay ? (isCharging ? 0 : energy) : (energyOutToday + (isCharging ? 0 : energy));
      let roundTripEfficiency = batteryDevice.getCapabilityValue('measure_percent.round_trip_efficiency') || null;
      if (args.soc >= 98 && newTotalEnergyIn > 0) {
        roundTripEfficiency = 100 * newTotalEnergyOut / newTotalEnergyIn;
      }

      updates.push(
        batteryDevice.setCapabilityValue('meter_power.charged', newTotalEnergyIn),
        batteryDevice.setCapabilityValue('meter_power.discharged', newTotalEnergyOut),
        batteryDevice.setCapabilityValue('meter_power.charged_today', newEnergyInToday),
        batteryDevice.setCapabilityValue('meter_power.discharged_today', newEnergyOutToday),
        batteryDevice.setCapabilityValue('measure_percent.round_trip_efficiency', roundTripEfficiency),
        batteryDevice.setCapabilityValue('measure_interval', homeyInstance.app.formatDuration(deltaTime))
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
        name: "Unreal Battery",
        data: {
          id: Date.now().toString(36) // Unique ID for this instance
        }
      }
    ];
  }

};