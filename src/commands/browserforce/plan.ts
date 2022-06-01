import { writeFile } from 'fs/promises';
import { Messages } from '@salesforce/core';
import * as path from 'path';
import { BrowserforceCommand } from '../../browserforce-command';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages(
  'sfdx-browserforce-plugin',
  'browserforce'
);

export default class BrowserforcePlanCommand extends BrowserforceCommand {
  public static description = messages.getMessage('planCommandDescription');

  public static examples = [
    `$ sfdx browserforce:plan -f ./config/setup-admin-login-as-any.json --targetusername myOrg@example.com
  logging in... done
  Generating plan with definition file ./config/setup-admin-login-as-any.json from org myOrg@example.com
  [Security] retrieving state... done
  [Security] generating plan... done
  logging out... done
  `
  ];

  public async run(): Promise<unknown> {
    this.ux.log(
      `Generating plan with definition file ${
        this.flags.definitionfile
      } from org ${this.org.getUsername()}`
    );
    const state = {
      settings: {}
    };
    const plan = {
      settings: {}
    };
    for (const setting of this.settings) {
      const driver = setting.Driver;
      const instance = new driver(this.bf, this.org);
      this.ux.startSpinner(`[${driver.name}] retrieving state`);
      let driverState;
      try {
        driverState = await instance.retrieve(setting.value);
        state.settings[setting.key] = driverState;
      } catch (err) {
        this.ux.stopSpinner('failed');
        throw err;
      }
      this.ux.stopSpinner();
      this.ux.startSpinner(`[${driver.name}] generating plan`);
      const driverPlan = instance.diff(driverState, setting.value);
      plan.settings[setting.key] = driverPlan;
      this.ux.stopSpinner();
    }
    if (this.flags.statefile) {
      this.ux.startSpinner('writing state file');
      await writeFile(
        path.resolve(this.flags.statefile),
        JSON.stringify(state, null, 2)
      );
      this.ux.stopSpinner();
    }
    if (this.flags.planfile) {
      this.ux.startSpinner('writing plan file');
      await writeFile(
        path.resolve(this.flags.planfile),
        JSON.stringify(plan, null, 2)
      );
      this.ux.stopSpinner();
    }
    return { success: true, plan };
  }
}
