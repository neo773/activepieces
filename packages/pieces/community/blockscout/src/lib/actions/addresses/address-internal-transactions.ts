import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';

export const getAddressInternalTransactions = createAction({
  name: 'get_address_internal_transactions',
  displayName: 'Get Address Internal Transactions',
  description: 'Get list of internal transactions for an address',
  // category: 'Addresses',
  props: {
    addressHash: Property.ShortText({
      displayName: 'Address Hash',
      description: 'Hash of the address to fetch internal transactions for',
      required: true,
    }),
  },
  async run(context) {
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://eth.blockscout.com/api/v2/addresses/${context.propsValue.addressHash}/internal-transactions`,
    });
    if (response.status !== 200) {
      throw new Error(`Blockscout API request failed with status ${response.status}`);
    }
    return response.body;
  },
});
