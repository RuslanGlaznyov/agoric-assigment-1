// @ts-check
/* global harden */
import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { assert, details as X } from '@agoric/assert';

const assertArgs = (offerArgs) => {
  assert(offerArgs, X`offerArgs must be provided`);
  const { transferAmount } = offerArgs;
  assert(transferAmount, X`transferAmount is required`);
  assert(
    typeof transferAmount === 'bigint',
    X`The property 'transferAmount' must be of type 'bigint', found: ${typeof transferAmount}`,
  );
};
const start = async (zcf, _) => {
  const VALUE_TO_MINT = 100n;
  const TOKEN_KEYWORD = 'Token';
  const { zcfSeat: zoeSamplesSeat } = zcf.makeEmptySeatKit();
  const sampleMint = await zcf.makeZCFMint(TOKEN_KEYWORD);
  const { issuer: sampleIssuer, brand: sampleBrand } =
    sampleMint.getIssuerRecord();
  const amountToMint = AmountMath.make(sampleBrand, VALUE_TO_MINT);
  sampleMint.mintGains({ [TOKEN_KEYWORD]: amountToMint }, zoeSamplesSeat);
  const transferOfferHandler = async (userSeat, offerArgs) => {
    assertArgs(offerArgs);
    const { transferAmount } = offerArgs;
    const amountToTransfer = AmountMath.make(sampleBrand, transferAmount);
    userSeat.incrementBy(
      zoeSamplesSeat.decrementBy(harden({ [TOKEN_KEYWORD]: amountToTransfer })),
    );
    zcf.reallocate(zoeSamplesSeat, userSeat);
    userSeat.exit();
    return harden({
      message: 'Success',
      transferred: transferAmount,
      brand: sampleBrand,
      issuer: sampleIssuer,
    });
  };
  const publicFacet = Far('Sample Public Facet', {
    makeTransferInvitation: () =>
      zcf.makeInvitation(transferOfferHandler, 'transfer Token'),
    getIssuer: () => sampleIssuer,
    getTotalBalance: () => zoeSamplesSeat.getCurrentAllocation(),
    getTokenBalance: () =>
      zoeSamplesSeat.getAmountAllocated(TOKEN_KEYWORD, sampleBrand),
  });

  return harden({ publicFacet });
};

harden(start);
export { start };
