import { UVExplorerClient } from '@uvx/uvx-client';
import * as lucid from 'lucid-extension-sdk';
import * as model from 'model/uvx/network';
import * as devicesModel from 'model/uvx/device';
import * as topoMapModel from 'model/uvx/topo-map';
import * as helpers from '../helpers';
import { TextXHRResponse } from 'lucid-extension-sdk';
jest.mock('lucid-extension-sdk');

beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
});

describe('UVexplorer client tests', () => {
    const isTextXHRResponseSpy = jest.spyOn(lucid, 'isTextXHRResponse').mockReturnValue(true);
    let mockClient: lucid.EditorClient;
    let client: UVExplorerClient;
    let settingsSpy: jest.SpyInstance<Promise<Map<string, lucid.JsonSerializable>>, []>;

    const createXHRResponse = (status: number, responseText = ''): TextXHRResponse => ({
        url: 'https://my-uvexplorer-server.com/test',
        status,
        headers: {},
        responseFormat: 'utf8',
        responseText: responseText
    });

    const url = 'testUrl';
    const sessionGuid = 'testSessionGuid';

    const openSessionRequest = {
        url: url + '/public/api/v1/session',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer testKey'
        },
        data: undefined
    };

    beforeEach(() => {
        mockClient = new lucid.EditorClient();
        settingsSpy = jest.spyOn(mockClient, 'getPackageSettings').mockResolvedValue(
            new Map([
                ['apiKey', 'testKey'],
                ['serverUrl', 'testUrl']
            ])
        );
        client = new UVExplorerClient(mockClient);
    });

    describe('closeSession tests', () => {
        it('should set up client session when making first call to it then close session with void response', async () => {
            const mockResponse = helpers.mockNetworkSummariesXHRResponse;
            const xhrSpy = createXHRSpy(mockResponse);
            const isNetworkSummariesResponseSpy = jest.spyOn(model, 'isNetworkSummariesResponse').mockReturnValue(true);

            await expect(client.listNetworks()).resolves.toStrictEqual(
                helpers.mockNetworkSummariesResponse.network_summaries
            );

            expect(settingsSpy).toHaveBeenCalled();
            expect(xhrSpy).toHaveBeenNthCalledWith(1, openSessionRequest);
            expect(xhrSpy).toHaveBeenNthCalledWith(2, {
                url: url + '/public/api/v1/network/list',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionGuid}`
                },
                data: undefined
            });
            expect(isNetworkSummariesResponseSpy).toHaveBeenCalledWith(JSON.parse(mockResponse.responseText));

            const mockResponse2 = createXHRResponse(200, '');
            const xhrSpy2 = createXHRSpy(mockResponse2);
            await expect(client.closeSession()).resolves.toBeUndefined();
            expect(xhrSpy2).toHaveBeenCalledWith({
                url: url + '/public/api/v1/session',
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionGuid}`
                },
                data: undefined
            });
        });
    });

    describe('listNetworks tests', () => {
        it('should successfully send ListNetworks request and return NetworkSummary[]', async () => {
            const mockResponse = helpers.mockNetworkSummariesXHRResponse;
            const xhrSpy = createXHRSpy(mockResponse);
            const isNetworkSummariesResponseSpy = jest.spyOn(model, 'isNetworkSummariesResponse').mockReturnValue(true);

            await expect(client.listNetworks()).resolves.toStrictEqual(
                helpers.mockNetworkSummariesResponse.network_summaries
            );
            expect(xhrSpy).toHaveBeenLastCalledWith({
                url: url + '/public/api/v1/network/list',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionGuid}`
                },
                data: undefined
            });
            expect(isNetworkSummariesResponseSpy).toHaveBeenCalledWith(JSON.parse(mockResponse.responseText));
        });

        it('should error when list networks call does not return network summaries', async () => {
            const mockResponse = createXHRResponse(200, '{"test":"test"}');

            jest.spyOn(mockClient, 'xhr').mockResolvedValue(mockResponse);
            jest.spyOn(model, 'isNetworkSummariesResponse').mockReturnValue(false);

            await expect(client.listNetworks()).rejects.toThrow('Response was not a NetworkSummariesResponse.');
        });
    });

    describe('loadNetwork tests', () => {
        it('should successfully send NetworkRequest', async () => {
            const networkRequest = {
                network_guid: 'test'
            };
            const mockResponse = createXHRResponse(200, '');
            const xhrSpy = createXHRSpy(mockResponse);

            await expect(client.loadNetwork(networkRequest)).resolves.toBeUndefined();
            expect(xhrSpy).toHaveBeenLastCalledWith({
                url: url + '/public/api/v1/network/load',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionGuid}`
                },
                data: JSON.stringify(networkRequest)
            });
        });
    });

    describe('unloadNetwork tests', () => {
        it('should successfully send unload network request', async () => {
            const mockResponse = createXHRResponse(200, '');
            const xhrSpy = createXHRSpy(mockResponse);

            await expect(client.unloadNetwork()).resolves.toBeUndefined();
            expect(xhrSpy).toHaveBeenLastCalledWith({
                url: url + '/public/api/v1/network/unload',
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionGuid}`
                },
                data: undefined
            });
        });
    });

    describe('listDevices tests', () => {
        it('should successfully send DeviceListRequest', async () => {
            const mockResponse = helpers.mockDeviceListXHRResponse;
            const xhrSpy = createXHRSpy(mockResponse);
            const isDeviceListResponseSpy = jest.spyOn(devicesModel, 'isDeviceListResponse').mockReturnValue(true);

            await expect(client.listDevices({})).resolves.toStrictEqual(helpers.mockDeviceListResponse.devices);

            expect(xhrSpy).toHaveBeenLastCalledWith({
                url: url + '/public/api/v1/device/list',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionGuid}`
                },
                data: JSON.stringify({})
            });
            expect(isDeviceListResponseSpy).toHaveBeenCalledWith(JSON.parse(mockResponse.responseText));
        });

        it('should error when list devices call does not return devices', async () => {
            const mockResponse = createXHRResponse(200, '{"test":"test"}');

            jest.spyOn(mockClient, 'xhr').mockResolvedValue(mockResponse);
            jest.spyOn(devicesModel, 'isDeviceListResponse').mockReturnValue(false);

            await expect(client.listDevices({})).rejects.toThrow('Response was not a DeviceListResponse.');
        });
    });

    describe('listConnectedDevices tests', () => {
        it('should successfully send ConnectedDevicesRequest', async () => {
            const mockRequest = { device_guids: [] };
            const mockResponse = helpers.mockDeviceListXHRResponse;
            const xhrSpy = createXHRSpy(mockResponse);
            const isDeviceListResponseSpy = jest.spyOn(devicesModel, 'isDeviceListResponse').mockReturnValue(true);

            await expect(client.listConnectedDevices(mockRequest)).resolves.toStrictEqual(
                helpers.mockDeviceListResponse.devices
            );

            expect(xhrSpy).toHaveBeenLastCalledWith({
                url: url + '/public/api/v1/device/connected',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionGuid}`
                },
                data: JSON.stringify(mockRequest)
            });
            expect(isDeviceListResponseSpy).toHaveBeenCalledWith(JSON.parse(mockResponse.responseText));
        });

        it('should error when list connected devices call does not return devices', async () => {
            const mockRequest = { device_guids: [] };
            const mockResponse = createXHRResponse(200, '{"test":"test"}');

            jest.spyOn(mockClient, 'xhr').mockResolvedValue(mockResponse);
            jest.spyOn(devicesModel, 'isDeviceListResponse').mockReturnValue(false);

            await expect(client.listConnectedDevices(mockRequest)).rejects.toThrow(
                'Response was not a DeviceListResponse.'
            );
        });
    });

    describe('getTopoMap tests', () => {
        it('should successfully send TopoMapRequest', async () => {
            const url = 'testUrl';
            const sessionGuid = 'testSessionGuid';
            const mockRequest = topoMapModel.createTopoMapRequest(
                [],
                topoMapModel.defaultLayoutSettings,
                topoMapModel.defaultDrawSettings
            );
            const mockResponse = helpers.mockTopoMapXHRResponse;
            const xhrSpy = createXHRSpy(mockResponse);
            const isTopoMapSpy = jest.spyOn(topoMapModel, 'isTopoMap').mockReturnValue(true);

            await expect(client.getTopoMap(mockRequest)).resolves.toStrictEqual(helpers.mockTopoMap);

            expect(xhrSpy).toHaveBeenLastCalledWith({
                url: url + '/public/api/v1/device/topomap',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionGuid}`
                },
                data: JSON.stringify(mockRequest)
            });
            expect(isTopoMapSpy).toHaveBeenCalledWith(JSON.parse(mockResponse.responseText));
        });

        it('should error when topo map call does not return a TopoMap', async () => {
            const mockRequest = topoMapModel.createTopoMapRequest(
                [],
                topoMapModel.defaultLayoutSettings,
                topoMapModel.defaultDrawSettings
            );
            const mockResponse = createXHRResponse(200, '{"test":"test"}');

            jest.spyOn(mockClient, 'xhr').mockResolvedValue(mockResponse);
            jest.spyOn(topoMapModel, 'isTopoMap').mockReturnValue(false);

            await expect(client.getTopoMap(mockRequest)).rejects.toThrow('Response was not a TopoMap.');
        });
    });

    describe('sendXHRRequest tests', () => {
        it('should send a request and return a TextXHRResponse', async () => {
            const mockResponse = createXHRResponse(200, '{"test":"test"}');
            jest.spyOn(mockClient, 'xhr').mockResolvedValue(mockResponse);
            const checkStatusCodeSpy = jest.spyOn(client, 'checkStatusCode');
            await expect(client.sendXHRRequest('url', 'token', 'GET', 'data')).resolves.toBe(mockResponse);
            expect(checkStatusCodeSpy).toHaveBeenCalledWith(mockResponse);
        });

        it('should error when the response is not a TextXHRResponse', async () => {
            jest.spyOn(client, 'checkStatusCode').mockImplementation();
            isTextXHRResponseSpy.mockReturnValue(false);
            await expect(client.sendXHRRequest('url', 'token', 'GET', 'data')).rejects.toThrow(
                'Response was not a TextXHRResponse.'
            );
        });
    });

    describe('parseResponseJSON tests', () => {
        it('should parse valid JSON without errors', () => {
            const responseText = '{"key": "value"}';
            const result = client.parseResponseJSON(responseText);
            expect(result).toStrictEqual({ key: 'value' });
        });

        it('should throw a custom error for invalid JSON', () => {
            const responseText = 'invalidJSON';
            expect(() => client.parseResponseJSON(responseText)).toThrow('Error parsing response JSON:');
        });
    });

    describe('checkStatusCode tests', () => {
        it('handles status code 200', () => {
            const response = createXHRResponse(200);
            expect(() => response).not.toThrow();
        });

        it.each([
            [400, 'Bad Request.'],
            [401, 'Unauthorized.'],
            [404, 'Not Found.'],
            [409, 'Conflict.'],
            [422, 'Unprocessable Entity (a network has not been loaded).']
        ])('throws error for status code %i', (statusCode, errorMessage) => {
            const response = createXHRResponse(statusCode);
            expect(() => client.checkStatusCode(response)).toThrow(errorMessage);
        });
    });

    function createXHRSpy(mockResponse: lucid.XHRResponse) {
        return jest
            .spyOn(mockClient, 'xhr')
            .mockImplementation(async (req: lucid.XHRRequest): Promise<lucid.XHRResponse> => {
                if (req.url.match('.*(session)') && req.method === 'POST') {
                    return new Promise<lucid.TextXHRResponse>((resolve) =>
                        resolve({ responseText: 'testSessionGuid' } as lucid.TextXHRResponse)
                    );
                } else {
                    return new Promise<lucid.XHRResponse>((resolve) => resolve(mockResponse));
                }
            });
    }
});
