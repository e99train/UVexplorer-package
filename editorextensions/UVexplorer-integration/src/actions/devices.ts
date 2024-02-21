import { ConnectedDevicesModal } from '@uvx/connected-devices-modal';
import { EditorClient, Viewport } from 'lucid-extension-sdk';
import { isNetworkDeviceBlock } from '@blocks/block-utils';

export function uvDeviceSelected(viewport: Viewport): boolean {
    const selection = viewport.getSelectedItems();
    const isCorrectSelection = selection.length > 0 && selection.every((item) => isNetworkDeviceBlock(item));
    return isCorrectSelection;
}

export async function showConnectedDevices(viewport: Viewport, client: EditorClient): Promise<void> {
    const selection = viewport.getSelectedItems();
    console.log('Selection:', selection);
    const deviceGuids = selection
        .map((item) => {
            const itemData = item.shapeData.get('Guid');
            if (itemData && typeof itemData === 'string') return itemData;
            else return '';
        })
        .filter((item) => item !== '');

    const modal = new ConnectedDevicesModal(client, viewport, deviceGuids);

    const additionalSettings: Map<string, string> = new Map<string, string>();
    additionalSettings.set('apiKey', process.env.UVX_API_KEY!);
    additionalSettings.set('serverUrl', process.env.UVX_BASE_URL!);
    await client.setPackageSettings(additionalSettings);

    await modal.loadSettings();
    await modal.openSession();
    await modal.show();
    await modal.loadConnectedDevices();
}
