const EventEmitter = require('events');

const Build = $java.findClass("android.os.Build");
const VERSION = $java.findClass("android.os.Build$VERSION");
const Context = $java.findClass("android.content.Context");
const Secure = $java.findClass("android.provider.Settings$Secure");
const AudioManager = $java.findClass("android.media.AudioManager");
const IntentFilter = $java.findClass("android.content.IntentFilter");
const Intent = $java.findClass("android.content.Intent");
const BatteryManager = $java.findClass("android.os.BatteryManager");
const NetworkInterface = $java.findClass("java.net.NetworkInterface");
const BroadcastReceiver = $java.findClass("com.stardust.autojs.core.exported.BroadcastReceiver");


const AC = 1;
const USB = 2;
const WIRELESS = 4;
const sdkVersionNames = ["1.0", "1.1", "1.5", "1.6", "2.0", "2.0.1", "2.1.x", "2.2.x", "2.3", "2.3.3", "3.0.x", "3.1.x", "3.2", "4.0", "4.0.3", "4.1", "4.2", "4.3", "4.4.2", "4.4W", "5.0", "5.1", "6.0", "7.0", "7.1", "8.0", "8.1", "9.0", "10.0"];

class os {
    static get sdkVersion() {
        return VERSION.SDK_INT;
    } 

    static get sdkName() {
        let ver = os.sdkVersion;
        if (ver > sdkVersionNames.length) {
            return "unknown";
        }
        return sdkVersionNames[ver - 1];
    }

    static get incremental() {
        return VERSION.INCREMENTAL;
    }

    static get release() {
        return VERSION.RELEASE;
    }

    static get securityPatch() {
        return os.sdkVersion >= 23 ? VERSION.SECURITY_PATCH : "";
    }
}

class Device extends EventEmitter {
    constructor(context) {
        super();
        this.context = context;
        this._receiver = new BroadcastReceiver((ctx, intent) => {
            this._onReceive(intent.getAction(), intent);
        });
        context.registerReceiver(this._receiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
    }

    get os() {
        return os;
    }

    get product() {
        return {
            name: Build.PRODUCT,
            device: Build.DEVICE,
            board: Build.BOARD,
            brand: Build.BRAND,
            model: Build.MODEL
        };
    }

    get serial() {
        return Build.getSerial();
    }

    get cpuApis() {
        return Build.SUPPORTED_ABIS;
    }

    get buildId() {
        return Build.ID;
    }

    get display() {
        return Build.DISPLAY;
    }

    get bootloader() {
        return Build.BOOTLOADER;
    }

    get hardware() {
        return Build.HARDWARE;
    }

    get fingerprint() {
        return Build.FINGERPRINT;
    }

    get imei() {
        return this.context.getSystemService(this.context.TELEPHONY_SERVICE).getDeviceId();
    }

    get androidId() {
        return Secure.getString(this.context.getContentResolver(), Secure.ANDROID_ID)
    }

    getVolume(type) {
        let streamType = getStreamType(type);
        let audioManager = this.context.getSystemService(this.context.AUDIO_SERVICE);
        return audioManager.getStreamVolume(streamType)
    }

    setVolume(type, volume, flags = []) {
        let streamType = getStreamType(type);
        if (typeof volume !== 'number') {
            throw new TypeError('volume must be a number');
        }
        if (!Array.isArray(flags)) {
            throw new TypeError('flags must be an array');
        }
        let flagsValue = 0;
        flags.forEach(flag => {
            let flagValue = AudioManager[`FLAG_${flag.toUpperCase()}`];
            if (typeof flagValue !== 'number') {
                throw new Error(`Cannot recognize flag: ${flag}`);
            }
            flagsValue |= flagValue;
        });
        let audioManager = this.context.getSystemService(this.context.AUDIO_SERVICE);
        audioManager.setStreamVolume(streamType, volume, flagsValue);
    }

    getVolumeRange(type) {
        let streamType = getStreamType(type);
        let audioManager = this.context.getSystemService(this.context.AUDIO_SERVICE);
        return {
            min: audioManager.getStreamMinVolume(streamType),
            max: audioManager.getStreamMaxVolume(streamType)
        };
    }

    get battery() {
        let batteryIntent = this.context.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        return this._getBatteryFromIntent(batteryIntent);
    }

    _getBatteryFromIntent(batteryIntent) {
        if (batteryIntent == null) {
            return -1;
        }
        let level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        let scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        let battery = level * 100.0 / scale;
        return Math.round(battery * 10) / 10;
    }

    get batteryPlugged() {
        let batteryIntent = this.context.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        return this._getBatteryPluggedFromIntent(batteryIntent);
    }

    _getBatteryPluggedFromIntent(batteryIntent) {
        if (batteryIntent == null) {
            return null;
        }
        let plugged = batteryIntent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
        let result = [];
        if ((plugged & AC) != 0) {
            result.push('ac');
        }  
        if ((plugged & USB) != 0) {
            result.push('usb');
        } 
        if ((plugged & WIRELESS) != 0) {
            result.push('wireless');
        } 
        return result;
    }

    get macAddress() {
        let mac = this._getMacAddressByConnectionInfo();
        if (mac == null || mac == '02:00:00:00:00:00') {
            return this._getMacAddressByNetworkInterfaces();
        } 
        return mac;
    }

    _getMacAddressByNetworkInterfaces() {
        let iter = NetworkInterface.getNetworkInterfaces();
        while (iter.hasMoreElements()) {
            let networkInterface = iter.nextElement();
            if (networkInterface.getName().toLowerCase() === "wlan0") {
                let macBytes = networkInterface.getHardwareAddress();
                if (macBytes == null) {
                    return null;
                }
                let mac = macBytes.map(byte => {
                    if (byte < 0) {
                        byte = 0xff + byte;
                    }
                    let hex = byte.toString(16)
                    return hex.length > 1 ? hex : "0" + hex;
                }).join("");
                return mac;
            }
        }
        return null;
    }

    _getMacAddressByConnectionInfo() {
        let wifiManager = this.context.getSystemService(this.context.WIFI_SERVICE);
        let wifiInfo = wifiManager.getConnectionInfo();
        if (!wifiInfo) {
            return null;
        }
        return wifiInfo.getMacAddress();
    }

    _onReceive(action, intent) {
        console.log(`action = ${action}, intent = ${intent}`);
        switch (action) {
            case Intent.ACTION_BATTERY_CHANGED: {
                let battery = this._getBatteryFromIntent(intent);
                let plugged = this._getBatteryPluggedFromIntent(intent);
                emit("battery-changed", {battery, plugged})
            }
        }
    }
};

function getStreamType(type) {
    if (typeof type !== "string") {
        throw new TypeError("type must be a string");
    }
    if (['music', 'alarm', 'notification'].indexOf(type) < 0) {
        throw new Error(`Invalid stream type: ${type}`);
    }
    return AudioManager[`STREAM_${type.toUpperCase()}`];
}

module.exports = new Device(global.context);