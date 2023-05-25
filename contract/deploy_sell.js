/* global harden */
import { E } from '@endo/eventual-send';
import { makeHelpers } from '@agoric/deploy-script-support';
import { AmountMath } from '@agoric/ertp';
import fs from 'fs';

const deployContract = async (homeP, endo) => {
  const { board, scratch, zoe, agoricNames } = E.get(homeP);
  const { install } = await makeHelpers(homeP, endo);
  const [BldIssuer, BldBrand] = await Promise.all([
    E(agoricNames).lookup('issuer', 'IST'),
    E(agoricNames).lookup('brand', 'IST'),
  ]);
  console.log(BldBrand);
  console.log('is issuer-->', await E(BldBrand).isMyIssuer(BldIssuer));
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
  const { installation: sellItemInstallation } = await install(
    'node_modules/@agoric/zoe/src/contracts/sellItems.js',
    'sellItems',
  );

  const invitation = E(creatorFacet).makeSellInvitation();

  const seat = E(zoe).offer(invitation, undefined, undefined, {
    sellItemInstallation,
    pricePerNFT: AmountMath.make(BldBrand, 1000000n),
    // for sell 3 nfts
    nftIds: [1n, 2n, 3n],
  });

  const [instanceId, nftIssuerId, faucetCreatorId] = await Promise.all([
    E(board).getId(instance),
    E(board).getId(nftIssuer),
    E(scratch).set('faucet-creator-id', creatorFacet),
  ]);

  const { status } = await E(seat).getOfferResult();
  console.log('Success!');
  console.log('instanceId', instanceId);
  console.log('nftIssuerId', nftIssuerId);
  console.log('faucetCreatorId', faucetCreatorId);
  console.log(status);
  fs.writeFileSync(
    'deploy_state.json',
    JSON.stringify({ instanceId, nftIssuerId }),
  );
};

export default deployContract;
