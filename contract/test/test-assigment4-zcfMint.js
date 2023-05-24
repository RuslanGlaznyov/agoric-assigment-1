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
import { defaultAcceptanceMsg } from '@agoric/zoe/src/contractSupport/index.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const zfMintPath = `${dirname}/../src/assignment4-zcfMINT.js`;
const sellItemsContractPath = `node_modules/@agoric/zoe/src/contracts/sellItems.js`;
test.beforeEach(async (t) => {
  const { zoeService } = makeZoeKit(makeFakeVatAdmin().admin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // pack the contract
  const bundle = await bundleSource(zfMintPath);
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
test('sell-and-buy-test', async (t) => {
  const { zoe, sellItemsInstallation, moolaIssuerKit } = t.context;

  const bundle = await bundleSource(zfMintPath);
  const installation = E(zoe).install(bundle);

  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    installation,
    harden({ Asset: moolaIssuerKit.issuer }),
  );

  const availableNftsBeforeSell = await E(creatorFacet).availableNfts();
  t.deepEqual(availableNftsBeforeSell.value.length, 3);

  const invitation = E(creatorFacet).makeSellInvitation();

  const seat = E(zoe).offer(invitation, undefined, undefined, {
    sellItemInstallation: sellItemsInstallation,
    pricePerNFT: AmountMath.make(moolaIssuerKit.brand, 1n),
    // for sell 2 nfts
    nftIds: [1n, 2n, 3n],
  });

  const { status, sellItemsCreatorSeat } = await E(seat).getOfferResult();

  const [sellItemsOfferResult, availableNftsAfterSell] = await Promise.all([
    E(sellItemsCreatorSeat).getOfferResult(),
    E(creatorFacet).availableNfts(),
  ]);

  t.deepEqual(sellItemsOfferResult, defaultAcceptanceMsg);
  t.deepEqual(status, 'success');
  t.deepEqual(availableNftsAfterSell.value.length, 0);

  const buyInvitation = await E(publicFacet).createBuyerInvitation();
  const nftBrand = await E(publicFacet).getBrand();
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
  const proposal = harden({
    give: {
      // Give to 2 moola for 2 nft
      // 2nft * 1moola/nft = 2moola
      Money: AmountMath.make(moolaIssuerKit.brand, 3n),
    },
    want: {
      Items: AmountMath.make(nftBrand, nftToBuy),
    },
  });

  const paymentKeywordRecord = harden({
    Money: moolaIssuerKit.mint.mintPayment(
      AmountMath.make(moolaIssuerKit.brand, 3n),
    ),
  });
  const buySeat = E(zoe).offer(buyInvitation, proposal, paymentKeywordRecord);
  const buyResult = await E(buySeat).getOfferResult();
  console.log(buyResult);
  t.deepEqual(buyResult, defaultAcceptanceMsg);

  const sellerPayout = await E(seat).getPayout('Money');

  const paymentAmountMoneysellItemsCreatorSeat = await E(
    moolaIssuerKit.issuer,
  ).getAmountOf(sellerPayout);

  t.deepEqual(
    paymentAmountMoneysellItemsCreatorSeat,
    AmountMath.make(moolaIssuerKit.brand, 3n),
  );
});
