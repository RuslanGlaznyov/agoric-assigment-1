/* global harden */
import { E } from '@endo/eventual-send';
// import { makeHelpers } from '@agoric/deploy-script-support';
// import { AmountMath } from '@agoric/ertp';

const deployContract = async (homeP) => {
  const { board, wallet } = E.get(homeP);
  const walletBridge = E(wallet).getBridge();

  const instance = await E(board).getValue('board016105');
  console.log(instance);
  // const nftBrand = await E(nftIssuer).getBrand();

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
  ]);
  const proposal = {
    give: {
      Money: {
        pursePetname: 'ATOM',
        value: 2n,
      },
    },
    // want: {
    //   // AmountMath.make(nftBrand, nftToBuy)
    //   Items: {
    //     pursePetname: 'MyNFTPurse',
    //     value: nftToBuy,
    //   },
    // },
  };
  const offerConfig = {
    id: Date.now(),
    invitationQuery: {
      description: 'NFTS For sell',
      instance,
    },
    proposalTemplate: proposal,
  };
  await E(walletBridge).addOffer(offerConfig);
};

export default deployContract;
