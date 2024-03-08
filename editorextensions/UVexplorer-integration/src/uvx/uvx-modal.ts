import { EditorClient, Modal, PageProxy, Viewport } from 'lucid-extension-sdk';
import { UVExplorerClient } from './uvx-client';
import { NetworkRequest } from 'model/uvx/network';
import { createTopoMapRequest, TopoMap } from 'model/uvx/topo-map';
import { Data } from '@data/data';
import { BlockUtils } from '@blocks/block-utils';
import { DrawTopoMap } from '@draw/draw-topo-map';

export abstract class UVXModal extends Modal {
    protected viewport: Viewport;
    protected uvexplorerClient: UVExplorerClient;
    protected data: Data;
    protected serverUrl = '';
    protected apiKey = '';
    protected sessionGuid = '';

    constructor(client: EditorClient, viewport: Viewport, uvxClient: UVExplorerClient, path: string) {
        super(client, {
            title: 'UVexplorer',
            width: 800,
            height: 600,
            url: `http://localhost:4200/${path}`
        });

        this.viewport = viewport;
        this.uvexplorerClient = uvxClient;
        this.data = Data.getInstance(client);
    }

    public async configureSetting(setting: string) {
        let settings = await this.client.getPackageSettings();
        if (!settings.get(setting)) {
            if (await this.client.canEditPackageSettings()) {
                await this.client.alert(
                    `You have not configured the ${setting}. You will now be prompted to complete that configuration.`
                );
                await this.client.showPackageSettingsModal();
                settings = await this.client.getPackageSettings();
                if (!settings.get(setting)) {
                    return;
                }
            } else {
                await this.client.alert(
                    `Your account has not configured the ${setting}. Talk with your Lucid account administrator to complete configuration.`
                );
            }
        }
    }

    public async loadSettings() {
        const settings = await this.client.getPackageSettings();
        const apiKey = settings.get('apiKey');
        const serverUrl = settings.get('serverUrl');

        if (typeof apiKey == 'string' && typeof serverUrl == 'string') {
            this.apiKey = apiKey;
            this.serverUrl = serverUrl;
        }
    }

    async openSession() {
        try {
            this.sessionGuid = await this.uvexplorerClient.openSession(this.serverUrl, this.apiKey);
            console.log(`Successfully opened a session: ${this.sessionGuid}`);
        } catch (e) {
            console.error(e);
        }
    }

    async closeSession() {
        try {
            await this.uvexplorerClient.closeSession(this.serverUrl, this.sessionGuid);
            console.log(`Successfully closed the session.`);
        } catch (e) {
            console.error(e);
        }
    }

    async loadPageNetwork() {
        const pageId = this.viewport.getCurrentPage()?.id;
        if (!pageId) throw Error('No page id found');
        const data = Data.getInstance(this.client);
        const networkGuid = data.getNetworkForPage(pageId);
        const networkRequest = new NetworkRequest(networkGuid);
        await this.uvexplorerClient.loadNetwork(this.serverUrl, this.sessionGuid, networkRequest);
    }

    async loadTopoMap(deviceGuids: string[]): Promise<TopoMap | undefined> {
        try {
            const topoMapRequest = createTopoMapRequest(deviceGuids);
            return await this.uvexplorerClient.getTopoMap(this.serverUrl, this.sessionGuid, topoMapRequest);
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    /**
     * TopoMap TopoMap
     * @param devices New device guids to be drawn on the map.
     * @param removeDevices Device guids to be removed from the map.
     */
    async drawMap(devices: string[], removeDevices?: string[]): Promise<void> {
        const page = this.viewport.getCurrentPage();
        if (!page) {
            return;
        }

        const deviceGuids = this.clearMap(page, devices, removeDevices);

        const topoMap = await this.loadTopoMap(deviceGuids);
        if (topoMap) {
            this.data.saveLinks(this.data.getNetworkForPage(page.id), topoMap.deviceLinks);
            await DrawTopoMap.drawTopoMap(this.client, this.viewport, page, topoMap.deviceNodes, topoMap.deviceLinks);
        } else {
            console.error('Could not load topo map data.');
        }
    }

    clearMap(page: PageProxy, devices: string[], removeDevices?: string[]): string[] {
        this.clearLines(page);
        return this.clearBlocks(page, devices, removeDevices);
    }

    clearLines(page: PageProxy) {
        // TODO: only delete device connection lines not all lines
        const lines = page.allLines;
        if (lines) {
            for (const [, line] of lines) {
                line.delete();
            }
        }
    }

    /**
     * Clear Blocks
     * @param page The page to clear
     * @param devices New device guids to be drawn on the map.
     * @param removeDevices Device guids to be removed from the map.
     * @return List of device guids that already exist on the map and should not be removed
     *         in addition to new device guids to be drawn.
     */
    clearBlocks(page: PageProxy, devices: string[], removeDevices?: string[]) {
        console.log('add devices: ' + devices.toString());
        console.log('remove devices ' + removeDevices?.toString());
        const pageItems = page.allBlocks;

        if (pageItems) {
            for (const [, item] of pageItems) {
                if (BlockUtils.isNetworkDeviceBlock(item)) {
                    const guid = BlockUtils.getGuidFromBlock(item);
                    if (!guid) continue;
                    item.delete();
                    if (!devices.includes(guid) && !(removeDevices && removeDevices.includes(guid))) {
                        // Device should remain
                        devices.push(guid);
                    }
                }
            }
        }

        return devices;
    }
}
