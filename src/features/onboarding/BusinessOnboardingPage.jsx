import { useState } from 'react';
import { APP_NAME } from '../../config/appConfig';
import { E_BUSINESS_PLATFORM_NAME } from '../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../app/routing';
import { useWorkspace } from '../workspace/WorkspaceContext';

const STEPS = ['business', 'pages', 'ready'];

export function BusinessOnboardingPage() {
  const { completeOnboarding } = useWorkspace();
  const [step, setStep] = useState('business');
  const [form, setForm] = useState({
    brandName: '',
    slug: '',
    email: '',
    tagline: 'Book services. Buy products.',
    enableBook: true,
    enableBuy: true,
    enableSocial: true
  });

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
        pages: {
          home: true,
          book: form.enableBook,
          buy: form.enableBuy,
          social: form.enableSocial
        },
        homeHeadline: `Welcome to ${form.brandName.trim() || 'your business'}.`,
        homeSubtext: form.tagline.trim(),
        ctaLabel: form.enableBook ? 'Book now' : 'Buy now'
      }
    });
    navigate('/dashboard/overview', { replace: true });
  };

  return (
    <div className="bb-shell native-ui min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg grid gap-6">
        <header className="grid gap-2">
          <div className="bb-brand-mark text-2xl">{APP_NAME}</div>
          <h1 className="bb-page-title text-3xl m-0">Set up your workspace</h1>
          <p className="bb-muted m-0">
            Step {STEPS.indexOf(step) + 1} of {STEPS.length} — then publish your {E_BUSINESS_PLATFORM_NAME}.
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
                placeholder="Flour & Flame"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Public slug</span>
              <input
                className="native-control-input px-4"
                value={form.slug}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: slugFromName(event.target.value)
                  }))
                }
                placeholder="flour-and-flame"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Email</span>
              <input
                className="native-control-input px-4"
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
            <button
              type="button"
              className="bb-primary-btn justify-self-start"
              disabled={!form.brandName.trim()}
              onClick={() => setStep('pages')}
            >
              Continue
            </button>
          </section>
        ) : null}

        {step === 'pages' ? (
          <section className="bb-panel p-5 grid gap-3">
            <h2 className="bb-page-title text-xl m-0">{E_BUSINESS_PLATFORM_NAME}</h2>
            <p className="bb-muted m-0 text-sm">Choose which public pages to turn on first.</p>
            {[
              ['enableBook', 'Book — services and appointments'],
              ['enableBuy', 'Buy — products and orders'],
              ['enableSocial', 'Social — posts and updates']
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, [key]: event.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="bb-ghost-btn" onClick={() => setStep('business')}>
                Back
              </button>
              <button type="button" className="bb-primary-btn" onClick={() => setStep('ready')}>
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 'ready' ? (
          <section className="bb-panel p-5 grid gap-3">
            <h2 className="bb-page-title text-xl m-0">You are ready</h2>
            <p className="bb-muted m-0 text-sm">
              {form.brandName || 'Your business'} will open at{' '}
              <strong>#{publicPagePath(form.slug || 'your-business', 'home')}</strong>.
            </p>
            <ul className="m-0 pl-5 text-sm grid gap-1">
              <li>Home is always on</li>
              {form.enableBook ? <li>Book page enabled</li> : null}
              {form.enableBuy ? <li>Buy page enabled</li> : null}
              {form.enableSocial ? <li>Social page enabled</li> : null}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="bb-ghost-btn" onClick={() => setStep('pages')}>
                Back
              </button>
              <button type="button" className="bb-ink-btn" onClick={finish}>
                Open workspace
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
