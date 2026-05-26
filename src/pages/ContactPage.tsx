import React, { useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { addContactEnquiry } from '../lib/memberService';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.message.trim()) e.message = 'Message is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await addContactEnquiry(form);
      setSuccess(true);
      setForm({ name: '', email: '', message: '' });
    } catch {
      setErrors({ submit: 'Failed to send message. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <h1 className="font-display text-headline-lg uppercase mb-4">CONTACT US</h1>
        <div className="w-24 h-1 bg-primary-container mb-16" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-section-gap">
          <div className="space-y-8">
            {[
              { icon: 'location_on', title: 'ADDRESS', body: '114C Negombo Rd, Wattala 32350, Sri Lanka' },
              { icon: 'call', title: 'PHONE', body: '070 322 2211' },
              { icon: 'schedule', title: 'OPENING HOURS', body: 'Mon–Fri: 5AM–10PM\nSat: 7AM–11AM\nSun: 5AM–10PM' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary-container text-3xl">{item.icon}</span>
                <div>
                  <h4 className="font-display text-headline-md uppercase mb-1">{item.title}</h4>
                  <p className="text-body-md text-on-surface-variant font-body whitespace-pre-line">{item.body}</p>
                </div>
              </div>
            ))}

            <a
              href="https://maps.google.com/maps?q=114C+Negombo+Road,+Wattala,+Sri+Lanka"
              target="_blank"
              rel="noopener noreferrer"
              className="h-[300px] border-2 border-primary-container overflow-hidden mt-8 flex flex-col items-center justify-center gap-4 bg-surface-container group hover:border-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-primary-container text-5xl group-hover:scale-110 transition-transform">location_on</span>
              <p className="font-display text-headline-md uppercase">Open in Google Maps</p>
              <span className="font-label-sm text-label-sm text-primary-container uppercase tracking-widest border border-primary-container px-4 py-2">114C Negombo Rd, Wattala →</span>
            </a>
          </div>

          <div>
            <h2 className="font-display text-headline-md uppercase mb-8">SEND A MESSAGE</h2>
            {success ? (
              <div className="border border-green-500 text-green-400 p-6 font-body text-body-md">
                Your message has been sent. We will get back to you shortly.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} error={errors.name} placeholder="Enter your full name" />
                <Input label="Email Address" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} error={errors.email} placeholder="Enter your email" />
                <Textarea label="Message" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} error={errors.message} placeholder="How can we help you?" rows={6} />
                {errors.submit && <p className="text-error text-body-md font-body">{errors.submit}</p>}
                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">SEND MESSAGE</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
