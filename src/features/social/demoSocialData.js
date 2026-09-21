export const DEMO_CLIENT_SOCIAL_NOTIFICATIONS = [
  {
    id: 'demo-client-reply',
    type: 'comment_reply',
    actorName: 'Flame & Flour',
    actorPhotoURL: '/example/flour-and-flame/logo-mark.jpg',
    businessSlug: 'flameandflour',
    postId: 'post-5',
    preview: 'Thank you, Aisha — we will share the recipe after class.',
    thumbnailUrl: '/example/flour-and-flame/social/ff-social-scored-loaf.png',
    groupedCount: 1,
    createdAtMs: Date.now() - 1000 * 60 * 18,
    readAtMs: null
  },
  {
    id: 'demo-client-comment-likes',
    type: 'comment_like',
    actorName: 'Mia',
    businessSlug: 'flameandflour',
    postId: 'post-7',
    preview: '“This class looks amazing.”',
    thumbnailUrl: '/example/flour-and-flame/social/ff-social-fresh-pasta.png',
    groupedCount: 4,
    createdAtMs: Date.now() - 1000 * 60 * 60 * 3,
    readAtMs: null
  }
];

export const DEMO_BUSINESS_SOCIAL_NOTIFICATIONS = [
  {
    id: 'demo-business-comments',
    type: 'post_comment',
    actorName: 'Aisha Naidoo',
    actorPhotoURL: '',
    businessSlug: 'flameandflour',
    postId: 'post-5',
    preview: 'That crumb looks incredible. Is this in the Saturday class?',
    thumbnailUrl: '/example/flour-and-flame/social/ff-social-scored-loaf.png',
    groupedCount: 1,
    createdAtMs: Date.now() - 1000 * 60 * 12,
    readAtMs: null
  },
  {
    id: 'demo-business-likes',
    type: 'post_like',
    actorName: 'Aisha',
    businessSlug: 'flameandflour',
    postId: 'post-9',
    preview: 'liked your Croissants post.',
    thumbnailUrl: '/example/flour-and-flame/social/ff-social-croissants.png',
    groupedCount: 25,
    createdAtMs: Date.now() - 1000 * 60 * 48,
    readAtMs: Date.now() - 1000 * 60 * 30
  },
  {
    id: 'demo-business-follow',
    type: 'business_follow',
    actorName: 'Lerato Mokoena',
    businessSlug: 'flameandflour',
    preview: 'started following Flame & Flour.',
    thumbnailUrl: '',
    groupedCount: 1,
    createdAtMs: Date.now() - 1000 * 60 * 60 * 5,
    readAtMs: null
  }
];
