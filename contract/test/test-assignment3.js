/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test } from './prepare-test-env-ava.js';
import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { AmountMath } from '@agoric/ertp';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractPath = `${dirname}/../src/assignment3.js`;
test.beforeEach(async (t) => {
  const { zoeService } = makeZoeKit(makeFakeVatAdmin().admin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // pack the contract
  const bundle = await bundleSource(contractPath);
  // install the contract
  const installation = E(zoe).install(bundle);

  const { publicFacet } = await E(zoe).startInstance(installation);
  t.context = {
    zoe,
    publicFacet,
  };
});
test('make transfer', async (t) => {
  const { zoe, publicFacet } = t.context;
  const transferAmount = 10n;
  const invitation = await E(publicFacet).makeTransferInvitation();
  const seat = E(zoe).offer(invitation, undefined, undefined, {
    transferAmount,
  });
  const offerResult = await E(seat).getOfferResult();
  const tokenBalance = await E(publicFacet).getTokenBalance();
  const paymentP = await E(seat).getPayout('Token');
  const tokenPayoutAmount = await E(offerResult.issuer).getAmountOf(paymentP);
  // payment successfully transferred
  t.deepEqual(tokenPayoutAmount, AmountMath.make(offerResult.brand, 10n));
  // token balance updated
  t.deepEqual(tokenBalance, AmountMath.make(offerResult.brand, 90n));
});

test('transfer more than allocation should throw error', async (t) => {
  const { zoe, publicFacet } = t.context;
  const transferAmount = 200n;
  const invitation = await E(publicFacet).makeTransferInvitation();
  const seat = await E(zoe).offer(invitation, undefined, undefined, {
    transferAmount,
  });
  await t.throwsAsync(() => E(seat).getOfferResult());
});

test('make transfer with no args should throw an error', async (t) => {
  const { zoe, publicFacet } = t.context;
  // const transferAmount = 200n;
  const invitation = await E(publicFacet).makeTransferInvitation();
  const seat = await E(zoe).offer(invitation);
  await t.throwsAsync(() => E(seat).getOfferResult(), {
    message: 'offerArgs must be provided',
  });
});

test('make transfer with wrong type of arg should throw an error', async (t) => {
  const { zoe, publicFacet } = t.context;
  const transferAmount = 200;
  const invitation = await E(publicFacet).makeTransferInvitation();
  const seat = await E(zoe).offer(invitation, undefined, undefined, {
    transferAmount,
  });
  await t.throwsAsync(() => E(seat).getOfferResult(), {
    message:
      "The property 'transferAmount' must be of type 'bigint', found: \"number\"",
  });
});
