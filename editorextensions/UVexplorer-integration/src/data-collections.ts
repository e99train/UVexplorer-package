import { Device, DeviceCategories, DeviceClass, ProtocolProfile } from 'model/uvexplorer-model';
import {
    CollectionProxy,
    DataItemProxy,
    DataProxy,
    DataSourceProxy,
    EditorClient,
    ScalarFieldTypeEnum,
    SerializedFieldType
} from 'lucid-extension-sdk';

const client = new EditorClient();
const data = new DataProxy(client);

export function createOrRetrieveNetworkSource(name: string, guid: string) {
    for (const [, source] of data.dataSources) {
        if (source.getSourceConfig().guid === guid) {
            return source;
        }
    }
    return data.addDataSource(name, { guid: guid });
}

function toSnakeCase(val: string): string {
    return val
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
}

export function createOrRetrieveDeviceCollection(source: DataSourceProxy) {
    for (const [, collection] of source.collections) {
        if (collection.getName() === `${toSnakeCase(source.getName())}_device`) {
            return collection;
        }
    }
    // TODO: maybe just add a bool field to flag which devices are visible?
    return source.addCollection(`${toSnakeCase(source.getName())}_device`, {
        fields: [
            { name: 'guid', type: ScalarFieldTypeEnum.STRING },
            { name: 'ip_address', type: ScalarFieldTypeEnum.STRING },
            { name: 'mac_address', type: ScalarFieldTypeEnum.STRING },
            { name: 'info_sets', type: ScalarFieldTypeEnum.STRING },
            { name: 'device_class', type: ScalarFieldTypeEnum.STRING },
            { name: 'device_categories', type: ScalarFieldTypeEnum.STRING },
            { name: 'protocol_profile', type: ScalarFieldTypeEnum.STRING },
            { name: 'timestamp', type: ScalarFieldTypeEnum.STRING }
        ],
        primaryKey: ['guid']
    });
}

export function addDevicesToCollection(collection: CollectionProxy, devices: Device[]) {
    collection.patchItems({
        added: devices.map((d) => deviceToRecord(d))
    });
}

export function deleteDevicesFromCollection(collection: CollectionProxy) {
    const guids = collection.items.keys();
    collection.patchItems({
        deleted: guids
    });
}

export function deviceToRecord(device: Device): Record<string, SerializedFieldType> {
    return {
        guid: device.guid,
        ip_address: device.ip_address,
        mac_address: device.mac_address,
        info_sets: JSON.stringify(device.info_sets),
        device_class: JSON.stringify(device.device_class),
        device_categories: JSON.stringify(device.device_categories),
        protocol_profile: JSON.stringify(device.protocol_profile),
        timestamp: device.timestamp
    };
}

export function itemToDevice(item: DataItemProxy): Device {
    return new Device(
        item.fields.get('ip_address')?.toString() ?? '',
        item.fields.get('mac_address')?.toString() ?? '',
        item.fields.get('guid')?.toString() ?? '',
        JSON.parse(item.fields.get('info_sets')?.toString() ?? ''),
        JSON.parse(item.fields.get('device_class')?.toString() ?? '') as DeviceClass,
        JSON.parse(item.fields.get('device_categories')?.toString() ?? '') as DeviceCategories,
        JSON.parse(item.fields.get('protocol_profile')?.toString() ?? '') as ProtocolProfile,
        item.fields.get('timestamp')?.toString() ?? ''
    );
}

export function collectionToDevices(collection: CollectionProxy): Device[] {
    const devices: Device[] = [];
    for (const key of collection.items.keys()) {
        devices.push(itemToDevice(collection.items.get(key)));
    }
    return devices;
}

export function createOrRetrievePageMapSource() {
    for (const [, source] of data.dataSources) {
        if (source.getSourceConfig().id === 'PageMap') {
            return source;
        }
    }
    return data.addDataSource('PageMap', { id: 'PageMap' });
}

export function createOrRetrievePageMapCollection() {
    const source = createOrRetrievePageMapSource();
    for (const [, collection] of source.collections) {
        if (collection.getName() === 'page_map') {
            return collection;
        }
    }
    return source.addCollection('page_map', {
        fields: [
            { name: 'page_id', type: ScalarFieldTypeEnum.STRING },
            { name: 'network_guid', type: ScalarFieldTypeEnum.STRING }
            // TODO: either store the guids in a stringified array here or make a separate data collection?
            // { name: 'visible_device_guids', type: ScalarFieldTypeEnum.STRING }
        ],
        primaryKey: ['page_id']
    });
}

// TODO: maybe pass in device guids here too?
export function updatePageMap(pageId: string, networkGuid: string) {
    const collection = createOrRetrievePageMapCollection();

    for (const [key, item] of collection.items) {
        if (item.fields.get('page_id') === pageId) {
            const map = new Map<string, Record<string, SerializedFieldType>>();
            // TODO: will need to include device guids here somehow
            map.set(key, { page_id: pageId, network_guid: networkGuid });
            collection.patchItems({
                changed: map
            });
            return;
        }
    }

    // TODO: will need device guids here too?
    collection.patchItems({
        added: [{ page_id: pageId, network_guid: networkGuid }]
    });
}

export function getNetworkForPage(pageId: string): string {
    const collection = createOrRetrievePageMapCollection();
    for (const [, item] of collection.items) {
        if (item.fields.get('page_id') === pageId) {
            const networkGuid: SerializedFieldType = item.fields.get('network_guid');
            if (typeof networkGuid === 'string') {
                return networkGuid.toString();
            }
        }
    }
    throw new Error('Could not retrieve the network associated with the current page.');
}

// export function getDeviceGuidsForPage(pageId: string): string[] {
//     const collection = createOrRetrievePageMapCollection();
//     for (const [, item] of collection.items) {
//         if (item.fields.get('page_id') === pageId) {
//             const deviceGuids: SerializedFieldType = item.fields.get('visible_device_guids');
//             if (typeof deviceGuids === 'string') {
//                 const deserializedDeviceGuids: unknown = JSON.parse(deviceGuids);
//                 if (
//                     Array.isArray(deserializedDeviceGuids) &&
//                     deserializedDeviceGuids.every((s) => typeof s === 'string')
//                 ) {
//                     return deserializedDeviceGuids as string[];
//                 }
//             }
//         }
//     }
//     throw new Error('Could not retrieve device guids visible on the current page');
// }
