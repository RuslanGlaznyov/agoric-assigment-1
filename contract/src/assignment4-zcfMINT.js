// @ts-check
/* global harden */
import { AmountMath, AssetKind } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { offerTo } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { Far } from '@endo/marshal';

// Define NFts supply
const DEFINED_NFTS = harden([
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

/**
 *
 * @param {ZCF} zcf
 * @returns {Promise<{creatorFacet: object, publicFacet: object}>}
 */
const start = async (zcf) => {
  const {
    issuers: { Asset: sellIssuer },
    tokenKeyword = 'NFT',
  } = zcf.getTerms();
  if (typeof tokenKeyword !== 'string') {
    throw new Error('tokenKeyword must be a string');
  }

  const nftMint = await zcf.makeZCFMint(tokenKeyword, AssetKind.SET);
  const { issuer: nftIssuer, brand: nftBrand } = nftMint.getIssuerRecord();

  const { zcfSeat: nftSeat } = zcf.makeEmptySeatKit();

  const amountToMint = AmountMath.make(nftBrand, DEFINED_NFTS);
  nftMint.mintGains({ [tokenKeyword]: amountToMint }, nftSeat);

  const zoe = zcf.getZoeService();

  let sellItemPublicFacet;
  const createBuyerInvitation = () => {
    return E(sellItemPublicFacet).makeBuyerInvitation();
  };

  const sell = async (userSeat, offerArgs) => {
    const { nftIds, pricePerNFT, sellItemInstallation } = offerArgs;
    console.log({
      balance: nftSeat.getCurrentAllocation(),
      amountToMint,
    });
    const nftsForSell = harden(
      DEFINED_NFTS.filter((nft) => nftIds.includes(nft.id)),
    );
    const nftForSellAmount = AmountMath.make(nftBrand, nftsForSell);
    console.log({ nftsForSell });

    const issuerKeywordRecord = harden({
      Items: nftIssuer,
      Money: sellIssuer,
    });

    const sellItemsTerms = harden({
      pricePerItem: pricePerNFT,
    });

    const { creatorInvitation, publicFacet } = await E(zoe).startInstance(
      sellItemInstallation,
      issuerKeywordRecord,
      sellItemsTerms,
    );

    sellItemPublicFacet = publicFacet;

    const proposal = harden({
      give: { Items: nftForSellAmount },
    });

    const keywordMapping = harden({
      [tokenKeyword]: 'Items',
    });

    const { userSeatPromise: sellItemsCreatorSeat, deposited } = await offerTo(
      zcf,
      creatorInvitation,
      keywordMapping,
      proposal,
      nftSeat,
      userSeat,
    );

    deposited
      .then(() => userSeat.exit())
      .catch((err) => console.log('ERROR DEPOSIT', err));

    return {
      status: 'success',
      deposited,
      sellItemsCreatorSeat,
    };
  };

  const creatorFacet = Far('creatorFacet', {
    getIssuer: () => nftIssuer,
    makeSellInvitation: () => zcf.makeInvitation(sell, 'sell nft'),
    availableNfts: () => nftSeat.getAmountAllocated(tokenKeyword, nftBrand),
  });

  const publicFacet = Far('publicFacet', {
    getIssuer: () => nftIssuer,
    getBrand: () => nftBrand,
    createBuyerInvitation,
  });
  return harden({ creatorFacet, publicFacet });
};

harden(start);
export { start };
