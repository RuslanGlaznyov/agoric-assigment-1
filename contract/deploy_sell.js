/* global harden */
import { E } from '@endo/eventual-send';
import { makeHelpers } from '@agoric/deploy-script-support';
import { AmountMath } from '@agoric/ertp';

const deployContract = async (homeP, endo) => {
  const { board, scratch, zoe, agoricNames } = E.get(homeP);
  const { install } = await makeHelpers(homeP, endo);
  const [BldIssuer, BldBrand] = await Promise.all([
    E(agoricNames).lookup('issuer', 'BLD'),
    E(agoricNames).lookup('brand', 'BLD'),
  ]);
  console.log('BldIssuer', BldIssuer);
  const { installation } = await install(
    './src/assignment4-zcfMINT.js',
    'NFT contract',
  );
  const { creatorFacet, instance } = await E(zoe).startInstance(
    installation,
    harden({ Asset: BldIssuer }),
  );
  const nftIssuer = await E(creatorFacet).getIssuer();

  // can't pass object to offer config?
  // const offerConfig = {
  //   id: Date.now(),
  //   invitationQuery: {
  //     description: 'NFTS For sell',
  //     instance,
  //   },
  //   arguments: {
  //     sellItemInstallation: installation,
  //     pricePerNFT: AmountMath.make(BldBrand, 1n),
  //     nftIds: [1n, 2n],
  //   },
  // };
  // await E(walletBridge).addOffer(offerConfig);
  // console.log('check your wallet UI');
  const { installation: sellItemInstallation } = await install(
    'node_modules/@agoric/zoe/src/contracts/sellItems.js',
    'sellItems',
  );

  const invitation = E(creatorFacet).makeSellInvitation();

  const seat = E(zoe).offer(invitation, undefined, undefined, {
    sellItemInstallation,
    pricePerNFT: AmountMath.make(BldBrand, 1n),
    // for sell 2 nfts
    nftIds: [1n, 2n],
  });

  const [instanceId, nftIssuerId, faucetCreatorId] = await Promise.all([
    E(board).getId(instance),
    E(board).getId(nftIssuer),
    E(scratch).set('faucet-creator-id', creatorFacet),
  ]);
  // Q. How can we do the same, if we keep sellItem seat?

  const { status } = await E(seat).getOfferResult();
  console.log('Success!');
  console.log('instanceId', instanceId);
  console.log('nftIssuerId', nftIssuerId);
  console.log('faucetCreatorId', faucetCreatorId);
  console.log(status);
};

export default deployContract;
