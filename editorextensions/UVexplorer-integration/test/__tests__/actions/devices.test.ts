import { uvDeviceSelected, showConnectedDevices } from '@actions/devices';
import * as lucid from 'lucid-extension-sdk';
import { BlockUtils } from '@blocks/block-utils';
import { mockSelectedNetworkDevices } from 'mock_data/devices';
import { UVExplorerClient } from '@uvx/uvx-client';

jest.mock('lucid-extension-sdk');
jest.mock('@draw/draw-topo-map');
jest.mock('@uvx/connected-devices-modal');

beforeEach(() => {
    jest.resetModules();
});

describe('Device actions success tests', () => {
    const mockClient = new lucid.EditorClient();
    const mockSelection = mockSelectedNetworkDevices as lucid.ItemProxy[];
    const mockViewport = {
        getSelectedItems: (_deep?: boolean | undefined) => mockSelection
    } as lucid.Viewport;
    const mockUvxClient = new UVExplorerClient(mockClient);

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('uvDeviceSelected tests', () => {
        it('should be true when multiple uvDevices are selected', () => {
            jest.spyOn(BlockUtils, 'isNetworkDeviceBlock').mockReturnValue(true);
            expect(uvDeviceSelected(mockViewport)).toBeTruthy();
        });
    });

    describe('showConnectedDevices tests', () => {
        it('should call console.log with selected items', async () => {
            const isNetworkDeviceBlockSpy = jest.spyOn(BlockUtils, 'isNetworkDeviceBlock').mockReturnValue(true);
            await showConnectedDevices(mockViewport, mockClient, mockUvxClient);
            expect(isNetworkDeviceBlockSpy).toHaveBeenCalledWith(mockSelectedNetworkDevices[0]);
        });
    });
});
