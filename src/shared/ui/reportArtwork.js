// One source for matching report illustrations, with a revision to refresh cached artwork.
const ARTWORK_REVISION = '20261007-2';

export const reportArtworkUrl = name => `/images/reports/${name}.png?v=${ARTWORK_REVISION}`;
