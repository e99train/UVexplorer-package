import { BlockDefinition, BlockProxy, MapProxy, PageProxy, Viewport } from 'lucid-extension-sdk';
import { DeviceNode } from 'model/uvx/device';
import { DEVICE_REFERENCE_KEY } from '@data/data-client';
import { getVendor } from 'model/uvx/vendor';
import { DEVICE_TYPE_NAME_MAP, getDeviceType } from 'model/uvx/device-type';
import { BlockUtils } from '@blocks/block-utils';
import { HubNode, HubNodeUtil } from 'model/uvx/hub-node';

export class DrawBlocks {
    static drawBlocks(
        viewport: Viewport,
        page: PageProxy,
        deviceNodes: DeviceNode[],
        hubNodes: HubNode[],
        customBlockDef: BlockDefinition,
        collectionId: string
    ) {
        const addedBlocks = [];
        const nodeIdToBlockMap = new Map<number, BlockProxy>();

        for (const deviceNode of deviceNodes) {
            const block = this.drawDeviceNode(page, deviceNode, customBlockDef, collectionId);
            addedBlocks.push(block);
            nodeIdToBlockMap.set(deviceNode.nodeId, block);
        }

        for (const hubNode of hubNodes) {
            const block = this.drawHubNode(page, hubNode, customBlockDef);
            addedBlocks.push(block);
            nodeIdToBlockMap.set(hubNode.nodeId, block);
        }

        viewport.focusCameraOnItems(addedBlocks);
        return nodeIdToBlockMap;
    }

    static drawDeviceNode(
        page: PageProxy,
        deviceNode: DeviceNode,
        customBlockDef: BlockDefinition,
        collectionId: string
    ): BlockProxy {
        const block = page.addBlock({
            ...customBlockDef,
            boundingBox: { x: deviceNode.x, y: deviceNode.y, w: 50, h: 50 }
        });

        this.setShapeData(block, deviceNode);
        this.setReferenceKey(block, deviceNode, collectionId);

        return block;
    }

    static updateBlocks(deviceNodes: DeviceNode[], collectionId: string, items: MapProxy<string, BlockProxy>) {
        console.log('Updating blocks data');
        for (const [, item] of items) {
            const guid = item.shapeData.get('Guid');
            if (!guid) continue;
            const deviceNode = deviceNodes.find((node) => node.deviceGuid === guid);
            if (!deviceNode) continue;
            this.updateBlock(item, deviceNode, collectionId);
        }
    }

    static updateBlock(item: BlockProxy, deviceNode: DeviceNode, collectionId: string) {
        this.setShapeData(item, deviceNode);
        this.setReferenceKey(item, deviceNode, collectionId);
    }

    static drawHubNode(page: PageProxy, hubNode: HubNode, customBlockDef: BlockDefinition): BlockProxy {
        const block = page.addBlock({
            ...customBlockDef,
            boundingBox: { x: hubNode.x, y: hubNode.y, w: 50, h: 50 }
        });

        const deviceType = DEVICE_TYPE_NAME_MAP.get(HubNodeUtil.getCategoryImageKey(hubNode));
        block.shapeData.set('Make', 'Hub Node');
        block.shapeData.set('DeviceType', deviceType);
        return block;
    }

    static setShapeData(block: BlockProxy, deviceNode: DeviceNode) {
        block.shapeData.set('Make', getVendor(deviceNode));
        block.shapeData.set('DeviceType', getDeviceType(deviceNode));
        block.shapeData.set('Guid', deviceNode.deviceGuid);
    }

    static setReferenceKey(block: BlockProxy, deviceNode: DeviceNode, collectionId: string) {
        block.setReferenceKey(DEVICE_REFERENCE_KEY, {
            collectionId: collectionId,
            primaryKey: `"${deviceNode.deviceGuid}"`,
            readonly: true
        });
    }

    // Takes in a list of deviceGuids that should be removed from the map
    // Removes all device blocks from the map
    // Returns the list of deviceGuids that should be redrawn
    static clearBlocks(page: PageProxy, removeDevices?: string[]) {
        const pageItems = page.allBlocks;
        const remainDevices = [];

        if (pageItems) {
            for (const [, item] of pageItems) {
                if (BlockUtils.isNetworkDeviceBlock(item)) {
                    const guid = BlockUtils.getGuidFromBlock(item);
                    if (!guid) continue;
                    item.delete();
                    if (!(removeDevices && removeDevices.includes(guid))) {
                        // Device should remain
                        remainDevices.push(guid);
                    }
                }
            }
        }

        return remainDevices;
    }
}