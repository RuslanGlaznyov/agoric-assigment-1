// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test } from './prepare-test-env-ava.js';
import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeIssuerKit } from '@agoric/ertp/src/issuerKit.js';
import { AmountMath } from '@agoric/ertp';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractPath = `${dirname}/../src/assignment3-IssuerKit.js`;
const sellItemsContractPath = `node_modules/@agoric/zoe/src/contracts/sellItems.js`;

test.beforeEach(async (t) => {
  const { zoeService } = makeZoeKit(makeFakeVatAdmin().admin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // pack the contract
  const bundle = await bundleSource(contractPath);
  const sellItemsBundle = await bundleSource(sellItemsContractPath);
  // install the contract
  const installation = E(zoe).install(bundle);
  const sellItemsInstallation = E(zoe).install(sellItemsBundle);

  const moolaIssuerKit = makeIssuerKit('Moola');

  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    installation,
    harden({ Asset: moolaIssuerKit.issuer }),
  );
  t.context = {
    zoe,
    publicFacet,
    creatorFacet,
    sellItemsInstallation,
    moolaIssuerKit,
  };
});

test('sell and buy nfts', async (t) => {
  const {
    creatorFacet,
    publicFacet,
    zoe,
    sellItemsInstallation,
    moolaIssuerKit,
  } = t.context;
  const invitation = await E(creatorFacet).makeSellInvitation();
  const seat = E(zoe).offer(invitation, undefined, undefined, {
    sellItemInstallation: sellItemsInstallation,
    pricePerNFT: AmountMath.make(moolaIssuerKit.brand, 1n),
    // for sell 2 nfts
    nftIds: [1, 2],
  });
  const result = await E(seat).getOfferResult();
  // put in sale
  t.deepEqual(result.status, 'success');

  // buy nfts in sale with moola
  const buyInvitation = await E(publicFacet).createBayerInvitation();
  const nftIssuer = await E(publicFacet).getIssuer();
  const nftToBuy = harden([
    {
      id: 1,
      name: 'NFT 1',
      description: 'This is the first NFT',
    },
    {
      id: 2,
      name: 'NFT 2',
      description: 'This is the second NFT',
    },
  ]);
  const proposal = harden({
    give: {
      // Give to 2 moola for 2 nft
      // 2nft * 1moola/nft = 2moola
      Money: AmountMath.make(moolaIssuerKit.brand, 2n),
    },
    want: {
      Items: AmountMath.make(nftIssuer.getBrand(), nftToBuy),
    },
  });

  const paymentKeywordRecord = harden({
    Money: moolaIssuerKit.mint.mintPayment(
      AmountMath.make(moolaIssuerKit.brand, 2n),
    ),
  });
  const buySeat = E(zoe).offer(buyInvitation, proposal, paymentKeywordRecord);
  const buyResult = await E(buySeat).getOfferResult();
  t.deepEqual(
    buyResult,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  const paymentP = await E(buySeat).getPayout('Items');
  const tokenPayoutAmount = await E(nftIssuer).getAmountOf(paymentP);
  // check the payment is the expected buy amount
  t.deepEqual(
    tokenPayoutAmount,
    AmountMath.make(nftIssuer.getBrand(), nftToBuy),
  );
});
