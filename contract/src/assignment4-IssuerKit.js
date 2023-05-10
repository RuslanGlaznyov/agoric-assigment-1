// @ts-check
/* global harden */
import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

// Define NFts supply
const DEFINED_NFTS = harden([
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
  {
    id: 3,
    name: 'NFT 3',
    description: 'This is the third NFT',
  },
]);
const start = async (zcf) => {
  const {
    issuers: { Asset: sellIssuer },
    tokenKeyword = 'NFT',
  } = zcf.getTerms();
  const zoeService = zcf.getZoeService();
  // todo check that sellIssuer corresponds to the BrandIssuer
  // why COPY_SET does not work?
  const {
    issuer: NFTissuer,
    brand: NFTbrand,
    mint,
  } = await makeIssuerKit(tokenKeyword, AssetKind.SET);
  const amountToMint = AmountMath.make(NFTbrand, DEFINED_NFTS);
  // mint NFTs supply and deposit to the purse
  const mintPayment = mint.mintPayment(harden(amountToMint));
  const nftPurse = NFTissuer.makeEmptyPurse();
  nftPurse.deposit(mintPayment);

  let sellItemPublicFacet;
  const createBayerInvitation = () => {
    return E(sellItemPublicFacet).makeBuyerInvitation();
  };
  const sell = async (userSeat, offerArgs) => {
    const { nftIds, pricePerNFT, sellItemInstallation } = offerArgs;
    const nftsForSell = harden(
      DEFINED_NFTS.filter((nft) => nftIds.includes(nft.id)),
    );
    const nftForSellAmount = AmountMath.make(NFTbrand, nftsForSell);
    const issuerKeywordRecord = harden({
      Items: NFTissuer,
      Money: sellIssuer,
    });

    const sellItemsTerms = harden({
      pricePerItem: pricePerNFT,
    });

    const { creatorInvitation, publicFacet } = await E(
      zoeService,
    ).startInstance(sellItemInstallation, issuerKeywordRecord, sellItemsTerms);
    sellItemPublicFacet = publicFacet;
    const tokenPayment = nftPurse.withdraw(nftForSellAmount);
    const paymentKeywordRecord = harden({ Items: tokenPayment });
    const proposal = harden({
      give: { Items: nftForSellAmount },
    });
    const sellItemsCreatorSeat = await E(zoeService).offer(
      creatorInvitation,
      proposal,
      paymentKeywordRecord,
    );
    return {
      status: 'success',
      sellItemsCreatorSeat,
    };
  };

  const creatorFacet = Far('creatorFacet', {
    getIssuer: () => NFTissuer,
    makeSellInvitation: () => zcf.makeInvitation(sell, 'sell nft'),
    availableNfts: () => nftPurse.getCurrentAmount(),
  });

  const publicFacet = Far('publicFacet', {
    getIssuer: () => NFTissuer,
    createBayerInvitation,
  });
  return harden({ creatorFacet, publicFacet });
};

harden(start);
export { start };
