import { Button } from '../../shared/ui/Button';
import { useState } from 'react';
import { E_BUSINESS_PLATFORM_NAME } from '../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../app/routing';
import { BrandMark } from '../../shared/ui/BrandMark';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { BusinessPresenceFields } from '../shared/BusinessPresenceFields';
import { isPresenceOnlyBusiness } from '../../../functions/businessCapabilities.js';

const STEPS = ['business', 'pages', 'ready'];

export function BusinessOnboardingPage() {
  const { completeOnboarding } = useWorkspace();
  const [step, setStep] = useState('business');
  const [form, setForm] = useState({
    brandName: '',
    slug: '',
    email: '',
    categoryId: '',
    profileCategory: '',
    profileMode: 'commerce',
    tagline: 'Book services. Buy products.',
    enableBook: true,
    enableBuy: true
  });
  const presenceOnly = isPresenceOnlyBusiness({ website: form });

  const slugFromName = (name) =>
    String(name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);

  const finish = () => {
    const slug = form.slug || slugFromName(form.brandName) || 'your-business';
    completeOnboarding({
      brandName: form.brandName.trim() || 'Your Business',
      slug,
      email: form.email.trim(),
      tagline: form.tagline.trim(),
      website: {
        categoryId: form.categoryId,
        profileCategory: form.profileCategory,
        profileMode: presenceOnly ? 'presence' : 'commerce',
        pages: {
          home: true,
          book: !presenceOnly && form.enableBook,
          buy: !presenceOnly && form.enableBuy
        },
        homeHeadline: `Welcome to ${form.brandName.trim() || 'your business'}.`,
        homeSubtext: form.tagline.trim(),
        ctaLabel: presenceOnly ? 'Contact us' : form.enableBook ? 'Book now' : 'Buy now'
      }
    });
    navigate('/dashboard/overview', { replace: true });
  };

  return (
    <div className="bb-shell native-ui bb-onboarding">
      <div className="bb-onboarding-content">
        <header className="grid gap-2">
          <BrandMark size="lg" className="bb-onboarding-brand" />
          <h1 className="bb-page-title text-3xl m-0">Set up your free business profile</h1>
          <p className="bb-muted m-0">
            Step {STEPS.indexOf(step) + 1} of {STEPS.length} — create your profile in {E_BUSINESS_PLATFORM_NAME}, then publish to Places when you are ready. No subscription or card required.
          </p>
        </header>

        {step === 'business' ? (
          <section className="bb-panel p-5 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Business name</span>
              <input
                className="native-control-input px-4"
                value={form.brandName}
                onChange={(event) => {
                  const brandName = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    brandName,
                    slug: prev.slug || slugFromName(brandName)
                  }));
                }}
                placeholder="Your business name"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Profile address</span>
              <input
                className="native-control-input px-4"
                value={form.slug}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: slugFromName(event.target.value)
                  }))
                }
                placeholder="your-business"
              />
            </label>
            <p className="bb-muted m-0 text-xs">Your address: <span className="break-all">{window.location.origin}/#{publicPagePath(form.slug || slugFromName(form.brandName) || 'your-business', 'home')}</span>. Publish from your workspace when you are ready.</p>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Email</span>
              <input
                className="native-control-input px-4"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="hello@yourbusiness.com"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Tagline</span>
              <input
                className="native-control-input px-4"
                value={form.tagline}
                onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
              />
            </label>
            <Button action="continue" variant="primary"
              type="button"
              className="bb-primary-btn justify-self-start"
              disabled={!form.brandName.trim()}
              onClick={() => setStep('pages')}
            >
              Continue
            </Button>
          </section>
        ) : null}

        {step === 'pages' ? (
          <section className="bb-panel p-5 grid gap-3">
            <h2 className="bb-page-title text-xl m-0">{E_BUSINESS_PLATFORM_NAME}</h2>
            <p className="bb-muted m-0 text-sm">Choose what customers can do on your profile. You can change these sections later.</p>
            <BusinessPresenceFields website={form} onChange={patch => setForm(previous => ({ ...previous, ...patch }))} />
            {[
              ['enableBook', 'Book — services and appointments'],
              ['enableBuy', 'Buy — products and orders']
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!presenceOnly && Boolean(form[key])}
                  disabled={presenceOnly}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, [key]: event.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button action="back" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => setStep('business')}>
                Back
              </Button>
              <Button action="continue" variant="primary" type="button" className="bb-primary-btn" onClick={() => setStep('ready')}>
                Continue
              </Button>
            </div>
          </section>
        ) : null}

        {step === 'ready' ? (
          <section className="bb-panel p-5 grid gap-3">
            <h2 className="bb-page-title text-xl m-0">You are ready</h2>
            <p className="bb-muted m-0 text-sm">
              Your free profile for {form.brandName || 'your business'} will open at{' '}
              <strong>#{publicPagePath(form.slug || 'your-business', 'home')}</strong>.
            </p>
            <ul className="m-0 pl-5 text-sm grid gap-1">
              <li>Business profile always included</li>
              {presenceOnly ? <li>Presence-only card with contact details, location and photos</li> : null}
              {!presenceOnly && form.enableBook ? <li>Book section enabled</li> : null}
              {!presenceOnly && form.enableBuy ? <li>Buy section enabled</li> : null}
              <li>Add a banner, profile photo and business details in E-Business, then publish to appear on Places</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button action="back" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => setStep('pages')}>
                Back
              </Button>
              <Button action="open" variant="primary" type="button" className="bb-ink-btn" onClick={finish}>
                Open workspace
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
