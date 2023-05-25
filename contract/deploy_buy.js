/* global harden */
import { E } from '@endo/eventual-send';
import fs from 'fs';

let deployState;
try {
  deployState = JSON.parse(fs.readFileSync('./deploy_state.json'));
} catch {
  console.error('Deploy error, please run `deploy_sell.js` first');
}
const deployContract = async (homeP) => {
  const { board, wallet, zoe } = E.get(homeP);
  const walletBridge = E(wallet).getBridge();

  const instance = await E(board).getValue(deployState.instanceId);
  const nftToBuy = harden([
    {
      id: 1n,
      name: 'NFT 1',
      description: 'This is the first NFT',
    },
    {
      id: 2n,
      name: 'NFT 2',
      description: 'This is the second NFT',
    },
    {
      id: 3n,
      name: 'NFT 3',
      description: 'This is the third NFT',
    },
  ]);
  const proposal = {
    give: {
      Money: {
        pursePetname: 'Agoric stable local currency',
        value: 3000000n,
      },
    },
    want: {
      // AmountMath.make(nftBrand, nftToBuy)
      Items: {
        pursePetname: 'board042116',
        value: nftToBuy,
      },
    },
  };
  const publicFacet = await E(zoe).getPublicFacet(instance);
  const offerConfig = {
    id: `${Date.now()}`,
    invitation: await E(publicFacet).createBuyerInvitation(),
    proposalTemplate: proposal,
  };
  // fails with error: `A Zoe invitation is required, not (an object)`
  await E(walletBridge).addOffer(offerConfig);
};

export default deployContract;
