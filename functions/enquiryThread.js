/** Shared presentation contract for real Inbox threads and device-only demo enquiries. */
export function buildListingEnquiryThread(enquiry, workspace = {}) {
  const threadId = enquiry.threadId || `enquiry-${enquiry.id}`;
  const action = enquiry.intent === 'viewing' ? 'Viewing request' : 'Enquiry';
  const body = enquiry.message || `${action} about ${enquiry.productName}.`;
  return {
    thread: {
      id: threadId, ownerId: enquiry.ownerId, enquiryId: enquiry.id,
      enquiryStatus: enquiry.status, enquiryType: enquiry.listingType,
      clientName: enquiry.customerName, clientEmail: enquiry.email, clientPhone: enquiry.phone || '',
      subject: `${action} · ${enquiry.productName}`,
      brandName: workspace.brandName || '', workspaceSlug: enquiry.slug,
      logoUrl: workspace.logoUrl || workspace.website?.logoUrl || '',
      unread: true, unreadForClient: false, updatedAt: enquiry.createdAt,
      lastMessageAt: enquiry.createdAt, lastMessageFrom: 'client', lastMessagePreview: body.slice(0, 140),
      presence: { status: 'offline', visible: false, lastSeenAt: enquiry.createdAt }
    },
    message: { id: `enquiry-${enquiry.id}`, type: 'text', from: 'client', body, at: enquiry.createdAt }
  };
}
