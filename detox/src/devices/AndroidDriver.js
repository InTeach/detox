const {spawn} = require('child_process');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const log = require('npmlog');
const invoke = require('../invoke');
const InvocationManager = invoke.InvocationManager;
const ADB = require('./android/ADB');
const AAPT = require('./android/AAPT');
const DeviceDriverBase = require('./DeviceDriverBase');

const EspressoDetox = 'com.wix.detox.espresso.EspressoDetox';

class AndroidDriver extends DeviceDriverBase {
  constructor(client) {
    super(client);
    const expect = require('../android/expect');
    expect.exportGlobals();
    this.invocationManager = new InvocationManager(client);
    expect.setInvocationManager(this.invocationManager);

    this.adb = new ADB();
    this.aapt = new AAPT();
  }

  async getBundleIdFromBinary(apkPath) {
    return await this.aapt.getPackageName(apkPath);
  }

  async installApp(deviceId, binaryPath) {
    await this.adb.install(deviceId, binaryPath);
     const testApkPath = binaryPath.split('.apk')[0] + '-androidTest.apk';
    await this.adb.install(deviceId, testApkPath);
  }

  getTestApkPath(originalApkPath) {
    const originalApkPathObj = path.parse(originalApkPath);
    let splitPath = originalApkPathObj.dir.split(path.sep);
    splitPath.splice(splitPath.length-1 , 0, 'androidTest');
    const testApkPath = path.join(splitPath.join(path.sep), `${originalApkPathObj.name}-androidTest${originalApkPathObj.ext}`);
    if (!fs.existsSync(testApkPath)) {
      throw new Error(`'${testApkPath}' could not be found, did you run './gradlew assembleAndroidTest' ?`);
    }

    return testApkPath;
  }

  async uninstallApp(deviceId, bundleId) {
    try {
      await this.adb.uninstall(deviceId, bundleId);
    } catch (ex) {
      //this is fine
    }

    try {
      await this.adb.uninstall(deviceId, `${bundleId}.test`);
    } catch (ex) {
      //this is fine
    }
  }

  async launch(deviceId, bundleId, launchArgs) {
    const args = [];
    _.forEach(launchArgs, (value, key) => {
      args.push(`${key} ${value}`);
    });

    if (this.instrumentationProcess) {
      const call = invoke.call(invoke.Android.Class("com.wix.detox.Detox"), 'launchMainActivity');
      await this.invocationManager.execute(call);
      return this.instrumentationProcess.pid;
    }

    this.instrumentationProcess = spawn(`adb`, [`-s`, `${deviceId}`, `shell`, `am`, `instrument`, `-w`, `-r`, `${args.join(' ')}`, `-e`, `debug`,
      `false`, `${bundleId}.test/android.support.test.runner.AndroidJUnitRunner`]);
    log.verbose(this.instrumentationProcess.spawnargs.join(" "));
    log.verbose('Instrumentation spawned, childProcess.pid: ', this.instrumentationProcess.pid);
    this.instrumentationProcess.stdout.on('data', function(data) {
      log.verbose('Instrumentation stdout: ', data.toString());
    });
    this.instrumentationProcess.stderr.on('data', function(data) {
      log.verbose('Instrumentation stderr: ', data.toString());
    });

    this.instrumentationProcess.on('close', (code, signal) => {
      log.verbose(`instrumentationProcess terminated due to receipt of signal ${signal}`);
    });

    return this.instrumentationProcess.pid;
  }

  async openURL(deviceId, params) {
    const call = invoke.call(invoke.Android.Class("com.wix.detox.Detox"), 'startActivityFromUrl', invoke.Android.String(params.url));
    await this.invocationManager.execute(call);
  }

  async sendToHome(deviceId, params) {
    const uiDevice = invoke.call(invoke.Android.Class("com.wix.detox.uiautomator.UiAutomator"), 'uiDevice');
    const call = invoke.call(uiDevice, 'pressHome');
    await this.invocationManager.execute(call);
  }

  async terminate(deviceId, bundleId) {
    this.terminateInstrumentation();
    await this.adb.terminate(deviceId, bundleId);
  }

  terminateInstrumentation() {
    if (this.instrumentationProcess) {
      this.instrumentationProcess.kill();
      this.instrumentationProcess = null;
    }
  }

  async cleanup(deviceId, bundleId) {
    this.terminateInstrumentation();
  }

  defaultLaunchArgsPrefix() {
    return '-e ';
  }

  getPlatform() {
    return 'android';
  }

  async findDeviceId(filter) {
    const adbDevices = await this.adb.devices();
    console.log('adbDevices', JSON.stringify(adbDevices));
    const filteredDevices = _.filter(adbDevices, filter);
    console.log('filter', JSON.stringify(filter));
    let adbName;
    switch (filteredDevices.length) {
      case 1:
        const adbDevice = filteredDevices[0];
        adbName = adbDevice.adbName;
        break;
      case 0:
        throw new Error(`Could not find '${filter}' on the currently ADB attached devices, 
      try restarting adb 'adb kill-server && adb start-server'`);
        break;
      default:
        throw new Error(`Got more than one device corresponding to the name: ${filter}`);
    }

    return adbName;
  }

  async setURLBlacklist(urlList) {
    const call = invoke.call(invoke.Android.Class(EspressoDetox), 'setURLBlacklist', urlList);
    await this.invocationManager.execute(call);
  }

  async enableSynchronization() {
    const call = invoke.call(invoke.Android.Class(EspressoDetox), 'setSynchronization', invoke.Android.Boolean(true));
    await this.invocationManager.execute(call);
  }

  async disableSynchronization() {
    const call = invoke.call(invoke.Android.Class(EspressoDetox), 'setSynchronization', invoke.Android.Boolean(false));
    await this.invocationManager.execute(call);
  }

  async setOrientation(deviceId, orientation) {
    const orientationMapping = {
      landscape: 1, // top at left side landscape
      portrait: 0 // non-reversed portrait.
    };
    
    const call = invoke.call(invoke.Android.Class(EspressoDetox), 'changeOrientation', invoke.Android.Integer(orientationMapping[orientation]));
    await this.invocationManager.execute(call);
  }
}

module.exports = AndroidDriver;
