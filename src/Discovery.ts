import * as bonjour from 'axis-discovery-bonjour';
import * as ssdp from 'axis-discovery-ssdp';
import * as events from 'events';

import { Device } from './';
import { BonjourDiscovery } from './bonjour';
import { DeviceCache } from './caches';
import { log } from './logging';
import { IDiscovery } from './shared';
import { SsdpDiscovery } from './ssdp';

/**
 * Class responsible for discovering Axis cameras on the network.
 */
export class Discovery {

    private readonly discoveries = new Array<IDiscovery>();
    private readonly eventEmitter = new events.EventEmitter();
    private readonly cache = new DeviceCache();

    /**
     * Initializes a new instance of the class.
     * @param bonjourDiscovery The Bounjour discovery implemetation. Default
     * value is an instance of require('axis-discovery-bonjour').Discovery.
     * @param ssdpDiscovery The SSDP discovery implemetation. Default
     * value is an instance of require('axis-discovery-ssdp').Discovery.
     */
    constructor(bonjourDiscovery?: bonjour.Discovery, ssdpDiscovery?: ssdp.Discovery) {
        this.setup(new BonjourDiscovery(bonjourDiscovery || new bonjour.Discovery()));
        this.setup(new SsdpDiscovery(ssdpDiscovery || new ssdp.Discovery()));
    }

    /**
     * Start listen for device advertisements on all network interface
     * addresses.
     */
    public async start(): Promise<void> {
        log('Discovery#start');

        for (const discovery of this.discoveries) {
            await discovery.start();
        }
    }

    /**
     * Stop listening for device advertisements.
     */
    public async stop(): Promise<void> {
        log('Discovery#stop');

        for (const discovery of this.discoveries) {
            await discovery.stop();
        }
    }

    /**
     * Triggers a new search for devices on the network.
     */
    public async search(): Promise<void> {
        log('Discovery#search');

        for (const discovery of this.discoveries) {
            await discovery.search();
        }
    }

    /**
     * Register a callback that is invoked when a device is found on the
     * network.
     */
    public onHello(callback: (device: Device) => void) {
        this.eventEmitter.on('hello', (device: Device) => callback(device));
    }

    /**
     * Register a callback that is invoked when a device intentionally is
     * disconnecting from the network.
     */
    public onGoodbye(callback: (device: Device) => void) {
        this.eventEmitter.on('goodbye', (device: Device) => callback(device));
    }

    private setup(discovery: IDiscovery) {
        this.discoveries.push(discovery);

        discovery.onHello((device: Device) => {
            device = this.cache.update(device);
            this.eventEmitter.emit('hello', device);
        });

        discovery.onGoodbye((device: Device) => {
            device = this.cache.update(device);
            this.eventEmitter.emit('goodbye', device);
        });
    }
}
