// // @ts-check
// /* global harden */
// import { AssetKind, AmountMath } from '@agoric/ertp';
// import { E } from '@endo/eventual-send';
// import { Far } from '@endo/marshal';
//
// const DEFINED_NFTS = harden([
//   {
//     id: 1,
//     name: 'NFT 1',
//     description: 'This is the first NFT',
//   },
//   {
//     id: 2,
//     name: 'NFT 2',
//     description: 'This is the second NFT',
//   },
//   {
//     id: 3,
//     name: 'NFT 3',
//     description: 'This is the third NFT',
//   },
// ]);
// const start = async (zcf) => {
//   const {
//     issuers: { Asset: sellIssuer },
//     tokenKeyword = 'NFT',
//   } = zcf.getTerms();
//   const zoeService = zcf.getZoeService();
//   // todo check that sellIssuer corresponds to the BrandIssuer
//   // why COPY_SET does not work?
//   const nftMint = await zcf.makeZCFMint(tokenKeyword, AssetKind.SET);
//   const {
//     issuer: NFTissuer,
//     brand: NFTbrand,
//   } = nftMint.getIssuerRecord();
//   const amountToMint = AmountMath.make(NFTbrand, DEFINED_NFTS);
//   const { zcfSeat } = zcf.makeEmptySeatKit();
//   nftMint.mintGains({ [tokenKeyword]: amountToMint }, zcfSeat);
//   let sellItemPublicFacet;
//   const createBayerInvitation = () => {
//     return E(sellItemPublicFacet).makeBuyerInvitation();
//   };
//   const sell = async (userSeat, offerArgs) => {
//     const { nftIds, pricePerNFT, sellItemInstallation } = offerArgs;
//     const nftsForSell = harden(
//       DEFINED_NFTS.filter((nft) => nftIds.includes(nft.id)),
//     );
//     const nftForSellAmount = AmountMath.make(NFTbrand, nftsForSell);
//     const issuerKeywordRecord = harden({
//       Items: NFTissuer,
//       Money: sellIssuer,
//     });
//
//     const sellItemsTerms = harden({
//       pricePerItem: pricePerNFT,
//     });
//
//     const { creatorInvitation, publicFacet } = await E(
//       zoeService,
//     ).startInstance(sellItemInstallation, issuerKeywordRecord, sellItemsTerms);
//     sellItemPublicFacet = publicFacet;
//     // const tokenPayment = mint.mintPayment(harden(nftForSellAmount));
//     const tokenPayment = nftForSellAmount;
//     const paymentKeywordRecord = harden({ Items: tokenPayment });
//
//     const proposal = harden({
//       give: { Items: nftForSellAmount },
//     });
//     const sellItemsCreatorSeat = E(zoeService).offer(
//       creatorInvitation,
//       proposal,
//       // paymentKeywordRecord,
//     );
//     return {
//       status: 'success',
//       // sellItemsCreatorSeat,
//     };
//   };
//
//   const creatorFacet = Far('creatorFacet', {
//     // sell,
//     getIssuer: () => NFTissuer,
//     nftBalance: () => zcfSeat.getAmountAllocated(tokenKeyword, NFTbrand),
//     makeSellInvitation: () => zcf.makeInvitation(sell, 'sell nft'),
//   });
//
//   const publicFacet = Far('publicFacet', {
//     getIssuer: () => NFTissuer,
//     createBayerInvitation,
//   });
//   return harden({ creatorFacet, publicFacet });
// };
//
// harden(start);
// export { start };
