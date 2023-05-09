// @ts-check

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

const contractPath = `${dirname}/../src/assignment2.js`;
test.beforeEach(async (t) => {
  const { zoeService } = makeZoeKit(makeFakeVatAdmin().admin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // pack the contract
  const bundle = await bundleSource(contractPath);
  // install the contract
  const installation = E(zoe).install(bundle);

  const { creatorFacet } = await E(zoe).startInstance(installation);
  t.context = {
    zoe,
    creatorFacet,
  };
});
/* VALIDATION TESTS STARTS */
test('should throw an error if no arguments are provided', async (t) => {
  const { zoe, creatorFacet } = t.context;
  const invitation = E(creatorFacet).makeInvitation();
  const seat = E(zoe).offer(invitation);
  await t.throwsAsync(() => E(seat).getOfferResult(), {
    message: 'offerArgs must be provided',
  });
});
test('should throw an error if `tokenName` is not provided', async (t) => {
  const { zoe, creatorFacet } = t.context;
  const invitation = E(creatorFacet).makeInvitation();
  const seat = E(zoe).offer(invitation, undefined, undefined, {
    amount: 1000n,
  });
  await t.throwsAsync(() => E(seat).getOfferResult(), {
    message: 'tokenName is required',
  });
});
test('should throw an error if `amount` is not provided', async (t) => {
  const { zoe, creatorFacet } = t.context;
  const invitation = E(creatorFacet).makeInvitation();
  const seat = E(zoe).offer(invitation, undefined, undefined, {
    tokenName: 'Token',
  });
  await t.throwsAsync(() => E(seat).getOfferResult(), {
    message: 'amount is required',
  });
});
/* VALIDATION TESTS ENDS  */
test('create a token', async (t) => {
  const { zoe, creatorFacet } = t.context;
  const TOKEN_NAME = 'Token';
  const TOKEN_AMOUNT = 4000n;

  const invitation2 = E(creatorFacet).makeInvitation();
  const seatToken2 = E(zoe).offer(invitation2, undefined, undefined, {
    tokenName: TOKEN_NAME,
    amount: TOKEN_AMOUNT,
  });

  const { issuer: tokenIssuer } = await E(seatToken2).getOfferResult();

  const paymentP = E(seatToken2).getPayout('Token');
  const tokenBrand = await E(tokenIssuer).getBrand();
  const tokens400 = AmountMath.make(tokenBrand, TOKEN_AMOUNT);
  const tokenPayoutAmount = await E(tokenIssuer).getAmountOf(paymentP);
  // check that the token amount is correct
  t.deepEqual(tokenPayoutAmount, tokens400);
  // check token name
  t.deepEqual(tokenBrand.getAllegedName(), TOKEN_NAME);
});
test('compare two tokens', async (t) => {
  const moonaAmount = 1000n;
  const quatloosAmount = 4000n;
  const { zoe, creatorFacet } = t.context;
  const quatloosInvitation = E(creatorFacet).makeInvitation();
  const seatMoona = E(zoe).offer(quatloosInvitation, undefined, undefined, {
    tokenName: 'Moona',
    amount: moonaAmount,
  });
  const { issuer: moonaIssuer } = await E(seatMoona).getOfferResult();

  const invitationQuatloos = E(creatorFacet).makeInvitation();
  const seatQuatloos = E(zoe).offer(invitationQuatloos, undefined, undefined, {
    tokenName: 'Quatloos',
    amount: quatloosAmount,
  });
  const { issuer: quatloosIssuer } = await E(seatQuatloos).getOfferResult();

  const paymentMoonaP = E(seatMoona).getPayout('Token');
  const paymentQuatloosP = E(seatQuatloos).getPayout('Token');
  const quatoolsBrand = await E(quatloosIssuer).getBrand();
  const moonaBrand = await E(moonaIssuer).getBrand();
  const tokensMoona = AmountMath.make(moonaBrand, moonaAmount);
  const quatloosToken = AmountMath.make(quatoolsBrand, quatloosAmount);
  // should throw an error, because the tokens are different
  t.throwsAsync(() => E(quatloosIssuer).getAmountOf(paymentMoonaP));
  t.throwsAsync(() => E(moonaIssuer).getAmountOf(paymentQuatloosP));

  const quatloosPayoutAmount = await E(quatloosIssuer).getAmountOf(
    paymentQuatloosP,
  );
  // TODO: is it possible to get supply from the issuer?
  const moonaPayoutAmount = await moonaIssuer.getAmountOf(paymentMoonaP);
  // compare two issuers
  t.notDeepEqual(quatloosIssuer, moonaIssuer);
  // compare two amounts
  t.deepEqual(quatloosPayoutAmount, quatloosToken);
  t.deepEqual(moonaPayoutAmount, tokensMoona);
});
