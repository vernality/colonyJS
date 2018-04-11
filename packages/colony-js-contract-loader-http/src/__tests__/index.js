/* eslint-env jest */
/* eslint no-underscore-dangle: 0 */

import createSandbox from 'jest-sandbox';
import ContractHttpLoader from '../index';
import MetaCoin from '../__mocks__/MetaCoin.json';

describe('ContractHttpLoader', () => {
  const sandbox = createSandbox();
  const metaCoinJson = JSON.stringify(MetaCoin);
  const setupLoader = ({
    // eslint-disable-next-line max-len
    endpoint = '//endpoint?name=%%NAME%%&version=%%VERSION%%&address=%%ADDRESS%%',
    parser = 'truffle',
  } = {}) => new ContractHttpLoader({ endpoint, parser });

  beforeEach(() => {
    fetch.resetMocks();
    sandbox.clear();
  });

  test('Custom parsers', async () => {
    const parser = sandbox.fn(jsonObj => ({
      address: jsonObj.address,
      abi: jsonObj.abi,
      bytecode: jsonObj.bytecode,
      contractName: jsonObj.contractName,
    }));
    const loader = setupLoader({ parser });
    expect(loader._parser).toEqual(parser);

    const contractResponse = {
      contractName: 'MyContract',
      address: '0x123',
      bytecode: '0x1234567890',
      abi: [{ myData: 123 }],
    };
    fetch.mockResponse(JSON.stringify(contractResponse));

    const contract = await loader.load('MyContract');
    expect(contract).toEqual(contractResponse);

    expect(() => setupLoader({ parser: 'does not exist' })).toThrowError(
      /was not found/,
    );
    expect(() => setupLoader({ parser: 123 })).toThrowError(/Invalid parser/);
  });

  test('Truffle parser', async () => {
    const loader = setupLoader();
    fetch.mockResponse(metaCoinJson);
    const contract = await loader.load('MetaCoin', { version: 1 });

    const {
      abi,
      bytecode,
      networks: {
        '1492719647054': { address },
      },
    } = MetaCoin;
    expect(contract).toEqual({ address, abi, bytecode });
  });

  test('Making requests', async () => {
    const loader = setupLoader({ parser: 'truffle' });
    fetch.mockResponse(metaCoinJson);
    sandbox.spyOn(loader, '_load');
    sandbox.spyOn(loader, 'resolveEndpointResource');

    await loader.load('MetaCoin', { version: 1 });

    expect(loader._load).toHaveBeenCalledTimes(1);
    expect(loader.resolveEndpointResource).toHaveBeenCalledTimes(1);
    expect(loader.resolveEndpointResource).toHaveBeenCalledWith('MetaCoin', {
      version: 1,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `//endpoint?name=MetaCoin&version=1&address=`,
    );
  });

  test('Resolving the endpoint resource', () => {
    const contractName = 'MetaCoin';
    const address = '0x123';
    const version = 1;
    const loader = setupLoader({ parser: 'truffle' });
    const resource = loader.resolveEndpointResource(contractName, {
      address,
      version,
    });
    expect(resource).toBe(
      `//endpoint?name=${contractName}&version=${version}&address=${address}`,
    );
  });

  test('Error handling for `load`', async () => {
    const loader = setupLoader({ parser: 'truffle' });

    fetch.mockRejectOnce('some fetch error');
    try {
      await loader.load('MetaCoin', { version: 1 });
    } catch (error) {
      expect(error.toString()).toContain(
        'Unable to fetch resource for contract MetaCoin: some fetch error',
      );
    }

    fetch.mockResponseOnce('not a json response');
    try {
      await loader.load('MetaCoin', { version: 1 });
    } catch (error) {
      expect(error.toString()).toContain(
        'Unable to get JSON for contract MetaCoin',
      );
    }

    // Missing `bytecode`
    fetch.mockResponseOnce(JSON.stringify({ address: '0x123', abi: [{}] }));
    try {
      await loader.load('MetaCoin', { version: 1 });
    } catch (error) {
      expect(error.toString()).toContain(
        // eslint-disable-next-line max-len
        'Unable to parse contract definition for contract MetaCoin: Invalid contract definition: bytecode is missing or invalid',
      );
    }
  });
});
