import {
    BlockDefinition,
    BlockProxy,
    CustomBlockProxy,
    EditorClient,
    ItemProxy,
    LineProxy,
    LineShape,
    PageProxy,
    Viewport,
    ZOrderOperation
} from 'lucid-extension-sdk';
import { Device, DeviceNode, DeviceLink, DeviceLinkEdge } from 'model/uvx/device';
import { Data, DEVICE_REFERENCE_KEY, LINK_REFERENCE_KEY } from '@data/data';
import { itemToDevice, itemToLinkEdge, removeQuotationMarks } from '@data/data-utils';
import { NetworkDeviceBlock } from './network-device-block';

export class BlockUtils {
    static isNetworkDeviceBlock(item: ItemProxy): item is NetworkDeviceBlock {
        if (item instanceof CustomBlockProxy) {
            if (item.isFromStencil(NetworkDeviceBlock.library, NetworkDeviceBlock.shape)) {
                return true;
            }
        }
        return false;
    }

    static getBlockFromGuid(page: PageProxy, guid: string): BlockProxy | undefined {
        for (const block of page.blocks.values()) {
            if (block.shapeData.get('Guid') === guid) {
                return block;
            }
        }
        return undefined;
    }

    static getGuidFromBlock(block: BlockProxy): string | undefined {
        for (const [key, val] of block.referenceKeys) {
            if (key === DEVICE_REFERENCE_KEY) {
                console.log(`key: ${key}, value: ${val.primaryKey}`);
                return removeQuotationMarks(val.primaryKey!);
            }
        }
        return undefined;
    }

    static getDeviceFromBlock(block: BlockProxy): Device | undefined {
        for (const [key, val] of block.referenceKeys) {
            if (key === DEVICE_REFERENCE_KEY) {
                return itemToDevice(val.getItem());
            }
        }
        return undefined;
    }

    static getLinkInfoFromLine(line: LineProxy): DeviceLinkEdge | undefined {
        for (const [key, val] of line.referenceKeys) {
            if (key === LINK_REFERENCE_KEY) {
                return itemToLinkEdge(val.getItem());
            }
        }
        return undefined;
    }
}

function findCategory(deviceTypes: Set<string>) {
    const orderedPrimaryCategories = [
        'net-device',
        'firewall',
        'router',
        'switch',
        'printer',
        'wireless-controller',
        'wireless-ap',
        'virtual-server',
        'virtual-switch',
        'virtual-port-group',
        'ip-phone',
        'ip-phone-manager',
        'server',
        'workstation',
        'windows',
        'windows-server',
        'ip_camera_cctv',
        'virtual-port-group',
        'wireless-client'
    ];

    for (const category of orderedPrimaryCategories) {
        if (deviceTypes.has(category)) {
            return deviceTypeNameMap.get(category);
        }
    }

    return 'unknown';
}

function getCompany(deviceNode: DeviceNode) {
    let company = '';
    if (deviceNode.vendor !== undefined) {
        company = deviceNode.vendor;
    }

    if (companyNameMap.has(company)) {
        return companyNameMap.get(company);
    } else {
        console.error('Unknown company name: ' + company);
        return 'unknown';
    }
}

function getDeviceType(deviceNode: DeviceNode) {
    const deviceTypes = new Set<string>();
    if (deviceNode.categories.entries !== undefined) {
        deviceNode.categories.entries.forEach((type) => {
            deviceTypes.add(type.categoryName);
        });
    }

    console.log(deviceNode);

    return findCategory(deviceTypes);
}

export async function drawMap(
    client: EditorClient,
    viewport: Viewport,
    page: PageProxy,
    deviceNodes: DeviceNode[],
    deviceLinks: DeviceLink[]
) {
    const customBlockDef = await client.getCustomShapeDefinition(NetworkDeviceBlock.library, NetworkDeviceBlock.shape);
    if (!customBlockDef) {
        return;
    }

    const data = Data.getInstance(client);
    const collectionId = data.getDeviceCollectionForPage(page.id);

    const guidToBlockMap = drawBlocks(viewport, page, deviceNodes, customBlockDef, collectionId);
    drawLinks(deviceLinks, guidToBlockMap);
}

export function drawBlocks(
    viewport: Viewport,
    page: PageProxy,
    deviceNodes: DeviceNode[],
    customBlockDef: BlockDefinition,
    collectionId: string
) {
    const addedBlocks = [];
    const guidToBlockMap = new Map<string, BlockProxy>();

    for (const deviceNode of deviceNodes) {
        const block = createBlock(page, deviceNode, customBlockDef, collectionId);
        addedBlocks.push(block);
        guidToBlockMap.set(deviceNode.deviceGuid, block);
    }

    viewport.focusCameraOnItems(addedBlocks);
    return guidToBlockMap;
}

