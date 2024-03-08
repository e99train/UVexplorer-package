import { DataSourceProxy, EditorClient, JsonSerializable, Viewport } from 'lucid-extension-sdk';
import { isLoadNetworkMessage, isSelectedDevicesMessage } from 'model/message';
import { NetworkRequest } from 'model/uvx/network';
import { DeviceListRequest } from 'model/uvx/device';
import { UVXModal } from './uvx-modal';
import { UVExplorerClient } from '@uvx/uvx-client';

export class DevicesModal extends UVXModal {
    constructor(client: EditorClient, viewport: Viewport, uvxClient: UVExplorerClient) {
        super(client, viewport, uvxClient, 'networks');

        this.viewport = viewport;
    }

    async listNetworks() {
        try {
            const networks = await this.uvexplorerClient.listNetworks(this.serverUrl, this.sessionGuid);
            const filteredNetworks = networks.filter((n) => n.name !== '');
            console.log(`Successfully retrieved network list.`);
            await this.sendMessage({
                action: 'listNetworks',
                network_summaries: JSON.stringify(filteredNetworks)
            });
        } catch (e) {
            console.error(e);
        }
    }

    async loadNetwork(name: string, guid: string): Promise<DataSourceProxy | undefined> {
        try {
            const networkRequest = new NetworkRequest(guid);
            await this.uvexplorerClient.loadNetwork(this.serverUrl, this.sessionGuid, networkRequest);
            const source = this.data.createOrRetrieveNetworkSource(name, guid);
            const page = this.viewport.getCurrentPage();
            if (page !== undefined) {
                this.data.updatePageMap(page.id, guid);
            }
            console.log(`Successfully loaded network: ${name}`);
            return source;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    async loadDevices(source: DataSourceProxy) {
        try {
            const deviceListRequest = new DeviceListRequest();
            const devices = await this.uvexplorerClient.listDevices(
                this.serverUrl,
                this.sessionGuid,
                deviceListRequest
            );

            this.data.saveDevices(source, devices);

            await this.sendMessage({
                action: 'listDevices',
                devices: JSON.stringify(devices)
            });
            console.log(`Successfully loaded devices: ${source.getName()}`);
        } catch (e) {
            console.error(e);
        }
    }



    protected async messageFromFrame(message: JsonSerializable) {
        console.log('Received a message from the child.');
        console.log(message);
        if (isLoadNetworkMessage(message)) {
            const source = await this.loadNetwork(message.name, message.network_guid);
            if (source !== undefined) {
                await this.loadDevices(source);
            } else {
                console.error(`Could not load network: ${message.name}`);
            }
        } else if (isSelectedDevicesMessage(message)) {
            const devices = message.devices.map((d) => d.guid);
            await this.drawMap(devices);
            await this.closeSession();
            this.hide();
        }
    }
}
