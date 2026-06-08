import { Banknote, CreditCard, Landmark, ShieldCheck, Zap } from 'lucide-react';

export const gatewayCards = [
  {
    id: 'stripe',
    name: 'Stripe',
    region: 'International',
    icon: CreditCard,
    logo: '/payment-logos/stripe.png',
    note: 'Global cards, Apple Pay, Google Pay, and checkout sessions.',
    requiredFields: ['secretKey', 'webhookSecret'],
    fields: [
      { key: 'publishableKey', label: 'Publishable key', type: 'text' },
      { key: 'secretKey', label: 'Secret key', type: 'password' },
      { key: 'webhookSecret', label: 'Webhook signing secret', type: 'password' }
    ]
  },
  {
    id: 'payfast',
    name: 'Payfast',
    region: 'South Africa',
    icon: Zap,
    logo: '/payment-logos/payfast.png',
    note: 'Fast local checkout for cards, EFT, and popular South African payment flows.',
    requiredFields: ['merchantId', 'merchantKey'],
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text' },
      { key: 'merchantKey', label: 'Merchant key', type: 'password' },
      { key: 'passphrase', label: 'Passphrase', type: 'password' }
    ]
  },
  {
    id: 'yoco',
    name: 'Yoco',
    region: 'South Africa',
    icon: CreditCard,
    logo: '/payment-logos/yoco.webp',
    note: 'Local card checkout with clean hosted payment links.',
    requiredFields: ['secretKey', 'webhookSecret'],
    fields: [
      { key: 'publicKey', label: 'Public key', type: 'text' },
      { key: 'secretKey', label: 'Secret key', type: 'password' },
      { key: 'webhookSecret', label: 'Webhook secret', type: 'password' }
    ]
  },
  {
    id: 'paystack',
    name: 'Paystack',
    region: 'Africa',
    icon: ShieldCheck,
    logo: '/payment-logos/paystack.png',
    note: 'Reliable card payments with clean initialization and webhooks.',
    requiredFields: ['secretKey'],
    fields: [
      { key: 'publicKey', label: 'Public key', type: 'text' },
      { key: 'secretKey', label: 'Secret key', type: 'password' }
    ]
  },
  {
    id: 'manual_eft',
    name: 'Manual EFT',
    region: 'South Africa',
    icon: Landmark,
    note: 'Show your bank details to clients and ask them to use their booking ID as the payment reference.',
    requiredFields: ['accountHolder', 'bankName', 'accountNumber'],
    fields: [
      { key: 'accountHolder', label: 'Account holder', type: 'text' },
      { key: 'bankName', label: 'Bank name', type: 'text' },
      { key: 'accountNumber', label: 'Account number', type: 'text' },
      { key: 'branchCode', label: 'Branch code', type: 'text' },
      { key: 'accountType', label: 'Account type', type: 'text' },
      { key: 'instructions', label: 'Client instructions', type: 'textarea' }
    ]
  },
  {
    id: 'cash',
    name: 'Cash',
    region: 'Manual',
    icon: Banknote,
    note: 'Let clients choose cash and keep the booking unpaid until your team marks it paid.',
    requiredFields: [],
    fields: [
      { key: 'instructions', label: 'Client instructions', type: 'textarea' }
    ]
  }
];

export const gatewayById = gatewayCards.reduce((acc, gateway) => {
  acc[gateway.id] = gateway;
  return acc;
}, {});

export const cardGatewayIds = new Set(['stripe', 'payfast', 'yoco', 'paystack']);

export const getGatewayMissingRequiredFields = ({ gateway, draft = {}, publicConfig = {} }) => {
  const credentials = draft.credentials || {};
  const summary = publicConfig.credentialSummary || {};
  return (gateway?.requiredFields || []).filter((fieldKey) => {
    const draftValue = String(credentials[fieldKey] || '').trim();
    const savedValue = String(summary[fieldKey] || '').trim();
    return !draftValue && !savedValue;
  });
};

export const emptyDrafts = gatewayCards.reduce((acc, gateway) => {
  acc[gateway.id] = {
    enabled: false,
    mode: 'test',
    credentials: gateway.fields.reduce((fields, field) => {
      fields[field.key] = '';
      return fields;
    }, {})
  };
  return acc;
}, {});

export const GatewayLogo = ({ gateway, className = '' }) => {
  const Icon = gateway?.icon || CreditCard;
  if (gateway?.logo) {
    return <img src={gateway.logo} alt="" className={`finance-gateway-logo ${className}`} loading="lazy" />;
  }
  return <Icon size={18} />;
};
