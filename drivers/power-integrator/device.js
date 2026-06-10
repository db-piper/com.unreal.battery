'use strict';

const Homey = require('homey');

module.exports = class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Power Integrator has been initialized');
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Power Integrator has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes("deviceClass")) {
      await this.setClass(newSettings.deviceClass);
      this.homey.log(`powerIntegrator:onSettings: New Device Class: ${newSettings.deviceClass}`);
      return `New device class: ${newSettings.deviceClass}`;
    }

    if (changedKeys.includes("isGridEnergy")) {
      if (newSettings.isGridEnergy === "import") {
        await this.setEnergy({
          cumulativeImportedCapability: 'meter_power',
          cumulativeExportedCapability: null,
          cumulative: true
        });
      } else if (newSettings.isGridEnergy === "export") {
        await this.setEnergy({
          cumulativeImportedCapability: null,
          cumulativeExportedCapability: 'meter_power',
          cumulative: true

        })
      } else {
        await this.setEnergy({
          cumulativeImportedCapability: null,
          cumulativeExportedCapability: null,
          cumulative: false
        });
      }
      this.log(`PowerIntegrator:onSettings - energy: ${JSON.stringify(this.getEnergy())} `);
    }

  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Power Integrator was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Power Integrator has been deleted');
  }

};
