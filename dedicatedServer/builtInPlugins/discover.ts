import ssdp, { type CachedAdvert } from '@achingbrain/ssdp';
import {address} from 'ip';

let advert: CachedAdvert;

Server.on("init", async server => {
    const bus = await ssdp();
    bus.on('error', console.error);
    advert = await bus.advertise({
        usn: 'urn:SweatyCircle439:SuperSplashBros3:Server',
        interval: 10000,
        details: {
            URLBase: `ssb3://${address()}:${server.port}`,
            serverName: 'asdf',
            device: {
                deviceType: 'a-usn',
                friendlyName: Server.name,
                manufacturer: '',
                manufacturerURL: '',
                modelDescription: '',
                modelName: '',
                modelNumber: '',
                modelURL: '',
                serialNumber: '',
            }
        }
    });
});

Server.on("stop", () => {
    advert.stop.bind(advert)();
});