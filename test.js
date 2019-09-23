let device = require('device');
let os = device.os;

function logExpr(expr) {
    let str = expr.toString()
    str = str.substring(5, str.length);
    console.log(`${str} = ${expr()}`);
}

logExpr(() => os.sdkVersion);
logExpr(() => os.sdkName);
logExpr(() => os.incremental);
logExpr(() => os.securityPatch);
logExpr(() => device.product);
logExpr(() => device.serial);
logExpr(() => device.cpuApis);
logExpr(() => device.buildId);
logExpr(() => device.display);
logExpr(() => device.bootloader);
logExpr(() => device.hardware);
logExpr(() => device.fingerprint);
logExpr(() => device.imei);
logExpr(() => device.androidId);
logExpr(() => device.getVolume("music"));
logExpr(() => device.setVolume("music", 1));
logExpr(() => device.getVolumeRange("music"));
logExpr(() => device.battery);
logExpr(() => device.batteryPlugged);
logExpr(() => device.macAddress);