export function createBlock(
    page: PageProxy,
    deviceNode: DeviceNode,
    customBlockDef: BlockDefinition,
    collectionId: string
): BlockProxy {
    const block = page.addBlock({
        ...customBlockDef,
        boundingBox: { x: deviceNode.x, y: deviceNode.y, w: 50, h: 50 }
    });

    block.shapeData.set('Make', getCompany(deviceNode));
    block.shapeData.set('DeviceType', getDeviceType(deviceNode));
    block.shapeData.set('Guid', deviceNode.deviceGuid);

    block.setReferenceKey(DEVICE_REFERENCE_KEY, {
        collectionId: collectionId,
        primaryKey: `"${deviceNode.deviceGuid}"`,
        readonly: true
    });

    return block;
}

export function drawLinks(deviceLinks: DeviceLink[], guidToBlockMap: Map<string, BlockProxy>) {
    for (const link of deviceLinks) {
        for (const linkMembers of link.linkMembers) {
            const deviceBlock = guidToBlockMap.get(linkMembers.deviceGuid);
            const connectedDeviceBlock = guidToBlockMap.get(linkMembers.connectedDeviceGuid);

            if (deviceBlock && connectedDeviceBlock) {
                if (deviceBlock.getBoundingBox().y > connectedDeviceBlock.getBoundingBox().y) {
                    connectBlocks(connectedDeviceBlock, deviceBlock);
                } else {
                    connectBlocks(deviceBlock, connectedDeviceBlock);
                }
            }
        }
    }
}

function connectBlocks(block1: BlockProxy, block2: BlockProxy) {
    const line = block1.getPage().addLine({
        endpoint1: {
            connection: block1,
            linkX: 0.5,
            linkY: 0.5,
            style: 'none'
        },
        endpoint2: {
            connection: block2,
            linkX: 0.5,
            linkY: 0.5,
            style: 'none'
        }
    });
    line.setShape(LineShape.Diagonal);
    line.changeZOrder(ZOrderOperation.BOTTOM);
}

const deviceTypeNameMap: Map<string, string> = new Map<string, string>([
    ['router', 'router'],
    ['switch', 'switch'],
    ['server', 'server'],
    ['firewall', 'firewall'],
    ['ip-phone', 'phone'],
    ['ip-phone-manager', 'phoneManager'],
    ['ip_camera_cctv', 'ipCameraCctv'],
    ['windows', 'workstation'],
    ['windows-server', 'server'],
    ['printer', 'printer'],
    ['hub', 'hub'],
    ['wireless-ap', 'wirelessAP'],
    ['wireless-controller', 'wirelessController'],
    ['workstation', 'workstation'],
    ['net-device', 'networkDevice'],
    ['wireless-client', 'wirelessClient'],
    ['virtual-server', 'server'],
    ['virtual-switch', 'switch'],
    ['virtual-port-group', 'virtualPortGroup'],
    ['', 'unknown']
]);

const companyNameMap: Map<string, string> = new Map<string, string>([
    ['Arista Networks', 'arista'],
    ['Cisco', 'cisco'],
    ['Meraki', 'meraki'],
    ['Microsoft', 'microsoft'],
    ['Dell', 'dell'],
    ['Hewlett Packard', 'hewlettPackard'],
    ['HPN Supply Chain', 'hewlettPackard'],
    ['Hirschmann Automation', 'hirschmann'],
    ['Hirschmann Automation and Control GmbH', 'hirschmann'],
    ['Huawei', 'huawei'],
    ['Juniper', 'juniper'],
    ['VMware', 'vmware'],
    ['VMware, Inc', 'vmware'],
    ['VMware, Inc.', 'vmware'],
    ['Aruba', 'aruba'],
    ['Motorola', 'motorola'],
    ['Apple', 'apple'],
    ['Avaya', 'avaya'],
    ['Brocade Communications Systems LLC', 'brocade'],
    ['Extreme', 'extreme'],
    ['Enterasys', 'enterasys'],
    ['Westermo', 'westermo'],
    ['NETGEAR', 'netgear'],
    ['Ruckus Wireless', 'ruckus'],
    ['Rockwell Automation', 'rockwella'],
    ['Checkpoint Systems, Inc.', 'checkpoint'],
    ['Check Point Software Technologies', 'checkpoint'],
    ['D-Link', 'dlink'],
    ['Ubiquiti Networks Inc.', 'ubiquiti'],
    ['Ubiquiti', 'ubiquiti'],
    ['Mellanox Technologies, Inc.', 'mellanox'],
    ['Fortinet, Inc.', 'fortinet'],
    ['Foundry', 'brocade'],
    ['TP-LINK TECHNOLOGIES CO.,LTD.', 'tpLink'],
    ['', 'unknown']
]);
