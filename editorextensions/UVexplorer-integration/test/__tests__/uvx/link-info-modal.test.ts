import { LinkInfoModal } from '@uvx/link-info-modal';
import * as lucid from 'lucid-extension-sdk';
import { mockDeviceLinkEdge } from 'mock_data/devices';

jest.mock('lucid-extension-sdk');

describe('Link Info Modal tests', () => {
    const mockEditorClient = new lucid.EditorClient();
    const mockViewport = {
        getCurrentPage: () => {
            return { id: '1' };
        }
    } as lucid.Viewport;
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    describe('Display Line Details tests', () => {
        const modal = new LinkInfoModal(mockEditorClient, mockViewport, mockDeviceLinkEdge);
        const sendMessageMock = jest.spyOn(modal, 'sendMessage');

        it('should send message to child', async () => {
            await modal.displayLineDetails();

            expect(sendMessageMock).toHaveBeenCalledWith({
                action: 'viewLinkDetails',
                linkDetails: JSON.stringify(mockDeviceLinkEdge)
            });
        });
    });
});