// @ts-check
/* global harden */
import '@agoric/zoe/exported.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { assert, details as X } from '@agoric/assert';

const assertArgs = (offerArgs) => {
  assert(offerArgs, X`offerArgs must be provided`);
  const { tokenName, amount: amountOfToken } = offerArgs;
  assert(tokenName, X`tokenName is required`);
  assert(amountOfToken, X`amount is required`);
};
const start = async (zcf) => {
  const createNewToken = async (seat, offerArgs) => {
    assertArgs(offerArgs);
    const { tokenName, amount: amountOfToken } = offerArgs;
    const newTokenMint = await zcf.makeZCFMint(tokenName);
    const { brand, issuer } = newTokenMint.getIssuerRecord();
    const amount = AmountMath.make(brand, amountOfToken);
    newTokenMint.mintGains({ Token: amount }, seat);
    seat.exit();
    return {
      status: 'success',
      issuer,
    };
  };
  const creatorFacet = Far('creatorFacet', {
    makeInvitation: () =>
      zcf.makeInvitation(createNewToken, 'create new token'),
  });

  return harden({ creatorFacet });
};

harden(start);
export { start };
