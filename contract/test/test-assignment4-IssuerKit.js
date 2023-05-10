// @ts-check
/* global harden */
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

const contractPath = `${dirname}/../src/assignment4-IssuerKit.js`;
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
  const availableItemsBeforeSell = await E(creatorFacet).availableNfts();
  // Start supply is 3
  t.deepEqual(availableItemsBeforeSell.value.length, 3);
  const seat = E(zoe).offer(invitation, undefined, undefined, {
    sellItemInstallation: sellItemsInstallation,
    pricePerNFT: AmountMath.make(moolaIssuerKit.brand, 1n),
    // for sell 2 nfts
    nftIds: [1, 2],
  });
  const result = await E(seat).getOfferResult();
  const availableItemsAfterSell = await E(creatorFacet).availableNfts();
  // we put 2 nfts for sale, so we should have 1 left
  t.deepEqual(availableItemsAfterSell.value.length, 1);

  t.deepEqual(result.status, 'success');

  // buy nfts with moola
  const buyInvitation = await E(publicFacet).createBayerInvitation();
  const nftIssuer = await E(publicFacet).getIssuer();
  const nftToBuy = harden([
    {
      id: 1,
      name: 'NFT 1',
      description: 'This is the first NFT',
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
  // check that buyer get his nft
  const paymentP = await E(buySeat).getPayout('Items');
  const tokenPayoutAmount = await E(nftIssuer).getAmountOf(paymentP);
  // check the payment is the expected buy amount
  t.deepEqual(
    tokenPayoutAmount,
    AmountMath.make(nftIssuer.getBrand(), nftToBuy),
  );
  //  Exit before all items sold.
  //  To reproduce, need to buy 1 nft, then exit.
  //  when seller exit, he can't get his money. When only on nft sold. getPayout never resolved
  // await E(result.sellItemsCreatorSeat).tryExit();
  // console.log(await E(result.sellItemsCreatorSeat).hasExited());
  //
  // Q? When we exit before all items sold, where the nfs will be?
  // In this case we can't get reward even if more nfts sold, after we exit?
  // https://github.com/Agoric/agoric-sdk/blob/4e0aece631d8310c7ab8ef3f46fad8981f64d208/packages/zoe/src/contracts/sellItems.js#L35

  // check that seller get his money
  const paymentAmountMoneysellItemsCreatorSeat = await E(
    moolaIssuerKit.issuer,
  ).getAmountOf(await E(result.sellItemsCreatorSeat).getPayout('Money'));
  // Q?
  // check that seller get his money
  // here we get payment from sellItemsCreatorSeat, how to get it from userSeat?
  // In this case who get the money? Are they will be locked in the contract?
  // If so, how to reallocate them to seller?
  t.deepEqual(
    paymentAmountMoneysellItemsCreatorSeat,
    AmountMath.make(moolaIssuerKit.brand, 2n),
  );
});
